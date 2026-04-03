import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import type { ReactNode } from 'react';

export default function ProtectedRoute({ children }: { children: ReactNode }) {
    const { isAuthenticated } = useAuth();
    const hasToken = !!localStorage.getItem('token');
    if (!isAuthenticated && !hasToken) return <Navigate to="/login" replace />;
    return <>{children}</>;
}
