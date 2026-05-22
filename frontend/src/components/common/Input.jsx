import React from 'react';

export default function Input({
  label,
  error,
  type = 'text',
  value,
  onChange,
  placeholder,
  name,
  className = '',
  required = false
}) {
  const inputId = `input-${name || Math.random().toString(36).substr(2, 9)}`;
  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-gray-300">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <div className="relative">
        <input
          id={inputId}
          type={type}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          className={`block w-full rounded-lg bg-gray-900 border px-3.5 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors duration-150 ${
            error
              ? 'border-red-500/80 focus:ring-red-500/50 focus:border-red-500'
              : 'border-gray-800 focus:border-indigo-500'
          }`}
        />
      </div>
      {error && (
        <p className="text-xs font-medium text-red-400 mt-1 pl-1">
          {error}
        </p>
      )}
    </div>
  );
}
