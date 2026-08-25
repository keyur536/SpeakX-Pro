import React, { useState, useEffect } from "react";
import axios from "axios";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, BookOpen, Layers, Activity, UserPlus } from "lucide-react";
import { NotificationBell } from "@/components/NotificationBell";

export default function SuperAdminDashboard() {
  const [courses, setCourses] = useState([]);
  const [batches, setBatches] = useState([]);
  const [faculty, setFaculty] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const token = localStorage.getItem("token");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [coursesRes, batchesRes, facultyRes, auditRes] = await Promise.all([
        axios.get("http://127.0.0.1:8000/api/v1/super-admin/courses", { headers }),
        axios.get("http://127.0.0.1:8000/api/v1/super-admin/batches", { headers }),
        axios.get("http://127.0.0.1:8000/api/v1/super-admin/faculty", { headers }),
        axios.get("http://127.0.0.1:8000/api/v1/super-admin/audit-log", { headers }),
      ]);
      setCourses(coursesRes.data);
      setBatches(batchesRes.data);
      setFaculty(facultyRes.data);
      setAuditLogs(auditRes.data);
    } catch (e) {
      console.error("Failed to load dashboard data", e);
    }
  };

  const [newCourse, setNewCourse] = useState({ name: "", code: "", description: "", duration_months: 6 });
  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.post("http://127.0.0.1:8000/api/v1/super-admin/courses", newCourse, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchData();
    } catch (e) {
      alert("Error creating course");
    }
  };

  const [newBatch, setNewBatch] = useState({ course_id: "", name: "", batch_code: "", start_date: "", end_date: "", enrollment_deadline: "", assigned_admin_id: "" });
  const handleCreateBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.post("http://127.0.0.1:8000/api/v1/super-admin/batches", newBatch, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchData();
    } catch (e) {
      alert("Error creating batch");
    }
  };

  const [newFaculty, setNewFaculty] = useState({ username: "", email: "", phone: "", password: "" });
  const handleCreateFaculty = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.post("http://127.0.0.1:8000/api/v1/super-admin/faculty", newFaculty, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchData();
    } catch (e: any) {
      const msg = e.response?.data?.detail || "Error creating faculty";
      alert(msg);
    }
  };

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Super Admin Dashboard</h2>
        <div className="flex items-center space-x-2">
          <NotificationBell />
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="courses">Courses</TabsTrigger>
          <TabsTrigger value="batches">Batches</TabsTrigger>
          <TabsTrigger value="faculty">Faculty</TabsTrigger>
          <TabsTrigger value="audit">Audit Log</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Courses</CardTitle>
                <BookOpen className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{courses.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Batches</CardTitle>
                <Layers className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{batches.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Faculty</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{faculty.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">System Health</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-500">100%</div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="courses" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Course Management</CardTitle>
                <CardDescription>Create and manage CDAC courses.</CardDescription>
              </div>
              <Dialog>
                <DialogTrigger asChild>
                  <Button><BookOpen className="mr-2 h-4 w-4"/> New Course</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Course</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleCreateCourse} className="space-y-4">
                    <div>
                      <Label>Course Name</Label>
                      <Input required value={newCourse.name} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewCourse({...newCourse, name: e.target.value})} />
                    </div>
                    <div>
                      <Label>Course Code</Label>
                      <Input required value={newCourse.code} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewCourse({...newCourse, code: e.target.value})} />
                    </div>
                    <Button type="submit">Create</Button>
                  </form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Duration (Months)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {courses.map((c: any) => (
                    <TableRow key={c.id}>
                      <TableCell>{c.id}</TableCell>
                      <TableCell className="font-medium">{c.code}</TableCell>
                      <TableCell>{c.name}</TableCell>
                      <TableCell>{c.duration_months}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="batches" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Batch Management</CardTitle>
                <CardDescription>Manage all batches across all courses.</CardDescription>
              </div>
              <Dialog>
                <DialogTrigger asChild>
                  <Button><Layers className="mr-2 h-4 w-4"/> New Batch</Button>
                </DialogTrigger>
                <DialogContent className="max-h-screen overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Create New Batch</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleCreateBatch} className="space-y-4">
                    <div>
                      <Label>Course ID</Label>
                      <Input required type="number" value={newBatch.course_id} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewBatch({...newBatch, course_id: e.target.value})} />
                    </div>
                    <div>
                      <Label>Batch Name</Label>
                      <Input required value={newBatch.name} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewBatch({...newBatch, name: e.target.value})} />
                    </div>
                    <div>
                      <Label>Batch Code</Label>
                      <Input required value={newBatch.batch_code} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewBatch({...newBatch, batch_code: e.target.value})} />
                    </div>
                    <div>
                      <Label>Assigned Admin ID (Compulsory)</Label>
                      <Input required type="number" value={newBatch.assigned_admin_id} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewBatch({...newBatch, assigned_admin_id: e.target.value})} />
                    </div>
                    <div>
                      <Label>Start Date</Label>
                      <Input required type="date" value={newBatch.start_date} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewBatch({...newBatch, start_date: e.target.value})} />
                    </div>
                    <div>
                      <Label>End Date</Label>
                      <Input required type="date" value={newBatch.end_date} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewBatch({...newBatch, end_date: e.target.value})} />
                    </div>
                    <div>
                      <Label>Enrollment Deadline</Label>
                      <Input required type="date" value={newBatch.enrollment_deadline} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewBatch({...newBatch, enrollment_deadline: e.target.value})} />
                    </div>
                    <Button type="submit">Create</Button>
                  </form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Admin ID</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {batches.map((b: any) => (
                    <TableRow key={b.id}>
                      <TableCell className="font-medium">{b.batch_code}</TableCell>
                      <TableCell>{b.name}</TableCell>
                      <TableCell>{b.assigned_admin_id}</TableCell>
                      <TableCell>
                        <Badge variant={b.status === "ongoing" ? "default" : "secondary"}>
                          {b.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="faculty" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Faculty Management</CardTitle>
                <CardDescription>Onboard and manage faculty members.</CardDescription>
              </div>
              <Dialog>
                <DialogTrigger asChild>
                  <Button><UserPlus className="mr-2 h-4 w-4"/> Add Faculty</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New Faculty</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleCreateFaculty} className="space-y-4">
                    <div>
                      <Label>Name</Label>
                      <Input required value={newFaculty.username} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewFaculty({...newFaculty, username: e.target.value})} />
                    </div>
                    <div>
                      <Label>Email</Label>
                      <Input required type="email" value={newFaculty.email} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewFaculty({...newFaculty, email: e.target.value})} />
                    </div>
                    <div>
                      <Label>Phone</Label>
                      <Input value={newFaculty.phone} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewFaculty({...newFaculty, phone: e.target.value})} />
                    </div>
                    <div>
                      <Label>Password</Label>
                      <Input required type="password" value={newFaculty.password} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewFaculty({...newFaculty, password: e.target.value})} />
                    </div>
                    <Button type="submit">Create Account</Button>
                  </form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {faculty.map((f: any) => (
                    <TableRow key={f.id}>
                      <TableCell>{f.id}</TableCell>
                      <TableCell className="font-medium">{f.username}</TableCell>
                      <TableCell>{f.email}</TableCell>
                      <TableCell>{f.phone || "N/A"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>System Audit Log</CardTitle>
              <CardDescription>Track all administrative actions.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Actor ID</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {auditLogs.map((log: any) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-xs">{new Date(log.created_at).toLocaleString()}</TableCell>
                      <TableCell>{log.actor_id}</TableCell>
                      <TableCell><Badge variant="outline">{log.action}</Badge></TableCell>
                      <TableCell>{log.details}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
