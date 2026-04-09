import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, X } from 'lucide-react';

const Toast = ({ message, type = 'success', onClose, duration = 3000 }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [onClose, duration]);

  const styles = type === 'success'
    ? 'bg-success-50 border-success-200 text-success-800'
    : 'bg-danger-50 border-danger-200 text-danger-800';

  const Icon = type === 'success' ? CheckCircle2 : AlertCircle;

  return (
    <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg border shadow-lg ${styles}`} role="status" aria-live="polite">
      <Icon className="w-4 h-4 flex-shrink-0" />
      <span className="text-sm">{message}</span>
      <button onClick={onClose} className="ml-2 p-0.5 hover:opacity-70" aria-label="Dismiss">
        <X className="w-3 h-3" />
      </button>
    </div>
  );
};

export default Toast;
