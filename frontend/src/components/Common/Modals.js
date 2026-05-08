import { useState, useEffect } from "react";

/**
 * Reusable Confirmation Modal
 */
export function ConfirmModal({ isOpen, title, message, onConfirm, onCancel, confirmText = "Confirm", cancelText = "Cancel", type = "danger" }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
       <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm p-8 text-center transform animate-in zoom-in-95 duration-200">
          <div className={`w-16 h-16 rounded-full mx-auto flex items-center justify-center mb-6 ${type === 'danger' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
             <span className="text-3xl">{type === 'danger' ? '⚠️' : 'ℹ️'}</span>
          </div>
          <h3 className="text-xl font-bold mb-2 text-gray-800 dark:text-white">{title}</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-8 text-sm">{message}</p>
          <div className="flex gap-4">
             <button onClick={onCancel} className="flex-1 py-3 px-4 rounded-xl font-bold text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition">
                {cancelText}
             </button>
             <button onClick={onConfirm} className={`flex-1 py-3 px-4 rounded-xl font-bold text-white transition shadow-lg ${type === 'danger' ? 'bg-red-600 hover:bg-red-700 shadow-red-500/20' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/20'}`}>
                {confirmText}
             </button>
          </div>
       </div>
    </div>
  );
}

/**
 * Reusable Prompt Modal for text input
 */
export function PromptModal({ isOpen, title, message, onConfirm, onCancel, placeholder = "Enter details...", initialValue = "" }) {
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    if (isOpen) setValue(initialValue);
  }, [isOpen, initialValue]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
       <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md p-8 transform animate-in zoom-in-95 duration-200">
          <h3 className="text-xl font-bold mb-2 text-gray-800 dark:text-white">{title}</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6 text-sm">{message}</p>
          <textarea 
            className="w-full border-2 dark:border-gray-700 p-4 rounded-xl focus:ring-blue-400 focus:border-blue-400 focus:outline-none mb-6 bg-white dark:bg-gray-900 dark:text-white min-h-[100px] resize-none"
            placeholder={placeholder}
            value={value}
            onChange={e => setValue(e.target.value)}
            autoFocus
          />
          <div className="flex gap-4">
             <button onClick={onCancel} className="flex-1 py-3 px-4 rounded-xl font-bold text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition">
                Cancel
             </button>
             <button onClick={() => onConfirm(value)} className="flex-1 py-3 px-4 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 transition shadow-lg shadow-blue-500/20">
                Submit
             </button>
          </div>
       </div>
    </div>
  );
}
