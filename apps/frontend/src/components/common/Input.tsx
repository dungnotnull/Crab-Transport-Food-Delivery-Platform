import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  helperText,
  leftIcon,
  rightIcon,
  className,
  id,
  'aria-describedby': ariaDescribedBy,
  'aria-invalid': ariaInvalid,
  ...props
}) => {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);
  const feedbackId = inputId ? `${inputId}-feedback` : undefined;

  return (
    <div className="w-full flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-xs font-bold text-slate-700 uppercase tracking-wider">
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        {leftIcon && (
          <div className="absolute left-3.5 text-slate-400 pointer-events-none flex items-center">
            {leftIcon}
          </div>
        )}
        <input
          id={inputId}
          aria-invalid={error ? true : ariaInvalid}
          aria-describedby={feedbackId || ariaDescribedBy}
          className={twMerge(
            clsx(
              'w-full bg-slate-50 hover:bg-white focus:bg-white text-slate-900 border-2 rounded-xl text-sm transition-[background-color,border-color,box-shadow] duration-200 focus-visible:outline-none focus:ring-4 placeholder:text-slate-400',
              leftIcon ? 'pl-10' : 'pl-3.5',
              rightIcon ? 'pr-10' : 'pr-3.5',
              'py-2.5',
              error
                ? 'border-red-400 focus:border-red-500 focus:ring-red-100'
                : 'border-slate-200 focus:border-[#00B14F] focus:ring-[#00B14F]/15',
              className
            )
          )}
          {...props}
        />
        {rightIcon && (
          <div className="absolute right-3.5 text-slate-400 flex items-center">
            {rightIcon}
          </div>
        )}
      </div>
      {error && <span id={feedbackId} className="text-xs font-semibold text-red-500">{error}</span>}
      {helperText && !error && <span id={feedbackId} className="text-xs text-slate-500">{helperText}</span>}
    </div>
  );
};
