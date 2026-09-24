import { Play, Terminal, Maximize2, Minimize2, Menu, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const LANGUAGES = [
  { id: 'cpp', label: 'C++' },
  { id: 'python3', label: 'Python 3' },
  { id: 'javascript', label: 'JavaScript (Node.js)' },
  { id: 'java', label: 'Java' },
];

function typingLabel(typingUsers) {
  const names = Object.values(typingUsers);
  if (names.length === 0) return null;
  if (names.length === 1) return `${names[0]} is typing...`;
  if (names.length === 2) return `${names[0]} and ${names[1]} are typing...`;
  return `${names.length} people are typing...`;
}

export function WorkspaceHeader({
  language,
  onLanguageChange,
  typingUsers,
  lastModified,
  currentUserName,
  connected,
  isExecuting,
  isConsoleOpen,
  isFocusMode,
  onToggleConsole,
  onToggleFocus,
  onRun,
  onOpenSidebar,
}) {
  const typing = typingLabel(typingUsers);

  return (
    <header className="h-14 border-b border-[#232B3A] flex items-center justify-between px-3 md:px-6 bg-[#0B0E14]/80 backdrop-blur-md shrink-0">
      <div className="flex items-center gap-2 md:gap-4">
        <button
          className="md:hidden p-1.5 text-gray-400 hover:text-white transition-colors rounded-md hover:bg-white/5"
          onClick={onOpenSidebar}
          aria-label="Open sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>

        <select
          value={language}
          onChange={(e) => {
            if (window.confirm("Changing the language will not clear your existing code. Do you want to continue?")) {
              onLanguageChange(e.target.value);
            }
          }}
          className="bg-[#151A23] border border-[#232B3A] text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:border-indigo-500 transition-colors text-gray-200"
        >
          {LANGUAGES.map((l) => (
            <option key={l.id} value={l.id}>
              {l.label}
            </option>
          ))}
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

      <div className="flex items-center gap-4">
        {lastModified.by && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="hidden md:flex items-center gap-2 text-xs text-gray-400 bg-[#151A23]/50 px-3 py-1.5 rounded-full border border-white/5 backdrop-blur-sm"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>
              Modified by{' '}
              <span className="text-gray-200 font-medium">
                {lastModified.by === currentUserName ? 'You' : lastModified.by}
              </span>
            </span>
            <span className="text-gray-500 text-[10px] uppercase tracking-wider ml-1">
              {new Date(lastModified.at).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </motion.div>
        )}

        <button
          className="hidden md:block p-1.5 text-gray-400 hover:text-white transition-colors rounded-md hover:bg-white/5"
          onClick={onToggleConsole}
          title={isConsoleOpen ? 'Hide Console' : 'Show Console'}
        >
          <Terminal className="w-5 h-5" />
        </button>

        <button
          className="hidden md:block p-1.5 text-gray-400 hover:text-white transition-colors rounded-md hover:bg-white/5"
          onClick={onToggleFocus}
          title={isFocusMode ? 'Exit Focus Mode' : 'Enter Focus Mode'}
        >
          {isFocusMode ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
        </button>

        <button
          onClick={onRun}
          disabled={isExecuting || !connected}
          title={!connected ? 'Connecting to server...' : undefined}
          className="flex items-center gap-1.5 md:gap-2 bg-green-500 hover:bg-green-600 text-white px-3 md:px-5 py-1.5 rounded-lg text-sm font-medium transition-colors shadow-lg shadow-green-500/20 disabled:opacity-50"
        >
          {isExecuting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Play className="w-4 h-4 fill-current" />
          )}
          <span className="hidden sm:inline">Run Code</span>
          <span className="sm:hidden">Run</span>
        </button>
      </div>
    </header>
  );
}
