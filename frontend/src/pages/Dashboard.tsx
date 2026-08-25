import { useEffect, useState } from "react";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Activity, Clock, Target, TrendingUp } from "lucide-react";
import { CertificateButton } from "@/components/CertificateButton";
import { NotificationBell } from "@/components/NotificationBell";

interface SessionData {
  id: number;
  session_date: string;
  overall_score: number;
  wpm: number;
  eye_contact_pct: number;
}

export default function Dashboard() {
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [batchId, setBatchId] = useState(1); // Usually fetched from user profile

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await axios.get("http://127.0.0.1:8000/api/v1/sessions/", {
          headers: { Authorization: `Bearer ${token}` }
        });
        setSessions(response.data);
      } catch (error) {
        console.error("Failed to fetch sessions", error);
      } finally {
        setLoading(false);
      }
    };
    fetchSessions();
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center h-full">Loading...</div>;
  }

  const avgScore = sessions.length ? Math.round(sessions.reduce((acc, curr) => acc + curr.overall_score, 0) / sessions.length) : 0;
  const avgWpm = sessions.length ? Math.round(sessions.reduce((acc, curr) => acc + curr.wpm, 0) / sessions.length) : 0;
  const chartData = sessions.map((s, index) => ({
    name: `S${index + 1}`,
    score: s.overall_score,
    wpm: s.wpm,
    eyeContact: s.eye_contact_pct
  }));

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Student Dashboard</h2>
        <div className="flex items-center space-x-2">
          <NotificationBell />
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="sessions">My Sessions</TabsTrigger>
          <TabsTrigger value="certificates">Certificates</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {sessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center space-y-4 border rounded-xl border-dashed">
              <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center">
                <Activity className="w-12 h-12 text-primary" />
              </div>
              <h2 className="text-2xl font-bold tracking-tight">No sessions yet</h2>
              <p className="text-muted-foreground max-w-sm">
                You haven't recorded any speaking sessions. Head over to the New Session tab to get started!
              </p>
            </div>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Average Score</CardTitle>
                    <Target className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{avgScore}/100</div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Sessions</CardTitle>
                    <Activity className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{sessions.length}</div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Avg WPM</CardTitle>
                    <Clock className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{avgWpm}</div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Recent Growth</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-500">
                      {sessions.length > 1 
                        ? `+${Math.round(sessions[0].overall_score - sessions[sessions.length-1].overall_score)} pts` 
                        : "N/A"}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card className="col-span-4">
                <CardHeader>
                  <CardTitle>Performance Trend</CardTitle>
                </CardHeader>
                <CardContent className="pl-2">
                  <div className="h-[300px] w-full mt-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData.reverse()}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                        <XAxis 
                          dataKey="name" 
                          stroke="hsl(var(--muted-foreground))"
                          fontSize={12}
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis yAxisId="left" domain={[0, 100]} stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis yAxisId="right" orientation="right" domain={[0, 'dataMax + 20']} stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))" }}
                          itemStyle={{ color: "hsl(var(--foreground))" }}
                        />
                        <Line
                          yAxisId="left"
                          type="monotone"
                          dataKey="score"
                          name="Overall Score"
                          stroke="hsl(var(--primary))"
                          strokeWidth={2}
                          dot={{ r: 4, fill: "hsl(var(--primary))" }}
                          activeDot={{ r: 6 }}
                        />
                        <Line
                          yAxisId="left"
                          type="monotone"
                          dataKey="eyeContact"
                          name="Eye Contact %"
                          stroke="#10b981"
                          strokeWidth={2}
                        />
                        <Line
                          yAxisId="right"
                          type="monotone"
                          dataKey="wpm"
                          name="Words Per Min"
                          stroke="#f59e0b"
                          strokeWidth={2}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="sessions">
          <Card>
            <CardHeader>
              <CardTitle>Session History</CardTitle>
            </CardHeader>
            <CardContent>
              {sessions.map((s) => (
                <div key={s.id} className="flex justify-between border-b py-2">
                  <span>{new Date(s.session_date).toLocaleDateString()}</span>
                  <span className="font-bold">{Math.round(s.overall_score)}/100</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="certificates">
          <Card>
            <CardHeader>
              <CardTitle>My Certificates</CardTitle>
              <CardDescription>Download your course completion certificates here.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center p-4 border rounded-lg">
                <div>
                  <h4 className="font-semibold">Current Batch</h4>
                  <p className="text-sm text-muted-foreground">ID: {batchId}</p>
                </div>
                <CertificateButton batchId={batchId} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
