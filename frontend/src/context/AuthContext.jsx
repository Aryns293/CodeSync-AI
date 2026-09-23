import { createContext, useContext, useState, useEffect } from 'react';
import api, { refreshClient } from '../utils/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Always call /refresh first to validate the session server-side.
        // Previously this exited early if localStorage was empty — but that
        // wasted a perfectly valid 7-day refresh cookie (e.g. if the user
        // manually cleared localStorage but their cookie was still alive).
        // Now: /refresh is always called. If it succeeds, we restore the UI
        // from localStorage if available. If it fails, we clear any stale data.
        const bootstrapSession = async () => {
            try {
                await refreshClient.post('/auth/refresh');
                // Refresh succeeded — the server confirmed a valid session.
                const storedUser = localStorage.getItem('user');
                if (storedUser) {
                    setUser(JSON.parse(storedUser));
                }
                // If localStorage was cleared but cookie is valid,
                // user stays null here. They'll need to log in again
                // to repopulate localStorage. Tokens are still valid in cookies.
            } catch {
                // Refresh failed — session is dead. Clear any stale local data.
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
