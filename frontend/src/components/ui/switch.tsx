'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface SwitchProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  label?: string;
}

export function Switch({
  className,
  checked = false,
  onCheckedChange,
  label,
  ...props
}: SwitchProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (onCheckedChange) {
      onCheckedChange(e.target.checked);
    }
  };

  return (
    <div className={cn("flex items-center space-x-2", className)}>
      <label className="relative inline-flex items-center cursor-pointer">
        <input
          type="checkbox"
          className="sr-only peer"
          checked={checked}
          onChange={handleChange}
          {...props}
        />
        <div className={cn(
          "w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300",
          "dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700",
          "peer-checked:after:translate-x-full peer-checked:after:border-white after:content-['']",
          "after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300",
          "after:border after:rounded-full after:h-5 after:w-5 after:transition-all",
          "dark:border-gray-600 peer-checked:bg-blue-600"
        )}></div>
      </label>
      {label && (
        <span className="text-sm font-medium">
          {label}
        </span>
      )}
    </div>
  );
}