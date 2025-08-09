'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppSelector } from '../../store';
import Layout from '../../components/layout/Layout';
import { Role } from '../../types/user';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { isAuthenticated, user, isLoading } = useAppSelector((s) => s.auth);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      router.replace('/login');
      return;
    }
    if (user?.role !== Role.ADMIN) {
      router.replace('/dashboard');
      return;
    }
    setReady(true);
  }, [isAuthenticated, isLoading, user, router]);

  if (!ready) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary-600"></div>
        </div>
      </Layout>
    );
  }

  return <Layout>{children}</Layout>;
}
