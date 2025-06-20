'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface SelectOption {
  label: string;
  value: string;
}

interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> {
  options: SelectOption[];
  onChange?: (value: string) => void;
  placeholder?: string;
}

export function Select({ 
  className, 
  options, 
  onChange, 
  placeholder = "Select an option",
  ...props 
}: SelectProps) {
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (onChange) {
      onChange(e.target.value);
    }
  };

  return (
    <select
      className={cn(
        "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      onChange={handleChange}
      {...props}
    >
      {placeholder && (
        <option value="" disabled>
          {placeholder}
        </option>
      )}
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

// For MultiSelect functionality (checkbox-based)
interface MultiSelectProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange'> {
  options: SelectOption[];
  value: string[];
  onChange?: (value: string[]) => void;
  label?: string;
}

export function MultiSelect({
  className,
  options,
  value = [],
  onChange,
  label,
  ...props
}: MultiSelectProps) {
  const handleOptionChange = (optionValue: string, checked: boolean) => {
    if (!onChange) return;
    
    if (checked) {
      onChange([...value, optionValue]);
    } else {
      onChange(value.filter(v => v !== optionValue));
    }
  };

  return (
    <div className={cn("space-y-2", className)} {...props}>
      {label && <div className="text-sm font-medium mb-1">{label}</div>}
      {options.map((option) => (
        <div key={option.value} className="flex items-center space-x-2">
          <input
            type="checkbox"
            id={`option-${option.value}`}
            checked={value.includes(option.value)}
            onChange={(e) => handleOptionChange(option.value, e.target.checked)}
            className="h-4 w-4 rounded border border-gray-300 text-primary focus:ring-primary dark:border-gray-600 dark:bg-gray-700"
          />
          <label 
            htmlFor={`option-${option.value}`}
            className="text-sm font-medium leading-none cursor-pointer"
          >
            {option.label}
          </label>
        </div>
      ))}
    </div>
  );
}

// 👉 Dummy exports for compatibility with shadcn-style imports
export const SelectTrigger = (props: React.HTMLAttributes<HTMLDivElement>) => (
  <div {...props} />
);
export const SelectValue = (props: React.HTMLAttributes<HTMLSpanElement>) => (
  <span {...props} />
);
export const SelectContent = (props: React.HTMLAttributes<HTMLDivElement>) => (
  <div {...props} />
);
export const SelectItem = (props: React.OptionHTMLAttributes<HTMLOptionElement>) => (
  <option {...props} />
);
