import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', error, ...props }, ref) => {
    return (
      <div className="w-full">
        <input
          ref={ref}
          className={`flex h-10 w-full rounded-lg border bg-surface px-3 py-2 text-sm text-foreground transition-colors placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50 ${
            error 
              ? 'border-danger focus-visible:border-danger focus-visible:ring-danger/20' 
              : 'border-border focus-visible:border-primary hover:border-slate-400'
          } ${className}`}
          {...props}
        />
        {error && <p className="mt-1 text-xs font-medium text-danger">{error}</p>}
      </div>
    );
  }
);
Input.displayName = 'Input';
