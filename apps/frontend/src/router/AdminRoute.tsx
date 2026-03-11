import { Navigate, Outlet } from 'react-router-dom';
import { Spinner } from '@/components/ui/Spinner';
import { useAuthStore } from '@/store/auth.store';

export const AdminRoute = () => {
  const hydrated = useAuthStore((state) => state.hydrated);
  const token = useAuthStore((state) => state.token);
  const isAdmin = useAuthStore((state) => state.isAdmin);

  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg-primary">
        <Spinner />
      </div>
    );
  }

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};
