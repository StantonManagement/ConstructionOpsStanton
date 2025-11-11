import React from 'react';
import { Button, buttonVariants } from '@/components/ui/button';
import { VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

type ButtonProps = React.ComponentProps<"button"> & VariantProps<typeof buttonVariants> & {
  asChild?: boolean;
};

interface ActionButtonProps extends Omit<ButtonProps, 'variant'> {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'ghost' | 'link';
  size?: 'sm' | 'default' | 'lg' | 'icon';
  children: React.ReactNode;
}

/**
 * Consistent action button component with semantic styling
 * Ensures all buttons use the design system colors
 */
export const ActionButton: React.FC<ActionButtonProps> = ({ 
  variant = 'default', 
  size = 'default',
  className,
  children,
  ...props 
}) => {
  return (
    <Button
      variant={variant}
      size={size}
      className={cn(
        // Additional semantic styling can be added here
        className
      )}
      {...props}
    >
      {children}
    </Button>
  );
};

/**
 * Primary action button - for main actions
 */
export const PrimaryButton: React.FC<Omit<ActionButtonProps, 'variant'>> = (props) => (
  <ActionButton variant="default" {...props} />
);

/**
 * Secondary action button - for alternative actions
 */
export const SecondaryButton: React.FC<Omit<ActionButtonProps, 'variant'>> = (props) => (
  <ActionButton variant="secondary" {...props} />
);

/**
 * Destructive action button - for delete/cancel actions
 */
export const DestructiveButton: React.FC<Omit<ActionButtonProps, 'variant'>> = (props) => (
  <ActionButton variant="destructive" {...props} />
);

/**
 * Outline action button - for secondary actions
 */
export const OutlineButton: React.FC<Omit<ActionButtonProps, 'variant'>> = (props) => (
  <ActionButton variant="outline" {...props} />
);

/**
 * Ghost action button - for subtle actions
 */
export const GhostButton: React.FC<Omit<ActionButtonProps, 'variant'>> = (props) => (
  <ActionButton variant="ghost" {...props} />
);

