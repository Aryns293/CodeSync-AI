import { createContext, useContext, useState, useEffect, useRef } from 'react';
import api, { refreshClient } from '../../shared/api/client';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(() => {
        try {
            const cached = localStorage.getItem('user');
            return cached ? JSON.parse(cached) : null;
        } catch {
            return null;
        }
    });
    const [loading, setLoading] = useState(() => {
        // If we already have a cached user, no need to block the UI.
        // The background refresh will still run to re-validate the session.
        return !localStorage.getItem('user');
    });

    const didBootstrap = useRef(false);
    useEffect(() => {
        if (didBootstrap.current) return;
        didBootstrap.current = true;
        
        // Always call /refresh first to validate the session server-side.
        // Previously this exited early if localStorage was empty — but that
        // wasted a perfectly valid 7-day refresh cookie (e.g. if the user
        // manually cleared localStorage but their cookie was still alive).
        // Now: /refresh is always called. If it succeeds, we restore the UI
        // from localStorage if available. If it fails, we clear any stale data.
        const bootstrapSession = async () => {
            try {
                const { data } = await refreshClient.post('/auth/refresh');
                // Refresh succeeded — use the fresh user from the server response.
                // This fixes the stale-UI bug where localStorage held an outdated
                // name/email (e.g. the user changed their profile on another device).
                if (data.user) {
                    setUser(data.user);
                    localStorage.setItem('user', JSON.stringify(data.user));
                }
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
