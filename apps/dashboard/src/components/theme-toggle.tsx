'use client';

import * as React from 'react';
import { useTheme } from 'next-themes';
import { Sun, Moon } from 'lucide-react';
import { Button } from '@uploadkit/ui';
import { Tooltip, TooltipContent, TooltipTrigger } from '@uploadkit/ui';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  // Avoid hydration mismatch — only render icon after mount
  React.useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="h-8 w-8 text-zinc-400 hover:text-zinc-200"
          aria-label="Toggle theme"
        >
          {mounted ? (
            theme === 'dark' ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )
          ) : (
            <Moon className="h-4 w-4" />
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent>Toggle theme</TooltipContent>
    </Tooltip>
  );
}
