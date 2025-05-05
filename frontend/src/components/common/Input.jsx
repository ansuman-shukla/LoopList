import React, { forwardRef } from 'react';

const Input = forwardRef(({ 
  label,
  id,
  type = 'text',
  placeholder = '',
  error = '',
  className = '',
  required = false,
  ...props 
}, ref) => {
  return (
    <div className="mb-4">
      {label && (
        <label 
          htmlFor={id} 
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
        >
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <input
        ref={ref}
        id={id}
        type={type}
        placeholder={placeholder}
        className={`input ${error ? 'border-red-500 focus:ring-red-500' : ''} ${className}`}
        aria-invalid={error ? 'true' : 'false'}
        {...props}
      />
      {error && (
        <p className="mt-1 text-sm text-red-600 dark:text-red-500">{error}</p>
      )}
    </div>
  );
});

Input.displayName = 'Input';

export default Input;
