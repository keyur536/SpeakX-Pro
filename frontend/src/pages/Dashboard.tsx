import { useEffect, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { ScoreReadout } from "@/components/shared/ScoreReadout";
import { StatCard } from "@/components/shared/StatCard";
import { Button } from "@/components/ui/button";
import { Video, Calendar, Activity, Play } from "lucide-react";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";

export default function Dashboard() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const response = await axios.get("http://127.0.0.1:8000/api/v1/sessions/", {
          withCredentials: true,
        });
        setSessions(response.data);
      } catch (error) {
        console.error("Error fetching sessions:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchSessions();
  }, []);

  const latestSession = sessions[0];
  const avgScore = sessions.length > 0 
    ? Math.round(sessions.reduce((acc, s) => acc + s.overall_score, 0) / sessions.length) 
    : 0;

  if (loading) {
    return (
      <div className="space-y-8 animate-pulse">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
        <div className="w-24 h-24 bg-card border border-border rounded-full flex items-center justify-center mb-4 shadow-xl">
          <Video className="w-10 h-10 text-muted-foreground" />
        </div>
        <div className="text-center space-y-2">
          <h2 className="font-display text-3xl font-bold text-foreground">Welcome to SpeakX-Pro</h2>
          <p className="font-sans text-muted-foreground max-w-md mx-auto">
            You haven't recorded any sessions yet. Start your first recording to get AI-powered feedback on your communication skills.
          </p>
        </div>
        <Link to="/analyze">
          <Button size="lg" className="h-14 px-8 font-sans text-lg">
            <Play className="mr-2 h-5 w-5" /> Start Recording
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-10 max-w-6xl mx-auto">
      <div>
        <h1 className="font-display text-4xl font-bold tracking-tight text-foreground mb-2">My Dashboard</h1>
        <p className="font-sans text-muted-foreground">Track your communication progress and review past recordings.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          title="Latest Score"
          value={Math.round(latestSession.overall_score)}
          trend="Overall"
          icon={<Activity className="w-5 h-5" />}
          accentColor="amber"
        />
        <StatCard
          title="Average Score"
          value={avgScore}
          icon={<Activity className="w-5 h-5" />}
        />
        <StatCard
          title="Total Sessions"
          value={sessions.length}
          icon={<Video className="w-5 h-5" />}
        />
      </div>

      <div className="bg-card border border-border rounded-[1rem] p-8 shadow-sm">
        <h2 className="font-sans font-semibold text-xl mb-6">Latest Performance Overview</h2>
        <ScoreReadout
          overall={latestSession.overall_score}
          pillars={[
            { label: "Confidence", value: latestSession.confidence_score },
            { label: "Fluency", value: latestSession.fluency_score },
            { label: "English", value: latestSession.english_proficiency_score },
            { label: "Impact", value: latestSession.communication_impact_score },
            { label: "Engagement", value: latestSession.vocal_engagement_score },
            { label: "Presence", value: latestSession.physical_presence_score },
          ]}
        />
      </div>

      <div>
        <h2 className="font-sans font-semibold text-xl mb-6">Session History</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {sessions.map((session, i) => (
            <Link key={session.id} to={`/session/${session.id}`} className="group relative overflow-hidden bg-card hover:bg-secondary/30 hover:border-primary/50 transition-colors border border-border rounded-[1rem] p-5 shadow-sm flex flex-col justify-between h-full">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-sans font-semibold text-lg text-foreground group-hover:text-primary transition-colors">
                    Session {sessions.length - i}
                  </h3>
                  <div className="flex items-center text-xs text-muted-foreground font-mono mt-1">
                    <Calendar className="w-3 h-3 mr-1" />
                    {format(new Date(session.session_date), "PPP")}
                  </div>
                </div>
                <div className="w-12 h-12 rounded-full border-4 border-primary/20 flex items-center justify-center bg-card shadow-sm">
                  <span className="font-mono font-bold text-foreground">{Math.round(session.overall_score)}</span>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs font-mono text-muted-foreground pt-4 border-t border-border mt-auto">
                <div className="flex items-center gap-3">
                  <span>WPM: <span className="text-foreground">{session.wpm}</span></span>
                  <span>Eye Contact: <span className="text-foreground">{session.eye_contact_pct}%</span></span>
                </div>
                <span className="text-primary font-sans font-medium flex items-center group-hover:translate-x-1 transition-transform">
                  View Report &rarr;
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
