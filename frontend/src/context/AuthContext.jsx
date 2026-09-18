import { createContext, useContext, useState, useEffect } from 'react';
import api, { refreshClient } from '../utils/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Verify the session is still live on the server by calling /refresh.
        // If the httpOnly refreshToken cookie is valid, the server issues a new
        // access token and we restore the user from localStorage.
        // If not (expired, logged out elsewhere), we clear local state.
        // This eliminates the localStorage-only trust vulnerability — a spoofed
        // localStorage entry no longer grants access to authenticated routes.
        const bootstrapSession = async () => {
            const storedUser = localStorage.getItem('user');
            if (!storedUser) {
                setLoading(false);
                return;
            }
            try {
                await refreshClient.post('/auth/refresh');
                // Refresh succeeded — the server confirmed a valid session.
                setUser(JSON.parse(storedUser));
            } catch {
                // Refresh failed — session is invalid. Clear stale local data.
                localStorage.removeItem('user');
                setUser(null);
            } finally {
                setLoading(false);
            }
        };
        bootstrapSession();
    }, []);

    const login = async (email, password) => {
        const { data } = await api.post('/auth/login', { email, password });
        if (data.success) {
            setUser(data.user);
            localStorage.setItem('user', JSON.stringify(data.user));
        }
        return data;
    };

    const register = async (name, email, password) => {
        const { data } = await api.post('/auth/register', { name, email, password });
        if (data.success) {
            setUser(data.user);
            localStorage.setItem('user', JSON.stringify(data.user));
        }
        return data;
    };

    const logout = async () => {
        await api.post('/auth/logout');
        setUser(null);
        localStorage.removeItem('user');
    };

    const updateProfile = async (name, password, currentPassword) => {
        const { data } = await api.put('/auth/profile', { name, password, currentPassword });
        if (data.success) {
            setUser(data.user);
            localStorage.setItem('user', JSON.stringify(data.user));
        }
        return data;
    };

    return (
        <AuthContext.Provider value={{ user, login, register, logout, updateProfile, loading }}>
            {children}
        </AuthContext.Provider>
    );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);
