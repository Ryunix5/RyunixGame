import React from 'react';
import { cn } from './Button'; // Reusing utility

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
    hover?: boolean;
    glass?: boolean;
}

export const Card: React.FC<CardProps> = ({
    children,
    className,
    hover = false,
    glass = false, // Ignored in minimalist mode
    ...props
}) => {
    return (
        <div
            className={cn(
                "rounded-lg p-6 bg-slate-900 border border-slate-800 transition-all duration-200",
                hover && "hover:border-slate-600 hover:bg-slate-800/50 cursor-pointer",
                className
            )}
            {...props}
        >
            {children}
        </div>
    );
};
