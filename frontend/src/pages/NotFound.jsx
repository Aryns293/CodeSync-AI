import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';

export default function NotFound() {
    return (
        <div className="min-h-screen bg-[#0B0E14] bg-grid text-slate-300 flex flex-col items-center justify-center p-4">
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-panel p-8 md:p-12 rounded-2xl border border-white/10 text-center max-w-lg w-full flex flex-col items-center"
            >
                <div className="w-16 h-16 bg-rose-500/10 text-rose-400 rounded-2xl flex items-center justify-center mb-6 border border-rose-500/20">
                    <AlertTriangle size={32} />
                </div>
                <h1 className="text-4xl font-bold text-white mb-4">404</h1>
                <p className="text-slate-400 mb-8 text-lg">
                    The page you're looking for doesn't exist or has been moved.
                </p>
                <Link 
                    to="/"
                    className="bg-indigo-500 hover:bg-indigo-600 text-white px-6 py-3 rounded-xl font-medium transition-colors"
                >
                    Return Home
                </Link>
            </motion.div>
        </div>
    );
}
