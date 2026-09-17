import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_BACKEND_URL ? `${import.meta.env.VITE_BACKEND_URL}/api/v1` : '/api/v1',
    withCredentials: true,
});

// ── 401 Auto-refresh interceptor ─────────────────────────────────────────────
// The access token has a 15-minute TTL. Without this interceptor, any API call
// made after it expires returns a silent 401 and the user gets no feedback.
// This interceptor catches 401 responses, calls /auth/refresh once (which
// uses the httpOnly refreshToken cookie to issue a new access token), then
// retries the original request transparently.
// If the refresh itself fails (cookie expired / logged out elsewhere),
// it clears local state and redirects to /login.
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error) => {
    failedQueue.forEach((prom) => {
        if (error) {
            prom.reject(error);
        } else {
            prom.resolve();
        }
    });
    failedQueue = [];
};

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // Only intercept 401s that haven't already been retried
        if (error.response?.status === 401 && !originalRequest._retry) {
            // If a refresh is already in flight, queue this request to retry after it resolves
            if (isRefreshing) {
                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve, reject });
                })
                    .then(() => api(originalRequest))
                    .catch((err) => Promise.reject(err));
            }

            originalRequest._retry = true;
            isRefreshing = true;

            try {
                // Attempt to get a new access token using the httpOnly refresh cookie
                await api.post('/auth/refresh');
                processQueue(null);
                return api(originalRequest);
            } catch (refreshError) {
                // Refresh failed — session is dead; clear local state and send to login
                processQueue(refreshError);
                localStorage.removeItem('user');
                window.location.href = '/login';
                return Promise.reject(refreshError);
            } finally {
                isRefreshing = false;
            }
        }

        return Promise.reject(error);
    }
);

export default api;
