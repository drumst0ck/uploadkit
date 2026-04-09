'use client';

import * as React from 'react';
import { Sun, Moon } from 'lucide-react';
import { Button } from '@uploadkit/ui';
import { Tooltip, TooltipContent, TooltipTrigger } from '@uploadkit/ui';

export function ThemeToggle() {
  const [isDark, setIsDark] = React.useState(true);

  const toggle = () => {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle('dark', next);
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          onClick={toggle}
          className="h-8 w-8 text-zinc-400 hover:text-zinc-200"
          aria-label="Toggle theme"
        >
          {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
      </TooltipTrigger>
      <TooltipContent>Toggle theme</TooltipContent>
    </Tooltip>
  );
}
