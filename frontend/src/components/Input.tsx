import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  id: string;
}

export function Input({ label, error, id, className = '', ...props }: InputProps) {
  return (
    <div className="form-control w-full">
      <label className="label" htmlFor={id}>
        <span className="label-text font-semibold">{label}</span>
      </label>
      <input
        id={id}
        className={`input input-bordered w-full ${error ? 'input-error' : ''} ${className}`}
        aria-describedby={error ? `${id}-error` : undefined}
        aria-invalid={!!error}
        {...props}
      />
      <div className="label py-0.5 min-h-[1.25rem]">
        <span
          id={`${id}-error`}
          className={`label-text-alt text-error transition-opacity ${error ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
          role="alert"
          aria-hidden={!error}
        >
          {error ?? ' '}
        </span>
      </div>
    </div>
  );
}
