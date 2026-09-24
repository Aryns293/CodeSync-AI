import Markdown from 'react-markdown';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles } from 'lucide-react';

export function AiReviewModal({ open, message, onClose }) {
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            className="relative w-full max-w-3xl max-h-[85vh] bg-[#151A23] border border-[#232B3A] rounded-2xl shadow-2xl flex flex-col"
          >
            <div className="flex items-center justify-between p-6 border-b border-[#232B3A]">
              <div className="flex items-center gap-3 text-indigo-400">
                <Sparkles className="w-5 h-5" />
                <h3 className="text-xl font-bold text-white">AI Code Review</h3>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-white"
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <div className="p-6 overflow-y-auto prose prose-invert prose-indigo max-w-none custom-scrollbar">
              <Markdown>{message}</Markdown>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
