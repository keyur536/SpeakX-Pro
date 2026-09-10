import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./components/theme-provider";
import Login from "./pages/Login";
import Register from "./pages/Register";
import DashboardLayout from "./components/layout/DashboardLayout";
import Dashboard from "./pages/Dashboard";
import SessionDetail from "./pages/SessionDetail";
import AnalyzeSession from "./pages/AnalyzeSession";
import AiCoach from "./pages/AiCoach";
import SuperAdminDashboard from "./pages/SuperAdminDashboard";
import SuperAdminCourses from "./pages/SuperAdminCourses";
import SuperAdminCourseBatchesPage from "./pages/SuperAdminCourseBatchesPage";
import SuperAdminBatchDetailsPage from "./pages/SuperAdminBatchDetailsPage";
import AdminDashboard from "./pages/AdminDashboard";
import AdminCourseBatchesPage from "./pages/AdminCourseBatchesPage";
import AdminBatchDetailsPage from "./pages/AdminBatchDetailsPage";
import FacultyDashboard from "./pages/FacultyDashboard";
import RoleProtectedRoute from "./components/RoleProtectedRoute";
import { Toaster } from "@/components/ui/sonner";

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
            <Route path="/session/:id" element={<SessionDetail />} />
            <Route path="/analyze" element={<AnalyzeSession />} />
            <Route path="/coach" element={<AiCoach />} />
            
            <Route path="/super-admin" element={
              <RoleProtectedRoute allowedRoles={["super_admin"]}>
                <SuperAdminDashboard />
              </RoleProtectedRoute>
            } />
            <Route path="/super-admin/courses" element={
              <RoleProtectedRoute allowedRoles={["super_admin"]}>
                <SuperAdminCourses />
              </RoleProtectedRoute>
            } />
            <Route path="/super-admin/courses/:id" element={
              <RoleProtectedRoute allowedRoles={["super_admin"]}>
                <SuperAdminCourseBatchesPage />
              </RoleProtectedRoute>
            } />
            <Route path="/super-admin/batches/:batchId" element={
              <RoleProtectedRoute allowedRoles={["super_admin"]}>
                <SuperAdminBatchDetailsPage />
              </RoleProtectedRoute>
            } />
            
            <Route path="/admin" element={
              <RoleProtectedRoute allowedRoles={["admin"]}>
                <AdminDashboard />
              </RoleProtectedRoute>
            } />
            <Route path="/admin/courses/:id" element={
              <RoleProtectedRoute allowedRoles={["admin"]}>
                <AdminCourseBatchesPage />
              </RoleProtectedRoute>
            } />
            <Route path="/admin/batches/:batchId" element={
              <RoleProtectedRoute allowedRoles={["admin"]}>
                <AdminBatchDetailsPage />
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
      <Toaster />
    </ThemeProvider>
  );
}

export default App;
