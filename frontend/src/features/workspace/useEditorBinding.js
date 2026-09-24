import { useCallback, useEffect, useRef } from 'react';
import { MonacoBinding } from 'y-monaco';

export function useEditorBinding({
  socketRef,
  ydocRef,
  roomId,
  user,
  isFocusMode,
  onLocalEdit,
}) {
  const editorRef = useRef(null);
  const monacoRef = useRef(null);
  const bindingRef = useRef(null);
  const decorationsRef = useRef(null);
  const remoteCursorsRef = useRef({});
  const disposeRef = useRef(null);

  const redrawCursors = useCallback(() => {
    if (!editorRef.current || !monacoRef.current) return;

    const items = isFocusMode
      ? []
      : Object.values(remoteCursorsRef.current).map(({ position, userName }) => ({
          range: new monacoRef.current.Range(
            position.lineNumber,
            position.column,
            position.lineNumber,
            position.column
          ),
          options: {
            className: 'remote-cursor',
            hoverMessage: { value: `**${userName}** is here` },
          },
        }));

    if (!decorationsRef.current?.set) {
      decorationsRef.current = editorRef.current.createDecorationsCollection();
    }
    decorationsRef.current.set(items);
  }, [isFocusMode]);

  useEffect(() => {
    redrawCursors();
  }, [redrawCursors]);

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;

    const onCursor = ({ userId, userName, position }) => {
      if (userId === user?.id) return;
      remoteCursorsRef.current[userId] = { position, userName };
      redrawCursors();
    };

    // When someone leaves, drop their cursor decoration.
    const onUsers = (list) => {
      const active = new Set(list.map((u) => u.id));
      let changed = false;
      for (const id of Object.keys(remoteCursorsRef.current)) {
        if (!active.has(id)) {
          delete remoteCursorsRef.current[id];
          changed = true;
        }
      }
      if (changed) redrawCursors();
    };

    socket.on('cursorUpdate', onCursor);
    socket.on('userJoined', onUsers);

    return () => {
      socket.off('cursorUpdate', onCursor);
      socket.off('userJoined', onUsers);
    };
  }, [socketRef, user?.id, redrawCursors]);

  const handleEditorMount = useCallback(
    (editor, monaco) => {
      editorRef.current = editor;
      monacoRef.current = monaco;

      const ydoc = ydocRef.current;
      if (!ydoc) return;

      bindingRef.current = new MonacoBinding(
        ydoc.getText('code'),
        editor.getModel(),
        new Set([editor])
      );

      const updateHandler = (update, origin) => {
        if (origin === 'remote') return;
        onLocalEdit?.();
        socketRef.current?.emit('yjs-update', {
          roomId,
          update,
          timestamp: new Date().toISOString(),
        });
        socketRef.current?.emit('typing', { roomId });
      };
      
      ydoc.on('update', updateHandler);

      const cursorDispose = editor.onDidChangeCursorPosition((e) => {
        socketRef.current?.emit('cursorChange', { roomId, position: e.position });
      });

      disposeRef.current = () => {
        ydoc.off('update', updateHandler);
        cursorDispose?.dispose?.();
        disposeRef.current = null;
      };
    },
    [ydocRef, socketRef, roomId, onLocalEdit]
  );

  useEffect(() => {
    return () => {
      disposeRef.current?.();
      bindingRef.current?.destroy();
      bindingRef.current = null;
    };
  }, []);

  return { handleEditorMount };
}
