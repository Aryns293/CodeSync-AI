import { ChevronDown, ChevronUp, X, Loader2 } from 'lucide-react';
import clsx from 'clsx';

export function ConsolePanel({
  stdin,
  onStdinChange,
  output,
  isExecuting,
  isMobile,
  consoleHeight,
  inputWidth,
  isMaximized,
  onToggleMaximize,
  onClose,
  onStartResizeConsole,
  onStartResizeInput,
}) {
  return (
    <div
      className={clsx(
        'relative border-t border-[#232B3A] flex flex-col md:flex-row bg-[#0B0E14] shrink-0 transition-all duration-300',
        isMaximized && 'flex-1'
      )}
      style={{ height: isMaximized ? 'auto' : isMobile ? 'auto' : consoleHeight }}
    >
      {!isMobile && !isMaximized && (
        <div
          onMouseDown={onStartResizeConsole}
          className="group absolute top-0 left-0 w-full h-1.5 cursor-row-resize hover:bg-indigo-500 z-50 flex items-center justify-center -translate-y-1/2"
        >
          <div className="flex flex-col gap-[2px] opacity-0 group-hover:opacity-100 transition-opacity bg-[#0B0E14] py-0.5 rounded px-1">
            <div className="w-4 h-[1px] bg-gray-400" />
            <div className="w-4 h-[1px] bg-gray-400" />
          </div>
        </div>
      )}

      <div
        className="flex flex-col border-b md:border-b-0 md:border-r border-[#232B3A] shrink-0"
        style={{
          width: isMobile ? '100%' : `${inputWidth}%`,
          height: isMobile ? 128 : '100%',
        }}
      >
        <div className="h-8 bg-[#151A23] border-b border-[#232B3A] flex items-center px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider shrink-0">
          Standard Input
        </div>
        <textarea
          value={stdin}
          onChange={(e) => onStdinChange(e.target.value)}
          placeholder="Enter input here..."
          className="flex-1 bg-transparent p-3 md:p-4 text-xs md:text-sm font-mono focus:outline-none resize-none text-gray-300 custom-scrollbar"
        />
      </div>

      {!isMobile && (
        <div
          onMouseDown={onStartResizeInput}
          className="group absolute top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-indigo-500 z-50 flex items-center justify-center -translate-x-1/2"
          style={{ left: `${inputWidth}%` }}
        >
          <div className="flex gap-[2px] opacity-0 group-hover:opacity-100 transition-opacity bg-[#0B0E14] px-0.5 rounded py-1">
            <div className="w-[1px] h-4 bg-gray-400" />
            <div className="w-[1px] h-4 bg-gray-400" />
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col relative min-w-0 h-40 md:h-auto">
        <div className="h-8 bg-[#151A23] border-b border-[#232B3A] flex items-center justify-between px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider shrink-0">
          <span>Output Console</span>
          <div className="flex items-center gap-1">
            <button
              onClick={onToggleMaximize}
              className="p-1 hover:bg-white/10 rounded transition-colors text-gray-400 hover:text-white"
              title={isMaximized ? 'Restore Console' : 'Maximize Console'}
            >
              {isMaximized ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronUp className="w-4 h-4" />
              )}
            </button>
            <button
              onClick={onClose}
              className="p-1 hover:bg-white/10 rounded transition-colors text-gray-400 hover:text-white"
              title="Close Console"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
        <pre className="flex-1 p-3 md:p-4 text-xs md:text-sm font-mono overflow-auto text-gray-300 whitespace-pre-wrap custom-scrollbar">
          {output || 'Code execution output will appear here...'}
        </pre>
        {isExecuting && (
          <div className="absolute inset-0 bg-[#0B0E14]/50 backdrop-blur-sm flex items-center justify-center z-10">
            <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
          </div>
        )}
      </div>
    </div>
  );
}
