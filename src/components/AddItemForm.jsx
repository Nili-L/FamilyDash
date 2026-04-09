import React from 'react';
import { X } from 'lucide-react';
import { useFocusTrap } from '../hooks/useFocusTrap';

const AddItemForm = ({
  isOpen,
  onClose,
  onSubmit,
  title,
  fields,
  submitText = 'Add',
  cancelText = 'Cancel'
}) => {
  const dialogRef = useFocusTrap(isOpen);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = {};
    
    fields.forEach(field => {
      data[field.name] = formData.get(field.name);
    });
    
    onSubmit(data);
  };
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="additem-dialog-title"
        className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto animate-slide-in"
      >
        <div className="flex items-center justify-between p-4 border-b">
          <h3 id="additem-dialog-title" className="text-xl font-semibold">{title}</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-4">
          <div className="space-y-4">
            {fields.map((field) => (
              <div key={field.name}>
                <label htmlFor={field.name} className="label">
                  {field.label}
                  {field.required && <span className="text-danger-500 ml-1">*</span>}
                </label>
                
                {field.type === 'select' ? (
                  <select
                    id={field.name}
                    name={field.name}
                    className="input"
                    required={field.required}
                    defaultValue={field.defaultValue || ''}
                  >
                    <option value="">Select {field.label}</option>
                    {field.options.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                ) : field.type === 'textarea' ? (
                  <textarea
                    id={field.name}
                    name={field.name}
                    className="input"
                    rows={field.rows || 3}
                    placeholder={field.placeholder}
                    required={field.required}
                    defaultValue={field.defaultValue || ''}
                  />
                ) : field.type === 'color' ? (
                  <div className="flex gap-2">
                    <input
                      type="color"
                      id={field.name}
                      name={field.name}
                      className="h-10 w-20"
                      required={field.required}
                      defaultValue={field.defaultValue || '#3b82f6'}
                    />
                    <div className="flex-1 flex gap-1">
                      {field.presetColors?.map(color => (
                        <button
                          key={color}
                          type="button"
                          onClick={(e) => {
                            const input = e.target.form[field.name];
                            input.value = color;
                          }}
                          className="w-8 h-8 rounded border-2 border-gray-300 hover:border-gray-400"
                          style={{ backgroundColor: color }}
                          aria-label={`Select color ${color}`}
                        />
                      ))}
                    </div>
                  </div>
                ) : (
                  <input
                    type={field.type || 'text'}
                    id={field.name}
                    name={field.name}
                    className="input"
                    placeholder={field.placeholder}
                    required={field.required}
                    defaultValue={field.defaultValue || ''}
                    min={field.min}
                    max={field.max}
                    step={field.step}
                  />
                )}
                
                {field.error && (
                  <p className="text-danger-500 text-sm mt-1">{field.error}</p>
                )}
                {field.helpText && (
                  <p className="text-gray-500 text-sm mt-1">{field.helpText}</p>
                )}
              </div>
            ))}
          </div>
          
          <div className="flex gap-3 mt-6">
            <button
              type="submit"
              className="btn btn-primary px-4 py-2 flex-1"
            >
              {submitText}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary px-4 py-2 flex-1"
            >
              {cancelText}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddItemForm;