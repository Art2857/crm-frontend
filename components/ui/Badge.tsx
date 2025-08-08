import React from 'react';

export type BadgeColor = 'gray' | 'red' | 'yellow' | 'green' | 'blue' | 'purple' | 'orange';

interface BadgeProps {
  children: React.ReactNode;
  color?: BadgeColor;
  className?: string;
}

const Badge: React.FC<BadgeProps> = ({ children, color = 'gray', className = '' }) => {
  const colorStyles: Record<BadgeColor, string> = {
    gray: 'bg-gray-100 text-gray-800',
    red: 'bg-red-100 text-red-800',
    yellow: 'bg-yellow-100 text-yellow-800',
    green: 'bg-green-100 text-green-800',
    blue: 'bg-blue-100 text-blue-800',
    purple: 'bg-purple-100 text-purple-800',
    orange: 'bg-orange-100 text-orange-800'
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorStyles[color]} ${className}`}
    >
      {children}
    </span>
  );
};

export default Badge; 