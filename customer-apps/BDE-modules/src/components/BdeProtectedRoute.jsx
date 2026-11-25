import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useBdeAuth } from '../context/BdeAuthContext';

export default function BdeProtectedRoute() {
  const { isAuthenticated, loading } = useBdeAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-[#0575B8] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-semibold text-slate-600">Verifying BDE session...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
