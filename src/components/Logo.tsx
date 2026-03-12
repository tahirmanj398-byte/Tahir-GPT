import React from 'react';

interface LogoProps {
  className?: string;
  size?: number;
}

export default function Logo({ className = "", size = 40 }: LogoProps) {
  return (
    <div className={`relative flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
      <div className="absolute inset-0 bg-indigo-600 rounded-xl rotate-12 opacity-20 animate-pulse"></div>
      <div className="absolute inset-0 bg-emerald-500 rounded-xl -rotate-12 opacity-20 animate-pulse delay-75"></div>
      <svg
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-[0_0_12px_rgba(99,102,241,0.4)]"
      >
        <defs>
          <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#10b981" />
          </linearGradient>
        </defs>
        <path
          d="M20 20C20 14.4772 24.4772 10 30 10H70C75.5228 10 80 14.4772 80 20V80C80 85.5228 75.5228 90 70 90H30C24.4772 90 20 85.5228 20 80V20Z"
          fill="url(#logoGradient)"
          className="opacity-10"
        />
        <path
          d="M35 30H65M50 30V70M35 70H65"
          stroke="url(#logoGradient)"
          strokeWidth="8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M25 50C25 36.1929 36.1929 25 50 25C63.8071 25 75 36.1929 75 50C75 63.8071 63.8071 75 50 75C36.1929 75 25 63.8071 25 50Z"
          stroke="url(#logoGradient)"
          strokeWidth="2"
          strokeDasharray="4 4"
          className="animate-[spin_10s_linear_infinite]"
        />
      </svg>
    </div>
  );
}
