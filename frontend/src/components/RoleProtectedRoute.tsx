import { Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

interface RoleProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: string[];
}

export default function RoleProtectedRoute({ children, allowedRoles }: RoleProtectedRouteProps) {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user && !allowedRoles.includes(user.role)) {
    // Role not authorized, bounce them back to dashboard
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
