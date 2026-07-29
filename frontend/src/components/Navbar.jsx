import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogOut, Code2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Navbar() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [logoutModalOpen, setLogoutModalOpen] = useState(false);

    const handleLogout = async () => {
        try {
            setLogoutModalOpen(false);
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
                                        onClick={() => setLogoutModalOpen(true)}
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

            {/* Logout Modal */}
            <AnimatePresence>
                {logoutModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 font-sans">
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                            onClick={() => setLogoutModalOpen(false)}
                        />
                        <motion.div 
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            className="relative w-full max-w-md bg-[#151A23] border border-[#232B3A] rounded-2xl shadow-2xl flex flex-col overflow-hidden"
                        >
                            <div className="flex items-center gap-4 p-6 border-b border-[#232B3A]">
                                <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center text-red-400 shrink-0">
                                    <LogOut className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-white">Logout?</h3>
                                    <p className="text-sm text-gray-400 mt-1">Are you sure you want to log out of your account?</p>
                                </div>
                            </div>
                            <div className="p-6 bg-[#0B0E14] flex justify-end gap-3">
                                <button 
                                    onClick={() => setLogoutModalOpen(false)}
                                    className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white transition-colors"
                                >
                                    Cancel
                                </button>
                                <button 
                                    onClick={handleLogout}
                                    className="px-4 py-2 text-sm font-medium bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors shadow-lg shadow-red-500/20"
                                >
                                    Logout
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </nav>
    );
}
