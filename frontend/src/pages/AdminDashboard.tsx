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
import { Layers, Users, Activity, FileSpreadsheet } from "lucide-react";
import { NotificationBell } from "@/components/NotificationBell";

export default function AdminDashboard() {
  const [batches, setBatches] = useState([]);
  const token = localStorage.getItem("token");

  useEffect(() => {
    fetchBatches();
  }, []);

  const fetchBatches = async () => {
    try {
      const res = await axios.get("http://127.0.0.1:8000/api/v1/admin/batches", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setBatches(res.data);
    } catch (e) {
      console.error("Failed to load batches", e);
    }
  };

  const [newBatch, setNewBatch] = useState({ course_id: "", name: "", batch_code: "", start_date: "", end_date: "", enrollment_deadline: "" });
  const handleCreateBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.post("http://127.0.0.1:8000/api/v1/admin/batches", newBatch, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchBatches();
    } catch (e) {
      alert("Error creating batch");
    }
  };

  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [selectedBatchId, setSelectedBatchId] = useState("");
  const handleCsvUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!csvFile || !selectedBatchId) return;
    
    const formData = new FormData();
    formData.append("file", csvFile);
    
    try {
      await axios.post(`http://127.0.0.1:8000/api/v1/admin/batches/${selectedBatchId}/students/bulk`, formData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data" 
        }
      });
      alert("Imported successfully");
    } catch (e) {
      alert("Error importing");
    }
  };

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Admin Dashboard</h2>
        <div className="flex items-center space-x-2">
          <NotificationBell />
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="batches">My Batches</TabsTrigger>
          <TabsTrigger value="students">Students</TabsTrigger>
          <TabsTrigger value="faculty">Faculty</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">My Batches</CardTitle>
                <Layers className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{batches.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Students</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">...</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Sessions</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-500">Live</div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="batches" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>My Course Batches</CardTitle>
                <CardDescription>Manage sub-batches for your assigned courses.</CardDescription>
              </div>
              <Dialog>
                <DialogTrigger asChild>
                  <Button><Layers className="mr-2 h-4 w-4"/> New Batch</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create Sub-Batch</DialogTitle>
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
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {batches.map((b: any) => (
                    <TableRow key={b.id}>
                      <TableCell className="font-medium">{b.batch_code}</TableCell>
                      <TableCell>{b.name}</TableCell>
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

        <TabsContent value="students" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Student Import</CardTitle>
              <CardDescription>Bulk enroll students via CSV to a batch.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCsvUpload} className="flex gap-4 items-end">
                <div className="space-y-2">
                  <Label>Batch ID</Label>
                  <Input required type="number" value={selectedBatchId} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSelectedBatchId(e.target.value)} />
                </div>
                <div className="space-y-2 flex-1">
                  <Label>CSV File (Columns: username, email, password)</Label>
                  <Input type="file" accept=".csv" required onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCsvFile(e.target.files?.[0] || null)} />
                </div>
                <Button type="submit"><FileSpreadsheet className="mr-2 h-4 w-4"/> Import</Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="faculty">
          <Card>
            <CardHeader>
              <CardTitle>Assign Faculty</CardTitle>
              <CardDescription>Assign faculty members to your batches using API.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Use the batch detailed view to assign faculty members to specific batches.</p>
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>
    </div>
  );
}
