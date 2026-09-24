import { useState } from 'react';
import {
  Users,
  Terminal,
  Copy,
  Check,
  Sparkles,
  Loader2,
  DoorOpen,
  LogOut,
  X,
} from 'lucide-react';
import clsx from 'clsx';

export function WorkspaceSidebar({
  roomId,
  users,
  currentUserId,
  typingUsers,
  isMobile,
  isOpen,
  isFocusMode,
  width,
  onClose,
  onRequestReview,
  isReviewing,
  onLeave,
  onLogout,
  onStartResize,
}) {
  const [copied, setCopied] = useState(false);

  const copyRoomId = () => {
    navigator.clipboard.writeText(roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <aside
      className={clsx(
        'fixed md:relative h-full bg-[#151A23] border-r border-[#232B3A] flex flex-col z-50 shadow-2xl transition-transform duration-300 ease-in-out md:transition-none shrink-0',
        isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
        isFocusMode ? 'md:hidden' : 'md:flex'
      )}
      style={{ width: isMobile ? 256 : width }}
    >
      <div className="p-5 border-b border-[#232B3A]">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-indigo-400 font-bold text-xl">
            <Terminal className="w-6 h-6" />
            CodeSync
          </div>
          <button
            className="md:hidden text-gray-400 hover:text-white transition-colors"
            onClick={onClose}
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="bg-[#0B0E14] rounded-lg p-3 border border-[#232B3A]">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Room ID</p>
          <div className="flex items-center justify-between">
            <span className="font-mono text-sm truncate">{roomId}</span>
            <button
              onClick={copyRoomId}
              className="text-gray-400 hover:text-white transition-colors shrink-0 ml-2"
              aria-label="Copy room ID"
            >
              {copied ? (
                <Check className="w-4 h-4 text-green-400" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
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
          {users.map((u) => {
            const isTyping = typingUsers[u.id];
            return (
              <div
                key={u.id}
                className={clsx(
                  'flex items-center gap-3 p-2 rounded-lg transition-all',
                  isTyping && 'glow-typing'
                )}
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-pink-500 flex items-center justify-center text-white font-semibold shadow-lg">
                  {u.name ? u.name.charAt(0).toUpperCase() : '?'}
                </div>
                <div className="flex flex-col">
                  <span
                    className={clsx(
                      'text-sm',
                      u.id === currentUserId ? 'text-white font-medium' : 'text-gray-300'
                    )}
                  >
                    {u.name} {u.id === currentUserId && '(You)'}
                  </span>
                  {isTyping && (
                    <span className="text-xs text-purple-400">typing...</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="p-5 border-t border-[#232B3A] space-y-4">
        <button
          onClick={onRequestReview}
          disabled={isReviewing}
          className="w-full flex items-center justify-center gap-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 py-2.5 rounded-lg transition-colors font-medium disabled:opacity-50"
        >
          {isReviewing ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Sparkles className="w-4 h-4" />
          )}
          {isReviewing ? 'Analyzing...' : 'AI Review'}
        </button>

        <button
          onClick={onLeave}
          className="w-full flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm px-2"
        >
          <DoorOpen className="w-4 h-4" />
          Leave Room
        </button>

        <button
          onClick={onLogout}
          className="w-full flex items-center gap-2 text-gray-400 hover:text-red-400 transition-colors text-sm px-2"
        >
          <LogOut className="w-4 h-4" />
          Logout
        </button>
      </div>

      {!isMobile && (
        <div
          onMouseDown={onStartResize}
          className="group absolute top-0 right-0 w-1.5 h-full cursor-col-resize hover:bg-indigo-500 z-50 flex items-center justify-center translate-x-1/2"
        >
          <div className="flex gap-[2px] opacity-0 group-hover:opacity-100 transition-opacity bg-[#0B0E14] px-0.5 rounded py-1">
            <div className="w-[1px] h-4 bg-gray-400" />
            <div className="w-[1px] h-4 bg-gray-400" />
          </div>
        </div>
      )}
    </aside>
  );
}
