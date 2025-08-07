import React from 'react';
import { AlertCircle, CheckCircle } from 'lucide-react';

interface FormFieldProps {
  label: string;
  name: string;
  type?: 'text' | 'email' | 'password' | 'tel' | 'url' | 'number' | 'textarea';
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  placeholder?: string;
  required?: boolean;
  error?: string;
  success?: string;
  disabled?: boolean;
  className?: string;
  rows?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  autoComplete?: string;
}

const FormField: React.FC<FormFieldProps> = ({
  label,
  name,
  type = 'text',
  value,
  onChange,
  placeholder,
  required = false,
  error,
  success,
  disabled = false,
  className = '',
  rows = 3,
  minLength,
  maxLength,
  pattern,
  autoComplete
}) => {
  const inputId = `field-${name}`;
  const errorId = `${inputId}-error`;
  const successId = `${inputId}-success`;

  const baseInputClasses = `
    w-full px-3 py-2 sm:px-4 sm:py-3 border rounded-lg sm:rounded-xl 
    text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent 
    transition-all duration-200 bg-white/70 backdrop-blur-sm text-sm sm:text-base
    disabled:opacity-50 disabled:cursor-not-allowed
  `;

  const inputClasses = `
    ${baseInputClasses}
    ${error ? 'border-red-300 focus:ring-red-500' : success ? 'border-green-300 focus:ring-green-500' : 'border-gray-300'}
    ${className}
  `;

  const renderInput = () => {
    if (type === 'textarea') {
      return (
        <textarea
          id={inputId}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          className={inputClasses}
          rows={rows}
          minLength={minLength}
          maxLength={maxLength}
          aria-describedby={error ? errorId : success ? successId : undefined}
          aria-invalid={!!error}
        />
      );
    }

    return (
      <input
        id={inputId}
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        className={inputClasses}
        minLength={minLength}
        maxLength={maxLength}
        pattern={pattern}
        autoComplete={autoComplete}
        aria-describedby={error ? errorId : success ? successId : undefined}
        aria-invalid={!!error}
      />
    );
  };

  return (
    <div className="space-y-1 sm:space-y-2">
      <label 
        htmlFor={inputId} 
        className="block text-sm font-semibold text-gray-700"
      >
        {label} 
        {required && <span className="text-red-500 ml-1" aria-label="required">*</span>}
      </label>
      
      <div className="relative">
        {renderInput()}
        
        {/* Status Icons */}
        {error && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <AlertCircle className="h-5 w-5 text-red-500" aria-hidden="true" />
          </div>
        )}
        {success && !error && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <CheckCircle className="h-5 w-5 text-green-500" aria-hidden="true" />
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <p id={errorId} className="text-red-500 text-xs sm:text-sm mt-1 flex items-center gap-1">
          <AlertCircle className="h-3 w-3 flex-shrink-0" />
          {error}
        </p>
      )}

      {/* Success Message */}
      {success && !error && (
        <p id={successId} className="text-green-500 text-xs sm:text-sm mt-1 flex items-center gap-1">
          <CheckCircle className="h-3 w-3 flex-shrink-0" />
          {success}
        </p>
      )}

      {/* Character Count */}
      {maxLength && (
        <p className="text-xs text-gray-500 mt-1 text-right">
          {value.length}/{maxLength}
        </p>
      )}
    </div>
  );
};

export default FormField;
