import React, { useEffect } from 'react';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';

export default function Toast({ message, type = 'success', onClose, duration = 4000 }) {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => {
      onClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [message, duration, onClose]);

  if (!message) return null;

  const getStyleClasses = () => {
    switch (type) {
      case 'success':
        return 'bg-slate-900 border-emerald-500/40 text-emerald-400 shadow-emerald-950/20';
      case 'error':
        return 'bg-slate-900 border-red-500/40 text-red-400 shadow-red-950/20';
      case 'info':
      default:
        return 'bg-slate-900 border-gold/40 text-gold shadow-gold-hover/10';
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />;
      case 'info':
      default:
        return <Info className="w-5 h-5 text-gold flex-shrink-0" />;
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-slide-in select-none">
      <div className={`flex items-center space-x-3 px-4 py-3 rounded-xl border shadow-xl max-w-sm backdrop-blur-md transition-all ${getStyleClasses()}`}>
        {getIcon()}
        <div className="text-xs font-semibold tracking-wide pr-4 flex-1 break-words">{message}</div>
        <button 
          onClick={onClose}
          className="text-slate-400 hover:text-slate-200 transition-colors p-1 rounded-md hover:bg-slate-800/50 cursor-pointer"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
