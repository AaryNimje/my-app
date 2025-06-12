'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export function Checkbox({ className, label, ...props }: CheckboxProps) {
  return (
    <div className="flex items-center space-x-2">
      <input
        type="checkbox"
        className={cn(
          "h-4 w-4 rounded border border-gray-300 text-primary focus:ring-primary dark:border-gray-600 dark:bg-gray-700",
          className
        )}
        {...props}
      />
      {label && (
        <label 
          htmlFor={props.id} 
          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
        >
          {label}
        </label>
      )}
    </div>
  );
}