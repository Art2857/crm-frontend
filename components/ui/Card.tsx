import React, { ReactNode } from 'react';

interface CardProps {
  title?: string;
  className?: string;
  children: ReactNode;
  footer?: ReactNode;
}

const Card: React.FC<CardProps> = ({
  title,
  className = '',
  children,
  footer,
}) => {
  return (
    <div className={`bg-white shadow rounded-lg overflow-hidden ${className}`}>
      {title && (
        <div className="border-b border-gray-200 px-4 py-5 sm:px-6">
          <h3 className="text-lg font-medium leading-6 text-gray-900">
            {title}
          </h3>
        </div>
      )}

      <div className="px-4 py-5 sm:p-6">{children}</div>

      {footer && (
        <div className="border-t border-gray-200 px-4 py-4 sm:px-6 bg-gray-50">
          {footer}
        </div>
      )}
    </div>
  );
};

export default Card;
