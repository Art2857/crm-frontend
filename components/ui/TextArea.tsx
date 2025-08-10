import React, { forwardRef } from 'react';

export interface TextAreaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  id: string;
  label?: string;
  error?: string;
  fullWidth?: boolean;
  className?: string;
}

const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
  ({ id, label, error, fullWidth = false, className = '', ...props }, ref) => {
    const baseClasses =
      'px-4 py-3 bg-gray-50 border-0 rounded-lg focus:bg-white focus:ring-2 focus:ring-primary-500 transition-all duration-200 placeholder-gray-400 resize-none';
    const errorClasses = error
      ? 'bg-red-50 focus:bg-red-50 focus:ring-red-500 text-red-900 placeholder-red-400'
      : '';
    const widthClass = fullWidth ? 'w-full' : '';
    const textareaClasses = `${baseClasses} ${errorClasses} ${widthClass} ${className}`;

    return (
      <div className={fullWidth ? 'w-full' : ''}>
        {label && (
          <label
            htmlFor={id}
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            {label}
          </label>
        )}
        <textarea id={id} ref={ref} className={textareaClasses} {...props} />
        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      </div>
    );
  }
);

TextArea.displayName = 'TextArea';

export default TextArea;
