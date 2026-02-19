import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAppState } from '../context/AppContext';
import type { Role } from '../types';

interface ProtectedRouteProps {
  children: React.ReactNode;
  role?: Role;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, role }) => {
  const { currentUser, token, isLoadingSession } = useAppState();

  if (isLoadingSession) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-600">
        Loading secure session...
      </div>
    );
  }

  if (!currentUser || !token) {
    return <Navigate to="/login" replace />;
  }

  if (role && currentUser.role !== role) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;

