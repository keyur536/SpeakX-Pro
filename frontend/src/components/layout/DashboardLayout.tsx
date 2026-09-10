import { Outlet, Navigate, Link, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { 
  LayoutDashboard, 
  LogOut, 
  MessageSquare, 
  Video, 
  Users, 
  Settings,
  BookOpen,
  Activity
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function DashboardLayout() {
  const { isAuthenticated, user, logout } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const isStudent = user?.role === "student";

  // Navigation Items based on role
  const getNavItems = () => {
    if (isStudent) {
      return [
        { name: "My Dashboard", path: "/dashboard", icon: LayoutDashboard },
        { name: "New Recording", path: "/analyze", icon: Video },
        { name: "AI Coach", path: "/coach", icon: MessageSquare },
      ];
    }
    if (user?.role === "super_admin") {
      return [
        { name: "My Dashboard", path: "/dashboard", icon: Activity },
        { name: "Global Overview", path: "/super-admin", icon: LayoutDashboard },
        { name: "Courses", path: "/super-admin/courses", icon: BookOpen },
        { name: "AI Coach", path: "/analyze", icon: Video },
        { name: "Chatbot", path: "/coach", icon: MessageSquare },
      ];
    }
    if (user?.role === "admin") {
      return [
        { name: "My Dashboard", path: "/dashboard", icon: Activity },
        { name: "Course Management", path: "/admin", icon: BookOpen },
        { name: "AI Coach", path: "/analyze", icon: Video },
        { name: "Chatbot", path: "/coach", icon: MessageSquare },
      ];
    }
    if (user?.role === "faculty") {
      return [
        { name: "My Dashboard", path: "/dashboard", icon: Activity },
        { name: "Batch Overview", path: "/faculty", icon: Users },
        { name: "AI Coach", path: "/analyze", icon: Video },
        { name: "Chatbot", path: "/coach", icon: MessageSquare },
      ];
    }
    return [];
  };

  const navItems = getNavItems();

  // -------------------------------------------------------------
  // STUDENT LAYOUT (Top Nav)
  // -------------------------------------------------------------
  if (isStudent) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="h-16 border-b border-border bg-card/50 backdrop-blur-md sticky top-0 z-50">
          <div className="container mx-auto h-full px-6 flex items-center justify-between">
            <div className="flex items-center gap-8">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-primary/20 rounded-md flex items-center justify-center border border-primary/30">
                  <Video className="w-4 h-4 text-primary" />
                </div>
                <span className="font-display font-bold text-xl tracking-tight text-foreground">SpeakX-Pro</span>
              </div>
              
              <nav className="hidden md:flex items-center gap-1">
                {navItems.map((item) => (
                  <Link key={item.path} to={item.path}>
                    <Button 
                      variant="ghost" 
                      className={cn(
                        "font-sans h-9 px-4 rounded-full transition-colors",
                        location.pathname === item.path ? "bg-accent/20 text-accent font-semibold" : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <item.icon className="w-4 h-4 mr-2" />
                      {item.name}
                    </Button>
                  </Link>
                ))}
              </nav>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right hidden sm:block">
                <p className="font-sans text-sm font-medium text-foreground">{user?.username}</p>
                <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest">{user?.role}</p>
              </div>
              <Button variant="outline" size="icon" onClick={logout} className="rounded-full border-border hover:bg-destructive/10 hover:text-destructive">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </header>

        <main className="flex-1 container mx-auto px-6 py-8">
          <Outlet />
        </main>
      </div>
    );
  }

  // -------------------------------------------------------------
  // ADMIN/FACULTY LAYOUT (Sidebar)
  // -------------------------------------------------------------
  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar */}
      <aside className="w-[280px] flex-shrink-0 border-r border-border bg-card flex flex-col z-20">
        <div className="h-20 flex items-center px-8 border-b border-border">
          <div className="w-10 h-10 bg-accent/20 rounded-lg flex items-center justify-center border border-accent/30 mr-4">
            <Settings className="w-5 h-5 text-accent" />
          </div>
          <div>
            <h2 className="font-display font-bold text-xl tracking-tight text-foreground leading-none">SpeakX-Pro</h2>
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Control Center</span>
          </div>
        </div>
        
        <div className="p-6">
          <p className="font-mono text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Navigation</p>
          <nav className="space-y-1">
            {navItems.map((item) => {
              const isActive = item.path === "/super-admin" || item.path === "/admin" || item.path === "/faculty" || item.path === "/dashboard" 
                ? location.pathname === item.path
                : location.pathname.startsWith(item.path);
              return (
                <Link key={item.path} to={item.path}>
                  <Button 
                    variant="ghost" 
                    className={cn(
                      "w-full justify-start font-sans h-11 px-4 rounded-md transition-all",
                      isActive 
                        ? "bg-accent/15 text-accent font-semibold border border-accent/20" 
                        : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                    )}
                  >
                    <item.icon className="w-4 h-4 mr-3" />
                    {item.name}
                  </Button>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="mt-auto p-6 border-t border-border bg-secondary/30">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-border flex items-center justify-center">
              <span className="font-display font-bold text-lg">{user?.username?.[0]?.toUpperCase()}</span>
            </div>
            <div className="overflow-hidden">
              <p className="font-sans text-sm font-medium text-foreground truncate">{user?.username}</p>
              <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest">{user?.role}</p>
            </div>
          </div>
          <Button variant="outline" className="w-full bg-transparent border-border hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30" onClick={logout}>
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {/* Subtle background glow */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-accent/5 rounded-full blur-[120px] pointer-events-none -z-10" />
        
        <div className="flex-1 overflow-auto p-10">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
