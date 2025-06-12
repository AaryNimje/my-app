'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface SliderProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value?: number;
  min?: number;
  max?: number;
  step?: number;
  onChange?: (value: number) => void;
  showValue?: boolean;
}

export function Slider({
  className,
  value = 0,
  min = 0,
  max = 100,
  step = 1,
  onChange,
  showValue = false,
  ...props
}: SliderProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (onChange) {
      onChange(Number(e.target.value));
    }
  };

  // Calculate fill percentage for styling
  const fillPercent = ((value - min) / (max - min)) * 100;

  return (
    <div className={cn("relative", className)}>
      {showValue && (
        <div className="flex justify-between mb-1">
          <span className="text-sm">{min}</span>
          <span className="text-sm font-medium">{value}</span>
          <span className="text-sm">{max}</span>
        </div>
      )}
      <div className="relative">
        <div 
          className="absolute h-2 bg-primary rounded-full" 
          style={{ width: `${fillPercent}%` }}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={handleChange}
          className={cn(
            "w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700",
            "focus:outline-none focus:ring-2 focus:ring-primary"
          )}
          {...props}
        />
      </div>
    </div>
  );
}