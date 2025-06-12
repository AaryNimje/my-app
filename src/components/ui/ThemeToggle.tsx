'use client';

import { useTheme } from '@/lib/ThemeContext';
import { Button } from '@/components/ui/button';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  
  return (
    <Button
      variant="outline"
      size="icon"
      onClick={toggleTheme}
      aria-label="Toggle theme"
      className="rounded-full w-8 h-8"
    >
      {theme === 'dark' ? '☀️' : '🌙'}
    </Button>
  );
}