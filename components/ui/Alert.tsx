import React, { ReactNode } from 'react';

interface AlertProps {
  children: ReactNode;
  type: 'error' | 'success' | 'warning' | 'info';
}

const Alert: React.FC<AlertProps> = ({ children, type }) => {
  const colors = {
    error: 'text-red-700 bg-red-100 border-red-400',
    success: 'text-green-700 bg-green-100 border-green-400',
    warning: 'text-yellow-700 bg-yellow-100 border-yellow-400',
    info: 'text-blue-700 bg-blue-100 border-blue-400',
  };

  return (
    <div className={`p-4 mb-4 text-sm rounded-lg border ${colors[type]}`} role="alert">
      {children}
    </div>
  );
};

export default Alert; 