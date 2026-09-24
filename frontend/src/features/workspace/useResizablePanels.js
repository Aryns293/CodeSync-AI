import { useCallback, useEffect, useRef, useState } from 'react';

export function useResizablePanels() {
  const [sidebarWidth, setSidebarWidth] = useState(256);
  const [consoleHeight, setConsoleHeight] = useState(256);
  const [inputWidth, setInputWidth] = useState(50);
  const activeDragRef = useRef(null);

  const beginDrag = (cursor, onMove) => {
    const onMouseMove = (e) => onMove(e);
    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      document.body.style.cursor = 'default';
      activeDragRef.current = null;
    };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    document.body.style.cursor = cursor;
    activeDragRef.current = { onMouseMove, onMouseUp };
  };

  const startResizingSidebar = useCallback((e) => {
    e.preventDefault();
    beginDrag('col-resize', (ev) => {
      setSidebarWidth(Math.min(Math.max(200, ev.clientX), 600));
    });
  }, []);

  const startResizingConsole = useCallback((e) => {
    e.preventDefault();
    beginDrag('row-resize', (ev) => {
      const h = Math.min(
        Math.max(100, window.innerHeight - ev.clientY),
        window.innerHeight - 100
      );
      setConsoleHeight(h);
    });
  }, []);

  const startResizingInput = useCallback((e, sidebarOffset) => {
    e.preventDefault();
    const containerWidth = window.innerWidth - sidebarOffset;
    beginDrag('col-resize', (ev) => {
      const relX = ev.clientX - sidebarOffset;
      setInputWidth(Math.min(Math.max(20, (relX / containerWidth) * 100), 80));
    });
  }, []);

  // Drop listeners if the component unmounts mid-drag.
  useEffect(() => {
    return () => {
      if (activeDragRef.current) {
        document.removeEventListener('mousemove', activeDragRef.current.onMouseMove);
        document.removeEventListener('mouseup', activeDragRef.current.onMouseUp);
        document.body.style.cursor = 'default';
      }
    };
  }, []);

  return {
    sidebarWidth,
    consoleHeight,
    inputWidth,
    startResizingSidebar,
    startResizingConsole,
    startResizingInput,
  };
}
