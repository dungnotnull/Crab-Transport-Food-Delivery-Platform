import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  glass?: boolean;
}

export const Card: React.FC<CardProps> = ({ children, className, glass = false, ...props }) => {
  return (
    <div
      className={twMerge(
        clsx(
          'rounded-2xl p-5 transition-all duration-200',
          glass
            ? 'glass-card'
            : 'bg-white border border-slate-100 shadow-sm hover:shadow-md',
          className
        )
      )}
      {...props}
    >
      {children}
    </div>
  );
};
