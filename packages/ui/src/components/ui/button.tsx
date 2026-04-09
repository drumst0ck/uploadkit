'use client';
import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0a0b] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default:
          'bg-indigo-600 text-white shadow-md shadow-indigo-500/20 hover:bg-indigo-500 hover:shadow-lg hover:shadow-indigo-500/30 active:bg-indigo-700',
        destructive:
          'bg-red-600 text-white shadow-md shadow-red-500/20 hover:bg-red-500 hover:shadow-lg hover:shadow-red-500/30 active:bg-red-700',
        outline:
          'border border-white/[0.10] bg-white/[0.03] text-zinc-300 shadow-sm hover:bg-white/[0.06] hover:text-white hover:border-white/[0.15] active:bg-white/[0.08]',
        secondary:
          'bg-white/[0.06] text-zinc-300 hover:bg-white/[0.10] hover:text-white active:bg-white/[0.12]',
        ghost: 'text-zinc-400 hover:bg-white/[0.06] hover:text-zinc-200 active:bg-white/[0.08]',
        link: 'text-indigo-400 underline-offset-4 hover:underline hover:text-indigo-300',
      },
      size: {
        default: 'h-9 px-4 py-2',
        sm: 'h-8 rounded-lg px-3 text-xs',
        lg: 'h-10 rounded-lg px-8',
        icon: 'h-9 w-9',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
