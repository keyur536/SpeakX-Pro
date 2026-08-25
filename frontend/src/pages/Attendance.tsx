import { useState, useEffect } from "react";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";

export default function Attendance() {
  const [batches, setBatches] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState<number | null>(null);
  const [students, setStudents] = useState([]); // In a real app we'd fetch students for the batch
  const [attendance, setAttendance] = useState<{ [key: number]: boolean }>({});
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  
  const token = localStorage.getItem("token");

  // Mock students for now - will be replaced with real API call
  useEffect(() => {
    if (selectedBatch) {
      setStudents([{ id: 1, name: "Student 1" }, { id: 2, name: "Student 2" }]);
    }
  }, [selectedBatch]);

  const saveAttendance = async () => {
    if (!selectedBatch) return;
    try {
      const records = Object.entries(attendance).map(([id, isPresent]) => ({
        student_id: parseInt(id),
        is_present: isPresent
      }));
      await axios.post(`http://127.0.0.1:8000/api/v1/attendance/batch/${selectedBatch}`, {
        session_date: date,
        records
      }, { headers: { Authorization: `Bearer ${token}` }});
      alert("Saved");
    } catch (e) {
      console.error(e);
      alert("Error saving");
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold">Attendance</h1>
      <Card>
        <CardHeader>
          <CardTitle>Mark Attendance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4 items-center">
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-48" />
            <Input type="number" placeholder="Batch ID" onChange={(e) => setSelectedBatch(parseInt(e.target.value))} className="w-48" />
            <Button onClick={() => setSelectedBatch(selectedBatch)}>Load</Button>
          </div>
          
          {selectedBatch && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Present</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map((s: any) => (
                  <TableRow key={s.id}>
                    <TableCell>{s.name}</TableCell>
                    <TableCell>
                      <input 
                        type="checkbox" 
                        checked={attendance[s.id] || false}
                        onChange={(e) => setAttendance({...attendance, [s.id]: e.target.checked})}
                        className="w-5 h-5 rounded"
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          <Button onClick={saveAttendance} className="w-full mt-4">Save Attendance</Button>
        </CardContent>
      </Card>
    </div>
  );
}
