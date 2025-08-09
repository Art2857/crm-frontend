import React from 'react';
import Layout from '../layout/Layout';

interface DataLoaderProps {
  isLoading: boolean;
  error: string | null;
  onRetry?: () => void;
  children: React.ReactNode;
}

/**
 * Компонент для управления отображением состояния загрузки данных
 */
const DataLoader: React.FC<DataLoaderProps> = ({
  isLoading,
  error,
  onRetry,
  children,
}) => {
  if (isLoading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary-600"></div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="bg-red-50 border-l-4 border-red-500 p-4 my-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-red-500"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586l-1.293-1.293z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
                {onRetry && (
                  <div className="mt-2">
                    <button
                      onClick={onRetry}
                      className="py-1 px-2 bg-red-100 text-red-800 text-xs rounded hover:bg-red-200"
                    >
                      Повторить загрузку
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return <>{children}</>;
};

export default DataLoader;
