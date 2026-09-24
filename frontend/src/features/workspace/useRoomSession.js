import { useCallback, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import * as Y from 'yjs';
import { useNavigate } from 'react-router-dom';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || '';
const DEFAULT_LANGUAGE = 'cpp';

export function useRoomSession({ roomId, user }) {
  const navigate = useNavigate();

  const socketRef = useRef(null);
  const ydocRef = useRef(null);
  const typingTimeoutsRef = useRef({});

  const [connected, setConnected] = useState(false);
  const [users, setUsers] = useState([]);
  const [typingUsers, setTypingUsers] = useState({});
  const [language, setLanguage] = useState(DEFAULT_LANGUAGE);
  const [lastModified, setLastModified] = useState({ by: null, at: null });
  const [output, setOutput] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);
  const [isReviewing, setIsReviewing] = useState(false);
  const [reviewMessage, setReviewMessage] = useState('');
  const [reviewModalOpen, setReviewModalOpen] = useState(false);

  // user comes from AuthContext as an object. Depending on the whole object
  // would reconnect the socket every time the context re-renders.
  const userId = user?.id;

  useEffect(() => {
    const socket = io(BACKEND_URL, { autoConnect: false, withCredentials: true });
    socketRef.current = socket;
    ydocRef.current = new Y.Doc();

    socket.connect();

    socket.on('connect', () => {
      setConnected(true);
      socket.emit('join', { roomId });
    });

    socket.on('disconnect', () => setConnected(false));
    socket.on('connect_error', () => setConnected(false));

    socket.on('roomError', ({ message }) => {
      setOutput(message || 'Room not found');
      navigate('/dashboard');
    });

    socket.on('socketValidationError', ({ message }) => {
      setOutput(message || 'Invalid collaboration event');
    });

    socket.on('userJoined', (list) => setUsers(list));

    socket.on('yjs-sync', (state) => {
      Y.applyUpdate(ydocRef.current, new Uint8Array(state), 'remote');
    });

    socket.on('yjs-update', ({ update }) => {
      Y.applyUpdate(ydocRef.current, new Uint8Array(update), 'remote');
    });

    socket.on('codeUpdate', (data) => {
      if (data.lastModifiedBy && data.lastModifiedAt) {
        setLastModified({ by: data.lastModifiedBy, at: data.lastModifiedAt });
      }
    });

    socket.on('languageUpdate', setLanguage);

    socket.on('userTyping', ({ userName, userId: id }) => {
      setTypingUsers((prev) => ({ ...prev, [id]: userName }));
      clearTimeout(typingTimeoutsRef.current[id]);
      typingTimeoutsRef.current[id] = setTimeout(() => {
        setTypingUsers((prev) => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
      }, 2000);
    });

    socket.on('codeResponse', ({ run }) => {
      setOutput(run.output);
      setIsExecuting(false);
    });

    socket.on('AIReview', (message) => {
      setReviewMessage(message);
      setIsReviewing(false);
      setReviewModalOpen(true);
    });

    return () => {
      socket.emit('leaveRoom');
      socket.off();
      socket.disconnect();
      socketRef.current = null;
      // The Y.Doc is intentionally not destroyed here. Its Monaco binding
      // observes it, and React runs this cleanup before the editor hook's
      // cleanup. Nulling the ref lets GC collect both once the binding is gone.
      ydocRef.current = null;
      Object.values(typingTimeoutsRef.current).forEach(clearTimeout);
      typingTimeoutsRef.current = {};
    };
  }, [roomId, userId, navigate]);

  const executeCode = useCallback((stdin) => {
    setIsExecuting(true);
    setOutput('Executing...');
    socketRef.current?.emit('compileCode', { roomId, stdin });
  }, [roomId]);

  const requestReview = useCallback(() => {
    setIsReviewing(true);
    socketRef.current?.emit('getAIReview', { roomId });
  }, [roomId]);

  const changeLanguage = useCallback((next) => {
    setLanguage(next);
    socketRef.current?.emit('languageChange', { roomId, language: next });
  }, [roomId]);

  // Optimistic update so the "Modified by" badge flips immediately on the
  // sender's screen. The server broadcasts the same info to everyone else.
  const markEdited = useCallback((name) => {
    if (!name) return;
    setLastModified({ by: name, at: new Date().toISOString() });
  }, []);

  return {
    socketRef,
    ydocRef,
    connected,
    users,
    typingUsers,
    language,
    lastModified,
    output,
    isExecuting,
    isReviewing,
    reviewMessage,
    reviewModalOpen,
    setReviewModalOpen,
    executeCode,
    requestReview,
    changeLanguage,
    markEdited,
  };
}
