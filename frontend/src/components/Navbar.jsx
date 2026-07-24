import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogOut, Code2 } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Navbar() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const handleLogout = async () => {
        try {
            await logout();
            navigate('/login');
        } catch (error) {
            console.error('Failed to log out:', error);
        }
    };

    return (
        <nav className="fixed top-0 w-full z-50 glass-panel border-b border-white/5">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16 items-center">
                    <Link to="/" className="flex items-center space-x-2">
                        <div className="bg-[#1A1F2B] px-3 py-1.5 rounded-lg border border-white/10 glow-border group transition-all duration-300">
                            <span className="text-xl font-bold text-white group-hover:glow-text transition-all duration-300">
                                CodeSync <span className="text-gradient">AI</span>
                            </span>
                        </div>
                    </Link>

                    <div className="flex items-center space-x-6">
                        {/* Only show these links on the landing page */}
                        {location.pathname === '/' && (
                            <div className="hidden md:flex space-x-6 text-sm font-medium text-slate-300">
                                <Link to="/" className="hover:text-white transition-colors">Home</Link>
                                <a href="#demo" className="hover:text-white transition-colors">Demo</a>
                                <a href="#features" className="hover:text-white transition-colors">Features</a>
                            </div>
                        )}

                        <div className="flex items-center space-x-4 pl-6 border-l border-white/10">
                            {user ? (
                                <>
                                    <span className="text-sm text-slate-400 hidden sm:block">
                                        {user.name}
                                    </span>
                                    {location.pathname !== '/dashboard' && (
                                        <Link 
                                            to="/dashboard"
                                            className="text-sm font-medium text-white hover:text-[#A8B1FF] transition-colors"
                                        >
                                            Dashboard
                                        </Link>
                                    )}
                                    <button
                                        onClick={handleLogout}
                                        className="text-slate-400 hover:text-rose-400 transition-colors p-2 rounded-lg hover:bg-white/5"
                                        title="Logout"
                                    >
                                        <LogOut size={18} />
                                    </button>
                                </>
                            ) : (
                                <>
                                    <Link 
                                        to="/login"
                                        className="text-sm font-medium text-slate-300 hover:text-white transition-colors"
                                    >
                                        Sign In
                                    </Link>
                                    <Link 
                                        to="/register"
                                        className="text-sm font-medium bg-gradient-to-r from-indigo-500 to-purple-500 text-white px-4 py-2 rounded-lg hover:opacity-90 transition-opacity glow-border"
                                    >
                                        Sign Up
                                    </Link>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </nav>
    );
}
