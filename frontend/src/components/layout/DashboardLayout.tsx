import { Outlet, Navigate, Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { ModeToggle } from "@/components/mode-toggle";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, LogOut, MessageSquare, Video, ShieldCheck } from "lucide-react";

export default function DashboardLayout() {
  const { isAuthenticated, user, logout } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside className="w-64 border-r bg-card flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-border/50">
          <Video className="w-6 h-6 text-primary mr-2" />
          <span className="font-bold text-lg tracking-tight">SpeakX-Pro</span>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          <Link to="/dashboard">
            <Button variant="ghost" className="w-full justify-start">
              <LayoutDashboard className="mr-2 h-4 w-4" />
              Dashboard
            </Button>
          </Link>
          <Link to="/analyze">
            <Button variant="ghost" className="w-full justify-start">
              <Video className="mr-2 h-4 w-4" />
              New Session
            </Button>
          </Link>
          <Link to="/coach">
            <Button variant="ghost" className="w-full justify-start">
              <MessageSquare className="mr-2 h-4 w-4" />
              AI Coach
            </Button>
          </Link>

          {user?.role === "super_admin" && (
            <Link to="/super-admin">
              <Button variant="ghost" className="w-full justify-start text-primary">
                <ShieldCheck className="mr-2 h-4 w-4" />
                Super Admin Panel
              </Button>
            </Link>
          )}

          {user?.role === "admin" && (
            <Link to="/admin">
              <Button variant="ghost" className="w-full justify-start text-primary">
                <ShieldCheck className="mr-2 h-4 w-4" />
                Course Admin Panel
              </Button>
            </Link>
          )}

          {user?.role === "faculty" && (
            <Link to="/faculty">
              <Button variant="ghost" className="w-full justify-start text-primary">
                <ShieldCheck className="mr-2 h-4 w-4" />
                Faculty Panel
              </Button>
            </Link>
          )}
        </nav>

        <div className="p-4 border-t border-border/50">
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm font-medium truncate">
              {user?.username}
              <div className="text-xs text-muted-foreground">{user?.role}</div>
            </div>
            <ModeToggle />
          </div>
          <Button variant="outline" className="w-full" onClick={logout}>
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 border-b border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex items-center px-8 z-10">
          <h1 className="text-xl font-semibold">Overview</h1>
        </header>
        <div className="flex-1 overflow-auto p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
