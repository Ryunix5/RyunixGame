import React from 'react';
import { motion } from 'framer-motion';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useAudio } from '../../AudioContext';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
    size?: 'sm' | 'md' | 'lg';
    isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
    children,
    className,
    variant = 'primary',
    size = 'md',
    isLoading,
    disabled,
    onClick,
    ...props
}) => {
    const { playSound } = useAudio();

    const baseStyles = "inline-flex items-center justify-center rounded-lg font-bold transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";

    const variants = {
        primary: "bg-slate-200 text-slate-900 hover:bg-white focus:ring-slate-200",
        secondary: "bg-transparent border-2 border-slate-700 text-slate-300 hover:border-slate-500 hover:text-white focus:ring-slate-500",
        ghost: "bg-transparent hover:bg-slate-800 text-slate-400 hover:text-white",
        danger: "bg-red-900 border border-red-700 text-red-100 hover:bg-red-800 focus:ring-red-500"
    };

    const sizes = {
        sm: "px-3 py-1.5 text-xs",
        md: "px-6 py-3 text-sm",
        lg: "px-8 py-4 text-base tracking-wide"
    };

    const MotionButton = motion.button;

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
        playSound('click');
        onClick?.(e);
    };

    return (
        <MotionButton
            className={cn(baseStyles, variants[variant], sizes[size], className)}
            disabled={disabled || isLoading}
            onClick={handleClick}
            whileHover={{ scale: disabled || isLoading ? 1 : 1.02 }}
            whileTap={{ scale: disabled || isLoading ? 1 : 0.98 }}
            transition={{ duration: 0.15 }}
            {...(props as any)}
        >
            {isLoading ? (
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
            ) : null}
            {children}
        </MotionButton>
    );
};
