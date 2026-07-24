import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import Editor from '@monaco-editor/react';
import Markdown from 'react-markdown';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Copy, Check, Users, Sparkles, LogOut, Loader2, Maximize2, Terminal } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import clsx from 'clsx';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || '';
const socket = io(BACKEND_URL, { autoConnect: false });

export default function Workspace() {
    const { roomId } = useParams();
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const [connected, setConnected] = useState(false);
    const [language, setLanguage] = useState('cpp');
    const [code, setCode] = useState('// Start coding here...');
    const [output, setOutput] = useState('');
    const [stdin, setStdin] = useState('');
    const [users, setUsers] = useState([]);
    const [typing, setTyping] = useState('');
    const [copySuccess, setCopySuccess] = useState(false);
    
    // UI State
    const [isExecuting, setIsExecuting] = useState(false);
    const [isReviewing, setIsReviewing] = useState(false);
    const [reviewModalOpen, setReviewModalOpen] = useState(false);
    const [reviewMessage, setReviewMessage] = useState('');

    useEffect(() => {
        if (!user) {
            // Need a username, prompt for it if guest? For now, redirect to login
            navigate('/login');
            return;
        }

        socket.connect();
        socket.emit('join', { roomId, userName: user.name });

        socket.on('connect', () => setConnected(true));
        
        socket.on('userJoined', (usersList) => setUsers(usersList));
        
        socket.on('codeUpdate', (newCode) => setCode(newCode));
        
        socket.on('languageUpdate', (newLang) => setLanguage(newLang));
        
        socket.on('userTyping', (userName) => {
            setTyping(`${userName} is typing...`);
            setTimeout(() => setTyping(''), 2000);
        });

        socket.on('codeResponse', (response) => {
            setOutput(response.run.output);
            setIsExecuting(false);
        });

        socket.on('AIReview', (message) => {
            setReviewMessage(message);
            setIsReviewing(false);
            setReviewModalOpen(true);
        });

        return () => {
            socket.emit('leaveRoom');
            socket.disconnect();
        };
    }, [roomId, user, navigate]);

    const handleCodeChange = (newCode) => {
        setCode(newCode);
        socket.emit('codeChange', { roomId, code: newCode });
        socket.emit('typing', roomId, user?.name);
    };

    const handleLanguageChange = (e) => {
        const newLang = e.target.value;
        setLanguage(newLang);
        socket.emit('languageChange', { roomId, language: newLang });
    };

    const executeCode = () => {
        setIsExecuting(true);
        setOutput('Executing...');
        socket.emit('compileCode', { roomId, code, language, stdin });
    };

    const requestReview = () => {
        setIsReviewing(true);
        socket.emit('getAIReview', { roomId, code });
    };

    const copyRoomId = () => {
        navigator.clipboard.writeText(roomId);
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
    };

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    if (!user) return null;

    return (
        <div className="flex h-screen bg-[#0B0E14] text-gray-200 overflow-hidden font-sans">
            {/* Sidebar */}
            <aside className="w-64 bg-[#151A23] border-r border-[#232B3A] flex flex-col z-10 shadow-2xl">
                <div className="p-5 border-b border-[#232B3A]">
                    <div className="flex items-center gap-2 text-indigo-400 font-bold text-xl mb-4">
                        <Terminal className="w-6 h-6" />
                        CodeSync
                    </div>
                    <div className="bg-[#0B0E14] rounded-lg p-3 border border-[#232B3A]">
                        <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Room ID</p>
                        <div className="flex items-center justify-between">
                            <span className="font-mono text-sm">{roomId}</span>
                            <button onClick={copyRoomId} className="text-gray-400 hover:text-white transition-colors">
                                {copySuccess ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-5">
                    <div className="flex items-center gap-2 mb-4 text-sm text-gray-400 uppercase tracking-wider font-semibold">
                        <Users className="w-4 h-4" />
                        Collaborators ({users.length})
                    </div>
                    <div className="space-y-3">
                        {users.map((u, idx) => (
                            <div key={idx} className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-pink-500 flex items-center justify-center text-white font-semibold shadow-lg">
                                    {u.charAt(0).toUpperCase()}
                                </div>
                                <span className={clsx("text-sm", u === user.name ? "text-white font-medium" : "text-gray-300")}>
                                    {u} {u === user.name && "(You)"}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="p-5 border-t border-[#232B3A] space-y-4">
                    <button 
                        onClick={requestReview}
                        disabled={isReviewing}
                        className="w-full flex items-center justify-center gap-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 py-2.5 rounded-lg transition-colors font-medium disabled:opacity-50"
                    >
                        {isReviewing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                        {isReviewing ? 'Analyzing...' : 'AI Review'}
                    </button>
                    
                    <button onClick={handleLogout} className="w-full flex items-center gap-2 text-gray-400 hover:text-red-400 transition-colors text-sm px-2">
                        <LogOut className="w-4 h-4" />
                        Logout
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col relative">
                {/* Header */}
                <header className="h-14 border-b border-[#232B3A] flex items-center justify-between px-6 bg-[#0B0E14]/80 backdrop-blur-md">
                    <div className="flex items-center gap-4">
                        <select
                            value={language}
                            onChange={handleLanguageChange}
                            className="bg-[#151A23] border border-[#232B3A] text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:border-indigo-500 transition-colors text-gray-200"
                        >
                            <option value="cpp">C++ (GCC 9.2)</option>
                            <option value="python3">Python (3.8)</option>
                            <option value="javascript">JavaScript (Node)</option>
                            <option value="java">Java (JDK 13)</option>
                        </select>
                        <AnimatePresence>
                            {typing && (
                                <motion.span 
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0 }}
                                    className="text-xs text-indigo-400"
                                >
                                    {typing}
                                </motion.span>
                            )}
                        </AnimatePresence>
                    </div>
                    
                    <button 
                        onClick={executeCode}
                        disabled={isExecuting}
                        className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-5 py-1.5 rounded-lg text-sm font-medium transition-colors shadow-lg shadow-green-500/20 disabled:opacity-50"
                    >
                        {isExecuting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-current" />}
                        Run Code
                    </button>
                </header>

                {/* Editor Area */}
                <div className="flex-1 flex flex-col">
                    <div className="flex-1 relative">
                        <Editor
                            height="100%"
                            language={language === 'python3' ? 'python' : language}
                            theme="vs-dark"
                            value={code}
                            onChange={handleCodeChange}
                            options={{
                                minimap: { enabled: false },
                                fontSize: 15,
                                fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                                padding: { top: 20 },
                                smoothScrolling: true,
                                cursorBlinking: "smooth",
                                cursorSmoothCaretAnimation: "on",
                            }}
                            loading={
                                <div className="flex h-full items-center justify-center text-indigo-400">
                                    <Loader2 className="w-8 h-8 animate-spin" />
                                </div>
                            }
                        />
                    </div>

                    {/* Bottom Console */}
                    <div className="h-64 border-t border-[#232B3A] flex bg-[#0B0E14]">
                        <div className="flex-1 flex flex-col border-r border-[#232B3A]">
                            <div className="h-8 bg-[#151A23] border-b border-[#232B3A] flex items-center px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                Standard Input
                            </div>
                            <textarea
                                value={stdin}
                                onChange={(e) => setStdin(e.target.value)}
                                placeholder="Enter input here..."
                                className="flex-1 bg-transparent p-4 text-sm font-mono focus:outline-none resize-none text-gray-300"
                            />
                        </div>
                        <div className="flex-1 flex flex-col relative">
                            <div className="h-8 bg-[#151A23] border-b border-[#232B3A] flex items-center px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                Output Console
                            </div>
                            <pre className="flex-1 p-4 text-sm font-mono overflow-auto text-gray-300 whitespace-pre-wrap">
                                {output || "Code execution output will appear here..."}
                            </pre>
                            {isExecuting && (
                                <div className="absolute inset-0 bg-[#0B0E14]/50 backdrop-blur-sm flex items-center justify-center">
                                    <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>

            {/* AI Review Modal */}
            <AnimatePresence>
                {reviewModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                            onClick={() => setReviewModalOpen(false)}
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
                                <button onClick={() => setReviewModalOpen(false)} className="text-gray-400 hover:text-white">
                                    ✕
                                </button>
                            </div>
                            <div className="p-6 overflow-y-auto prose prose-invert prose-indigo max-w-none custom-scrollbar">
                                <Markdown>{reviewMessage}</Markdown>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
