import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./components/theme-provider";
import Login from "./pages/Login";
import Register from "./pages/Register";
import DashboardLayout from "./components/layout/DashboardLayout";
import Dashboard from "./pages/Dashboard";
import AnalyzeSession from "./pages/AnalyzeSession";
import AiCoach from "./pages/AiCoach";
import SuperAdminDashboard from "./pages/SuperAdminDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import FacultyDashboard from "./pages/FacultyDashboard";
import RoleProtectedRoute from "./components/RoleProtectedRoute";

function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route element={<DashboardLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/analyze" element={<AnalyzeSession />} />
            <Route path="/coach" element={<AiCoach />} />
            
            <Route path="/super-admin" element={
              <RoleProtectedRoute allowedRoles={["super_admin"]}>
                <SuperAdminDashboard />
              </RoleProtectedRoute>
            } />
            
            <Route path="/admin" element={
              <RoleProtectedRoute allowedRoles={["admin"]}>
                <AdminDashboard />
              </RoleProtectedRoute>
            } />
            
            <Route path="/faculty" element={
              <RoleProtectedRoute allowedRoles={["faculty"]}>
                <FacultyDashboard />
              </RoleProtectedRoute>
            } />
          </Route>
        </Routes>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
