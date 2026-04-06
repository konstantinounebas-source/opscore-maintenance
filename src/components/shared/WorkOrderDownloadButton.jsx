import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { useState } from 'react';
import { toast } from '@/components/ui/use-toast';

export default function WorkOrderDownloadButton({ workOrderId, workOrderType, incidentId }) {
  const [loading, setLoading] = useState(false);

  const handleDownload = async () => {
    try {
      setLoading(true);
      const response = await base44.functions.invoke('generateWorkOrderPDF', {
        workOrderId,
        workOrderType,
        incidentId
      });

      if (!response.data) {
        toast({ title: 'Error', description: 'Failed to generate PDF' });
        return;
      }

      // Create blob and download
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${workOrderType.replace(/\s+/g, '_')}_${workOrderId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      toast({ title: 'Error', description: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleDownload}
      disabled={loading}
      className="gap-2"
    >
      <Download className="w-4 h-4" />
      {loading ? 'Generating...' : 'Download PDF'}
    </Button>
  );
}