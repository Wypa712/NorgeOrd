import React from 'react';

interface SelectFieldProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  id: string;
  label: string;
  error?: string;
  children: React.ReactNode;
}

export function SelectField({ id, label, error, children, className = '', ...props }: SelectFieldProps) {
  return (
    <div className="form-control w-full">
      <label className="label" htmlFor={id}>
        <span className="label-text font-semibold">{label}</span>
      </label>
      <select
        id={id}
        className={`select select-bordered w-full ${error ? 'select-error' : ''} ${className}`}
        aria-describedby={error ? `${id}-error` : undefined}
        aria-invalid={!!error}
        {...props}
      >
        {children}
      </select>
      {error && (
        <div className="label">
          <span
            id={`${id}-error`}
            className="label-text-alt text-error"
            role="alert"
          >
            {error}
          </span>
        </div>
      )}
    </div>
  );
}
