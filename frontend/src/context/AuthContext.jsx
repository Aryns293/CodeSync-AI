import { createContext, useContext, useState, useEffect } from 'react';
import api from '../utils/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Here we could add a /me endpoint to check session, but for now we'll just check localStorage
        // Since we use httpOnly cookies, the token is sent automatically
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            setUser(JSON.parse(storedUser));
        }
        setLoading(false);
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

    const updateProfile = async (name, password) => {
        const { data } = await api.put('/auth/profile', { name, password });
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

export const useAuth = () => useContext(AuthContext);
