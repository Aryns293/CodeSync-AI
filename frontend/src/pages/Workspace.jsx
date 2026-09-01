import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import Editor from '@monaco-editor/react';
import Markdown from 'react-markdown';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Copy, Check, Users, Sparkles, LogOut, Loader2, Maximize2, Terminal, DoorOpen, AlertTriangle, Menu, X } from 'lucide-react';
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
    const [typingUsers, setTypingUsers] = useState({});
    const [lastModified, setLastModified] = useState({ by: null, at: null });
    
    // Editor refs
    const editorRef = useRef(null);
    const monacoRef = useRef(null);
    const decorationsRef = useRef([]);
    const remoteCursorsRef = useRef({});
    const typingTimeoutsRef = useRef({});
    const [copySuccess, setCopySuccess] = useState(false);
    
    // UI State
    const [isExecuting, setIsExecuting] = useState(false);
    const [isReviewing, setIsReviewing] = useState(false);
    const [reviewModalOpen, setReviewModalOpen] = useState(false);
    const [reviewMessage, setReviewMessage] = useState('');
    const [leaveModalOpen, setLeaveModalOpen] = useState(false);
    const [logoutModalOpen, setLogoutModalOpen] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    useEffect(() => {
        if (!user) {
            // Need a username, prompt for it if guest? For now, redirect to login
            navigate('/login');
            return;
        }

        socket.connect();
        socket.emit('join', { roomId, user: { id: user.id, name: user.name, email: user.email } });

        socket.on('connect', () => setConnected(true));
        
        socket.on('userJoined', (usersList) => setUsers(usersList));
        
        socket.on('codeUpdate', (data) => {
            if (typeof data === 'string') {
                setCode(data);
            } else {
                setCode(data.code);
                if (data.lastModifiedBy && data.lastModifiedAt) {
                    setLastModified({ by: data.lastModifiedBy, at: data.lastModifiedAt });
                }
            }
        });
        
        socket.on('languageUpdate', (newLang) => setLanguage(newLang));
        
        socket.on('userTyping', ({ userName, userId }) => {
            setTypingUsers(prev => ({ ...prev, [userId]: userName }));
            
            if (typingTimeoutsRef.current[userId]) {
                clearTimeout(typingTimeoutsRef.current[userId]);
            }
            
            typingTimeoutsRef.current[userId] = setTimeout(() => {
                setTypingUsers(prev => {
                    const next = { ...prev };
                    delete next[userId];
                    return next;
                });
            }, 2000);
        });

        socket.on('cursorUpdate', ({ userId, userName, position }) => {
            if (userId === user.id) return;
            remoteCursorsRef.current[userId] = { position, userName };
            updateDecorations();
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

    const updateDecorations = () => {
        if (!editorRef.current || !monacoRef.current) return;
        
        const newDecorations = Object.values(remoteCursorsRef.current).map(({ position, userName }) => ({
            range: new monacoRef.current.Range(position.lineNumber, position.column, position.lineNumber, position.column),
            options: {
                className: 'remote-cursor',
                hoverMessage: { value: `**${userName}** is here` }
            }
        }));
        
        decorationsRef.current = editorRef.current.deltaDecorations(decorationsRef.current, newDecorations);
    };

    const handleEditorMount = (editor, monaco) => {
        editorRef.current = editor;
        monacoRef.current = monaco;
        
        editor.onDidChangeCursorPosition((e) => {
            socket.emit('cursorChange', { roomId, userId: user.id, userName: user.name, position: e.position });
        });
    };

    const handleCodeChange = (newCode) => {
        setCode(newCode);
        const timestamp = new Date().toISOString();
        setLastModified({ by: user.name, at: timestamp });
        socket.emit('codeChange', { roomId, code: newCode, userName: user.name, timestamp });
        socket.emit('typing', { roomId, userName: user.name, userId: user.id });
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

    const handleLeaveRoom = () => {
        setLeaveModalOpen(false);
        navigate('/dashboard');
    };

    const handleLogout = async () => {
        setLogoutModalOpen(false);
        await logout();
        navigate('/login');
    };

    if (!user) return null;

    return (
        <div className="flex h-screen bg-[#0B0E14] text-gray-200 overflow-hidden font-sans">
            {/* Mobile Sidebar Overlay */}
            {isSidebarOpen && (
                <div 
                    className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}
            
            {/* Sidebar */}
            <aside className={clsx(
                "fixed md:relative w-64 h-full bg-[#151A23] border-r border-[#232B3A] flex flex-col z-50 shadow-2xl transition-transform duration-300 ease-in-out",
                isSidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
            )}>
                <div className="p-5 border-b border-[#232B3A]">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2 text-indigo-400 font-bold text-xl">
                            <Terminal className="w-6 h-6" />
                            CodeSync
                        </div>
                        <button 
                            className="md:hidden text-gray-400 hover:text-white transition-colors"
                            onClick={() => setIsSidebarOpen(false)}
                        >
                            <X className="w-5 h-5" />
                        </button>
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
                        {users.map((u, idx) => {
                            const isTyping = typingUsers[u.id];
                            return (
                                <div key={idx} className={clsx("flex items-center gap-3 p-2 rounded-lg transition-all", isTyping ? "glow-typing" : "")}>
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-pink-500 flex items-center justify-center text-white font-semibold shadow-lg">
                                        {u.name ? u.name.charAt(0).toUpperCase() : '?'}
                                    </div>
                                    <div className="flex flex-col">
                                        <span className={clsx("text-sm", u.id === user.id ? "text-white font-medium" : "text-gray-300")}>
                                            {u.name} {u.id === user.id && "(You)"}
                                        </span>
                                        {isTyping && <span className="text-xs text-purple-400">typing...</span>}
                                    </div>
                                </div>
                            );
                        })}
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
                    
                    <button onClick={() => setLeaveModalOpen(true)} className="w-full flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm px-2">
                        <DoorOpen className="w-4 h-4" />
                        Leave Room
                    </button>
                    
                    <button onClick={() => setLogoutModalOpen(true)} className="w-full flex items-center gap-2 text-gray-400 hover:text-red-400 transition-colors text-sm px-2">
                        <LogOut className="w-4 h-4" />
                        Logout
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col relative w-full md:w-auto overflow-hidden">
                {/* Header */}
                <header className="h-14 border-b border-[#232B3A] flex items-center justify-between px-3 md:px-6 bg-[#0B0E14]/80 backdrop-blur-md shrink-0">
                    <div className="flex items-center gap-2 md:gap-4">
                        <button 
                            className="md:hidden p-1.5 text-gray-400 hover:text-white transition-colors rounded-md hover:bg-white/5"
                            onClick={() => setIsSidebarOpen(true)}
                        >
                            <Menu className="w-5 h-5" />
                        </button>
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
                            {Object.keys(typingUsers).length > 0 && (
                                <motion.span 
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0 }}
                                    className="text-xs text-indigo-400"
                                >
                                    {(() => {
                                        const names = Object.values(typingUsers);
                                        if (names.length === 1) return `${names[0]} is typing...`;
                                        if (names.length === 2) return `${names[0]} and ${names[1]} are typing...`;
                                        return `${names.length} people are typing...`;
                                    })()}
                                </motion.span>
                            )}
                        </AnimatePresence>
                    </div>
                    
                    <div className="flex items-center gap-4">
                        {lastModified.by && (
                            <motion.div 
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="hidden md:flex items-center gap-2 text-xs text-gray-400 bg-[#151A23]/50 px-3 py-1.5 rounded-full border border-white/5 backdrop-blur-sm"
                            >
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                <span>Modified by <span className="text-gray-200 font-medium">{lastModified.by === user.name ? 'You' : lastModified.by}</span></span>
                                <span className="text-gray-500 text-[10px] uppercase tracking-wider ml-1">
                                    {new Date(lastModified.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </motion.div>
                        )}
                        <button 
                            onClick={executeCode}
                            disabled={isExecuting}
                            className="flex items-center gap-1.5 md:gap-2 bg-green-500 hover:bg-green-600 text-white px-3 md:px-5 py-1.5 rounded-lg text-sm font-medium transition-colors shadow-lg shadow-green-500/20 disabled:opacity-50"
                        >
                            {isExecuting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-current" />}
                            <span className="hidden sm:inline">Run Code</span>
                            <span className="sm:hidden">Run</span>
                        </button>
                    </div>
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
                            onMount={handleEditorMount}
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
                    <div className="h-auto md:h-64 border-t border-[#232B3A] flex flex-col md:flex-row bg-[#0B0E14]">
                        <div className="flex-1 h-32 md:h-auto flex flex-col border-b md:border-b-0 md:border-r border-[#232B3A]">
                            <div className="h-8 bg-[#151A23] border-b border-[#232B3A] flex items-center px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                Standard Input
                            </div>
                            <textarea
                                value={stdin}
                                onChange={(e) => setStdin(e.target.value)}
                                placeholder="Enter input here..."
                                className="flex-1 bg-transparent p-3 md:p-4 text-xs md:text-sm font-mono focus:outline-none resize-none text-gray-300 custom-scrollbar"
                            />
                        </div>
                        <div className="flex-1 h-40 md:h-auto flex flex-col relative">
                            <div className="h-8 bg-[#151A23] border-b border-[#232B3A] flex items-center px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                Output Console
                            </div>
                            <pre className="flex-1 p-3 md:p-4 text-xs md:text-sm font-mono overflow-auto text-gray-300 whitespace-pre-wrap custom-scrollbar">
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

            {/* Leave Room Modal */}
            <AnimatePresence>
                {leaveModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                            onClick={() => setLeaveModalOpen(false)}
                        />
                        <motion.div 
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            className="relative w-full max-w-md bg-[#151A23] border border-[#232B3A] rounded-2xl shadow-2xl flex flex-col overflow-hidden"
                        >
                            <div className="flex items-center gap-4 p-6 border-b border-[#232B3A]">
                                <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center text-red-400 shrink-0">
                                    <AlertTriangle className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-white">Leave Room?</h3>
                                    <p className="text-sm text-gray-400 mt-1">Are you sure you want to leave this session?</p>
                                </div>
                            </div>
                            <div className="p-6 bg-[#0B0E14] flex justify-end gap-3">
                                <button 
                                    onClick={() => setLeaveModalOpen(false)}
                                    className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white transition-colors"
                                >
                                    Stay
                                </button>
                                <button 
                                    onClick={handleLeaveRoom}
                                    className="px-4 py-2 text-sm font-medium bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors shadow-lg shadow-red-500/20"
                                >
                                    Leave Room
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Logout Modal */}
            <AnimatePresence>
                {logoutModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
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
        </div>
    );
}
