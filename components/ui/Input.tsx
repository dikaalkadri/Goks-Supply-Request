import { InputHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils/cn';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-semibold text-gray-700 mb-1.5">
            {label}
            {props.required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            'w-full px-4 py-3 rounded-xl border text-sm transition-all duration-200',
            'placeholder:text-gray-400 bg-white',
            'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent',
            error
              ? 'border-red-400 bg-red-50 focus:ring-red-400'
              : 'border-gray-200 hover:border-gray-300',
            className
          )}
          {...props}
        />
        {error && <p className="mt-1.5 text-xs text-red-600 font-medium">{error}</p>}
        {hint && !error && <p className="mt-1.5 text-xs text-gray-500">{hint}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
export default Input;
