import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import { Plus, LogIn, Code2 } from 'lucide-react';
import api from '../utils/api';
import Navbar from '../components/Navbar';

export default function Dashboard() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [joinId, setJoinId] = useState('');
    const [error, setError] = useState('');
    const [isCreating, setIsCreating] = useState(false);

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
        </div>
    );
}
