import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Video } from "lucide-react";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const formData = new URLSearchParams();
      formData.append("username", username);
      formData.append("password", password);

      const response = await axios.post("http://127.0.0.1:8000/api/v1/auth/login", formData, {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      });

      const { access_token } = response.data;
      const payload = JSON.parse(atob(access_token.split(".")[1]));
      
      login(access_token, { username: payload.sub, role: payload.role });
      
      toast.success("Successfully logged in", {
        description: `Welcome back, ${payload.sub}`,
      });
      
      if (payload.role === "super_admin") {
        navigate("/super-admin");
      } else if (payload.role === "admin") {
        navigate("/admin");
      } else if (payload.role === "faculty") {
        navigate("/faculty");
      } else {
        navigate("/dashboard");
      }
    } catch (err) {
      toast.error("Invalid credentials", {
        description: "Please check your email and password and try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden">
      {/* Recording Studio Accents */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-accent to-primary opacity-50" />
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-accent/5 rounded-full blur-[120px] pointer-events-none" />
      
      <div className="w-full max-w-md z-10 px-4">
        <div className="mb-8 flex flex-col items-center">
          <div className="w-16 h-16 bg-card border border-border rounded-2xl flex items-center justify-center mb-6 shadow-2xl relative">
            <div className="absolute -right-1 -top-1 w-3 h-3 bg-primary rounded-full animate-pulse" />
            <Video className="w-8 h-8 text-foreground" />
          </div>
          <h1 className="font-display text-4xl font-bold tracking-tight text-foreground mb-2">SpeakX-Pro</h1>
          <p className="font-sans text-muted-foreground">Studio Access Interface</p>
        </div>

        <div className="bg-card/80 backdrop-blur-xl border border-border p-8 rounded-[1rem] shadow-2xl">
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email" className="font-mono text-xs text-muted-foreground uppercase tracking-wider">Email / Username</Label>
              <Input 
                id="email" 
                type="email" 
                placeholder="admin@speakx.com" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="bg-background border-border focus-visible:ring-primary h-12 px-4 font-sans"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="font-mono text-xs text-muted-foreground uppercase tracking-wider">Password</Label>
              <Input 
                id="password" 
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-background border-border focus-visible:ring-primary h-12 px-4 font-sans"
              />
            </div>
            
            <Button className="w-full h-12 font-sans font-semibold text-base" type="submit" disabled={loading}>
              {loading ? "INITIALIZING..." : "ENTER STUDIO"}
            </Button>
            
            <div className="text-center mt-6">
              <Link to="/register" className="font-sans text-sm text-muted-foreground hover:text-primary transition-colors">
                Register with a Batch Code &rarr;
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
