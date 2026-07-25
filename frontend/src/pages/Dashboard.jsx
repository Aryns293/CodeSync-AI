import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, LogIn, Settings, X, Loader2 } from 'lucide-react';
import api from '../utils/api';
import Navbar from '../components/Navbar';

export default function Dashboard() {
    const { user, updateProfile } = useAuth();
    const navigate = useNavigate();
    const [joinId, setJoinId] = useState('');
    const [error, setError] = useState('');
    const [isCreating, setIsCreating] = useState(false);

    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [profileName, setProfileName] = useState(user?.name || '');
    const [profilePassword, setProfilePassword] = useState('');
    const [profileError, setProfileError] = useState('');
    const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
    const [profileSuccess, setProfileSuccess] = useState('');

    const handleCreateRoom = async () => {
        setError('');
        setIsCreating(true);
        try {
            const { data } = await api.post('/room');
            if (data.success) {
                navigate(`/room/${data.room.roomId}`);
            } else {
                setError(data.message || 'Failed to create room');
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Error creating room');
        } finally {
            setIsCreating(false);
        }
    };

    const handleJoinRoom = async (e) => {
        e.preventDefault();
        setError('');
        if (!joinId.trim()) return;
        
        try {
            const { data } = await api.get(`/room/${joinId.trim()}`);
            if (data.success) {
                navigate(`/room/${joinId.trim()}`);
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Room not found');
        }
    };

    const handleUpdateProfile = async (e) => {
        e.preventDefault();
        setProfileError('');
        setProfileSuccess('');
        setIsUpdatingProfile(true);

        try {
            await updateProfile(profileName, profilePassword || undefined);
            setProfileSuccess('Profile updated successfully!');
            setProfilePassword('');
            setTimeout(() => {
                setIsProfileModalOpen(false);
                setProfileSuccess('');
            }, 1500);
        } catch (err) {
            setProfileError(err.response?.data?.message || 'Failed to update profile');
        } finally {
            setIsUpdatingProfile(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#0B0E14] bg-grid text-white relative overflow-hidden font-sans pt-16">
            <Navbar />
            
            {/* Background Effects */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[150px] pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[150px] pointer-events-none" />

            <main className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10 p-6 md:p-12 mt-12">
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass-panel p-8 rounded-2xl flex flex-col items-center text-center group hover:border-indigo-500/50 transition-colors glow-border"
                >
                    <div className="w-16 h-16 bg-indigo-500/10 rounded-2xl flex items-center justify-center mb-6 border border-indigo-500/20 group-hover:scale-110 transition-transform glow-border">
                        <Plus className="w-8 h-8 text-indigo-400" />
                    </div>
                    <h2 className="text-2xl font-bold mb-3">Create New Room</h2>
                    <p className="text-slate-400 mb-8">Start a fresh coding session and invite others to collaborate with you in real-time.</p>
                    <button 
                        onClick={handleCreateRoom}
                        disabled={isCreating}
                        className="mt-auto w-full bg-gradient-to-r from-indigo-500 to-purple-500 hover:opacity-90 text-white font-semibold py-3.5 rounded-lg transition-all disabled:opacity-50 glow-border"
                    >
                        {isCreating ? 'Creating...' : 'Create Room'}
                    </button>
                </motion.div>

                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="glass-panel p-8 rounded-2xl flex flex-col items-center text-center group hover:border-purple-500/50 transition-colors glow-border"
                >
                    <div className="w-16 h-16 bg-purple-500/10 rounded-2xl flex items-center justify-center mb-6 border border-purple-500/20 group-hover:scale-110 transition-transform glow-border">
                        <LogIn className="w-8 h-8 text-purple-400" />
                    </div>
                    <h2 className="text-2xl font-bold mb-3">Join Existing Room</h2>
                    <p className="text-slate-400 mb-8">Have a room ID? Enter it below to join an active coding session.</p>
                    
                    <form onSubmit={handleJoinRoom} className="w-full mt-auto flex gap-2">
                        <input 
                            type="text" 
                            placeholder="e.g. 849201"
                            value={joinId}
                            onChange={(e) => setJoinId(e.target.value)}
                            className="flex-1 bg-[#0B0E14] border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-mono placeholder:text-slate-600"
                        />
                        <button 
                            type="submit"
                            className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:opacity-90 px-6 rounded-lg font-semibold transition-all glow-border"
                        >
                            Join
                        </button>
                    </form>
                    {error && <p className="text-red-400 text-sm mt-3">{error}</p>}
                </motion.div>
            </main>

            {/* Profile Settings Button */}
            <div className="fixed bottom-8 right-8 z-20">
                <button
                    onClick={() => setIsProfileModalOpen(true)}
                    className="p-4 bg-[#151A23] border border-[#232B3A] rounded-full text-gray-400 hover:text-white hover:border-indigo-500/50 shadow-lg transition-all glow-border"
                    title="Update Profile"
                >
                    <Settings className="w-6 h-6" />
                </button>
            </div>

            {/* Profile Update Modal */}
            <AnimatePresence>
                {isProfileModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                            onClick={() => setIsProfileModalOpen(false)}
                        />
                        <motion.div 
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            className="relative w-full max-w-md bg-[#151A23] border border-[#232B3A] rounded-2xl shadow-2xl p-6"
                        >
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-xl font-bold text-white">Update Profile</h3>
                                <button onClick={() => setIsProfileModalOpen(false)} className="text-gray-400 hover:text-white">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            
                            <form onSubmit={handleUpdateProfile} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1">Name</label>
                                    <input 
                                        type="text" 
                                        value={profileName}
                                        onChange={(e) => setProfileName(e.target.value)}
                                        className="w-full bg-[#0B0E14] border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-colors"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1">New Password (optional)</label>
                                    <input 
                                        type="password" 
                                        placeholder="Leave blank to keep current"
                                        value={profilePassword}
                                        onChange={(e) => setProfilePassword(e.target.value)}
                                        className="w-full bg-[#0B0E14] border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-colors"
                                    />
                                </div>

                                {profileError && <p className="text-red-400 text-sm">{profileError}</p>}
                                {profileSuccess && <p className="text-green-400 text-sm">{profileSuccess}</p>}

                                <button 
                                    type="submit"
                                    disabled={isUpdatingProfile}
                                    className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 hover:opacity-90 text-white font-semibold py-3 rounded-lg transition-all disabled:opacity-50 mt-4 flex justify-center items-center gap-2 glow-border"
                                >
                                    {isUpdatingProfile && <Loader2 className="w-4 h-4 animate-spin" />}
                                    Save Changes
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
