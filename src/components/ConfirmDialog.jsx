import React from 'react';
import { useFocusTrap } from '../hooks/useFocusTrap';

const ConfirmDialog = ({ message, onConfirm, onCancel, confirmText = 'Confirm', cancelText = 'Cancel', danger = false }) => {
  const dialogRef = useFocusTrap(true);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-message"
        className="bg-white rounded-lg shadow-xl max-w-sm w-full p-6 animate-slide-in"
      >
        <p id="confirm-dialog-message" className="text-gray-700 mb-6">{message}</p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="btn btn-secondary px-4 py-2"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 rounded-lg font-medium text-white ${danger ? 'bg-red-500 hover:bg-red-600' : 'btn btn-primary'}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
