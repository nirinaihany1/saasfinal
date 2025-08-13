import React, { useEffect } from 'react';
import { DemoAccountSetup } from '../components/admin/DemoAccountSetup';
import { useAuthStore } from '../store/authStore';

export const Setup: React.FC = () => {
  const { user, isLoading, signOut } = useAuthStore();

  useEffect(() => {
    // If a user is authenticated, sign them out to ensure clean state
    if (user && !isLoading) {
      signOut();
    }
  }, [user, isLoading, signOut]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12">
      <DemoAccountSetup />
    </div>
  );
};