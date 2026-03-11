import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Spinner } from '@/components/ui/Spinner';
import { useAuthStore } from '@/store/auth.store';

export const PrivateRoute = () => {
  const hydrated = useAuthStore((state) => state.hydrated);
  const token = useAuthStore((state) => state.token);
  const location = useLocation();

  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg-primary">
        <Spinner />
      </div>
    );
  }

  if (!token) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
};
