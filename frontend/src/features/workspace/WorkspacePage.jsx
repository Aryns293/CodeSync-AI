import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import { AlertTriangle, Loader2, LogOut } from 'lucide-react';
import clsx from 'clsx';

import { useAuth } from '../../features/auth/AuthContext';
import { useRoomSession } from './useRoomSession';
import { useEditorBinding } from './useEditorBinding';
import { useResizablePanels } from './useResizablePanels';
import { WorkspaceHeader } from './components/WorkspaceHeader';
import { WorkspaceSidebar } from './components/WorkspaceSidebar';
import { ConsolePanel } from './components/ConsolePanel';
import { ConfirmModal } from './components/ConfirmModal';
import { AiReviewModal } from './components/AiReviewModal';

const monacoLangFor = (lang) => (lang === 'python3' ? 'python' : lang);

export default function WorkspacePage() {
  const { roomId } = useParams();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [isConsoleOpen, setIsConsoleOpen] = useState(true);
  const [isConsoleMaximized, setIsConsoleMaximized] = useState(false);
  const [stdin, setStdin] = useState('');
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);

  const session = useRoomSession({ roomId, user });
  const panels = useResizablePanels();

  const { handleEditorMount } = useEditorBinding({
    socketRef: session.socketRef,
    ydocRef: session.ydocRef,
    roomId,
    user,
    isFocusMode,
    onLocalEdit: () => session.markEdited(user?.name),
  });

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  if (!user) return null;

  const sidebarOffset = !isFocusMode && !isMobile ? panels.sidebarWidth : 0;

  const handleLeave = () => {
    setLeaveOpen(false);
    navigate('/dashboard');
  };

  const handleLogout = async () => {
    setLogoutOpen(false);
    await logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-[#0B0E14] text-gray-200 overflow-hidden font-sans">
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <WorkspaceSidebar
        roomId={roomId}
        users={session.users}
        currentUserId={user.id}
        typingUsers={session.typingUsers}
        isMobile={isMobile}
        isOpen={isSidebarOpen}
        isFocusMode={isFocusMode}
        width={panels.sidebarWidth}
        onClose={() => setIsSidebarOpen(false)}
        onRequestReview={session.requestReview}
        isReviewing={session.isReviewing}
        onLeave={() => setLeaveOpen(true)}
        onLogout={() => setLogoutOpen(true)}
        onStartResize={panels.startResizingSidebar}
      />

      <main className="flex-1 flex flex-col relative w-full md:w-auto overflow-hidden">
        <WorkspaceHeader
          language={session.language}
          onLanguageChange={session.changeLanguage}
          typingUsers={session.typingUsers}
          lastModified={session.lastModified}
          currentUserName={user.name}
          connected={session.connected}
          isExecuting={session.isExecuting}
          isConsoleOpen={isConsoleOpen}
          isFocusMode={isFocusMode}
          onToggleConsole={() => setIsConsoleOpen((v) => !v)}
          onToggleFocus={() => setIsFocusMode((v) => !v)}
          onRun={() => session.executeCode(stdin)}
          onOpenSidebar={() => setIsSidebarOpen(true)}
        />

        <div className="flex-1 flex flex-col min-h-0">
          <div className={clsx('flex-1 relative min-h-0', isConsoleMaximized && 'hidden')}>
            <Editor
              height="100%"
              language={monacoLangFor(session.language)}
              theme="vs-dark"
              onMount={handleEditorMount}
              options={{
                minimap: { enabled: false },
                fontSize: 15,
                fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                padding: { top: 20 },
                smoothScrolling: true,
                cursorBlinking: 'smooth',
                cursorSmoothCaretAnimation: 'on',
              }}
              loading={
                <div className="flex h-full items-center justify-center text-indigo-400">
                  <Loader2 className="w-8 h-8 animate-spin" />
                </div>
              }
            />
          </div>

          {!isFocusMode && isConsoleOpen && (
            <ConsolePanel
              stdin={stdin}
              onStdinChange={setStdin}
              output={session.output}
              isExecuting={session.isExecuting}
              isMobile={isMobile}
              consoleHeight={panels.consoleHeight}
              inputWidth={panels.inputWidth}
              isMaximized={isConsoleMaximized}
              onToggleMaximize={() => setIsConsoleMaximized((v) => !v)}
              onClose={() => {
                setIsConsoleOpen(false);
                setIsConsoleMaximized(false);
              }}
              onStartResizeConsole={panels.startResizingConsole}
              onStartResizeInput={(e) => panels.startResizingInput(e, sidebarOffset)}
            />
          )}
        </div>
      </main>

      <AiReviewModal
        open={session.reviewModalOpen}
        message={session.reviewMessage}
        onClose={() => session.setReviewModalOpen(false)}
      />

      <ConfirmModal
        open={leaveOpen}
        onClose={() => setLeaveOpen(false)}
        onConfirm={handleLeave}
        title="Leave Room?"
        message="Are you sure you want to leave this session?"
        confirmLabel="Leave Room"
        cancelLabel="Stay"
        icon={<AlertTriangle className="w-5 h-5" />}
      />

      <ConfirmModal
        open={logoutOpen}
        onClose={() => setLogoutOpen(false)}
        onConfirm={handleLogout}
        title="Logout?"
        message="Are you sure you want to log out of your account?"
        confirmLabel="Logout"
        cancelLabel="Cancel"
        icon={<LogOut className="w-5 h-5" />}
      />
    </div>
  );
}
