import React from 'react';
import { useToastStore } from '../../store/toastStore';
import type { ToastMessage } from '../../store/toastStore';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const ToastItem: React.FC<{ toast: ToastMessage }> = ({ toast }) => {
  const { removeToast } = useToastStore();

  const getIcon = () => {
    switch (toast.type) {
      case 'success': return <CheckCircle className="text-emerald-400" size={20} />;
      case 'error': return <AlertCircle className="text-red-400" size={20} />;
      case 'info': return <Info className="text-blue-400" size={20} />;
    }
  };

  const getBgClass = () => {
    switch (toast.type) {
      case 'success': return 'bg-emerald-500/10 border-emerald-500/30';
      case 'error': return 'bg-red-500/10 border-red-500/30';
      case 'info': return 'bg-blue-500/10 border-blue-500/30';
    }
  };

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, x: 50, scale: 0.9 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className={`flex items-center gap-3 p-4 rounded-xl border shadow-lg backdrop-blur-md ${getBgClass()} max-w-sm w-full pointer-events-auto`}
    >
      {getIcon()}
      <p className="text-white text-sm flex-1 font-medium">{toast.message}</p>
      <button 
        onClick={() => removeToast(toast.id)}
        className="text-gray-400 hover:text-white transition-colors"
      >
        <X size={16} />
      </button>
    </motion.div>
  );
};

export const ToastContainer: React.FC = () => {
  const { toasts } = useToastStore();

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-3 pointer-events-none">
      <AnimatePresence>
        {toasts.map(toast => (
          <ToastItem key={toast.id} toast={toast} />
        ))}
      </AnimatePresence>
    </div>
  );
};
