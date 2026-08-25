import { useState } from "react";
import axios from "axios";
import { Award } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CertificateButton({ batchId, disabled = false }: { batchId: number, disabled?: boolean }) {
  const [loading, setLoading] = useState(false);
  
  const handleDownload = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(
        `http://127.0.0.1:8000/api/v1/certificates/batch/${batchId}/download`,
        {
          headers: { Authorization: `Bearer ${token}` },
          responseType: "blob", // Important for downloading files
        }
      );
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `Certificate_Batch_${batchId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.detail || "Failed to download certificate. Is the batch completed?");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button 
      variant="outline" 
      size="sm" 
      onClick={handleDownload} 
      disabled={loading || disabled}
      className="bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100 dark:bg-blue-900/20 dark:border-blue-900 dark:text-blue-400 dark:hover:bg-blue-900/40"
    >
      <Award className="w-4 h-4 mr-2" />
      {loading ? "Generating..." : "Download Certificate"}
    </Button>
  );
}
