import { Navigate } from 'react-router-dom';
import { isLoggedIn } from '../api/client';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  return isLoggedIn() ? <>{children}</> : <Navigate to="/login" replace />;
}
