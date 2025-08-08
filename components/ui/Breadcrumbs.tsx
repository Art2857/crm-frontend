import React from 'react';
import Link from 'next/link';
import { Breadcrumb } from '../../types/breadcrumb';

interface BreadcrumbsProps {
  items: Breadcrumb[];
  className?: string;
}

const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ items, className = '' }) => {
  if (!items || items.length === 0) {
    return null;
  }

  return (
    <nav aria-label="Breadcrumb" className={`mb-4 ${className}`}>
      <ol className="flex items-center space-x-1 text-sm text-gray-500">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;

          return (
            <li key={item.id} className="flex items-center">
              {index > 0 && (
                <svg 
                  className="h-4 w-4 mx-1 text-gray-400" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M9 5l7 7-7 7" 
                  />
                </svg>
              )}
              
              {isLast || !item.isClickable ? (
                <span 
                  className={`${isLast ? 'text-gray-900 font-medium' : 'text-gray-500'}`}
                >
                  {item.icon && (
                    <span className="mr-1">{item.icon}</span>
                  )}
                  {item.title}
                </span>
              ) : (
                <Link 
                  href={item.path}
                  className="hover:text-primary-600 transition-colors duration-200"
                >
                  {item.icon && (
                    <span className="mr-1">{item.icon}</span>
                  )}
                  {item.title}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

export default Breadcrumbs; 