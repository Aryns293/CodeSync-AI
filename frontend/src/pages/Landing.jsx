
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Code2, Users, Layers, Cloud, Sparkles, Share2, MousePointer2 } from 'lucide-react';
import Navbar from '../components/Navbar';

export default function Landing() {
    return (
        <div className="min-h-screen bg-grid text-slate-300 font-sans">
            <Navbar />

            {/* Hero Section */}
            <main className="pt-32 pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto flex flex-col items-center text-center">
                
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    className="inline-flex items-center space-x-2 bg-indigo-500/10 text-indigo-400 px-4 py-1.5 rounded-full border border-indigo-500/20 mb-8 glow-border"
                >
                    <Sparkles size={16} />
                    <span className="text-sm font-medium">Collaborative Coding Made Simple</span>
                </motion.div>

                <motion.h1 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.1 }}
                    className="text-5xl md:text-7xl font-extrabold text-white tracking-tight mb-8"
                >
                    Collaborative <span className="text-gradient">IDE</span> <br /> Reimagined
                </motion.h1>

                <motion.p 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                    className="text-lg md:text-xl text-slate-400 max-w-2xl mb-12"
                >
                    Create, collaborate, and share beautiful code with our intuitive real-time collaborative development environment.
                </motion.p>

                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.3 }}
                    className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-6 mb-24"
                >
                    <Link 
                        to="/register" 
                        className="flex items-center justify-center space-x-2 bg-gradient-to-r from-indigo-500 to-purple-500 text-white px-8 py-3.5 rounded-xl font-medium hover:opacity-90 transition-all glow-border hover:scale-105"
                    >
                        <span>Start Coding</span>
                        <MousePointer2 size={18} />
                    </Link>
                    <a 
                        href="#demo"
                        className="flex items-center justify-center space-x-2 bg-white/5 border border-white/10 text-white px-8 py-3.5 rounded-xl font-medium hover:bg-white/10 transition-all hover:scale-105"
                    >
                        <span>Watch Demo</span>
                    </a>
                </motion.div>

                {/* Mock UI Section */}
                <motion.div
                    initial={{ opacity: 0, y: 40 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.5 }}
                    id="demo"
                    className="w-full max-w-7xl rounded-2xl overflow-hidden glass-panel glow-border border-white/10 shadow-2xl relative"
                >
                    <div className="h-12 bg-[#1A1F2B] border-b border-white/5 flex items-center px-4 space-x-2">
                        <div className="flex space-x-2">
                            <div className="w-3 h-3 rounded-full bg-rose-500"></div>
                            <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                            <div className="w-3 h-3 rounded-full bg-green-500"></div>
                        </div>
                        <div className="flex-1 flex justify-center">
                            <div className="bg-[#0B0E14] px-4 py-1 rounded text-xs text-slate-400 border border-white/5">
                                index.js - CodeSync AI
                            </div>
                        </div>
                    </div>
                    <div className="bg-[#151A23] w-full aspect-video overflow-hidden relative">
                        <video
                            src="/CodeSync.mp4"
                            autoPlay
                            loop
                            muted
                            playsInline
                            className="w-full h-full object-cover"
                        />
                    </div>
                </motion.div>
            </main>

            {/* Features Section */}
            <section id="features" className="py-24 bg-[#0B0E14]/50 border-t border-white/5 relative z-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Everything you need to create</h2>
                        <p className="text-slate-400">Powerful features to bring your ideas to life instantly.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[
                            {
                                icon: <Users className="text-blue-400" size={24} />,
                                title: "Real-time Collaboration",
                                desc: "Work together with your team in real-time, seeing changes instantly as they happen."
                            },
                            {
                                icon: <Code2 className="text-indigo-400" size={24} />,
                                title: "Integrated Execution",
                                desc: "Run your code directly in the browser across multiple languages using secure Docker sandboxes."
                            },
                            {
                                icon: <Share2 className="text-purple-400" size={24} />,
                                title: "Easy Sharing",
                                desc: "Share your workspace instantly with a room ID."
                            },
                            {
                                icon: <Layers className="text-rose-400" size={24} />,
                                title: "Multiple Languages",
                                desc: "Support for Python 3, JavaScript, Java, and C++."
                            },
                            {
                                icon: <Cloud className="text-sky-400" size={24} />,
                                title: "Cloud Synced",
                                desc: "Your code and execution logs are automatically saved and synced across devices."
                            },
                            {
                                icon: <Sparkles className="text-amber-400" size={24} />,
                                title: "AI Code Reviews",
                                desc: "AI-powered tools to help you identify bugs, improve logic, and write better code faster."
                            }
                        ].map((feature, idx) => (
                            <motion.div 
                                key={idx}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5, delay: idx * 0.1 }}
                                viewport={{ once: true }}
                                className="glass-panel p-6 rounded-xl hover:bg-white/[0.02] transition-colors border border-white/5 hover:border-white/10 group"
                            >
                                <div className="w-12 h-12 rounded-lg bg-white/5 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                    {feature.icon}
                                </div>
                                <h3 className="text-lg font-bold text-white mb-2">{feature.title}</h3>
                                <p className="text-slate-400 text-sm leading-relaxed">{feature.desc}</p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>
            
            {/* Footer */}
            <footer className="border-t border-white/10 py-12 bg-[#0B0E14] relative z-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center">
                    <div className="flex items-center space-x-2 mb-4 md:mb-0">
                        <span className="text-lg font-bold text-white">
                            CodeSync <span className="text-gradient">AI</span>
                        </span>
                    </div>
                    <div className="text-slate-500 text-sm">
                        &copy; {new Date().getFullYear()} CodeSync AI. All rights reserved.
                    </div>
                </div>
            </footer>
        </div>
    );
}
