import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { useState } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { generatePDFFromHtml } from '@/lib/generatePDFFromHtml';

export default function WorkOrderDownloadButton({ workOrderId, workOrderType, incidentId }) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleDownload = async () => {
    try {
      setLoading(true);
      const response = await base44.functions.invoke('generateWorkOrderPDF', {
        workOrderId,
        workOrderType,
        incidentId,
      });

      const { html, fileName } = response.data;
      if (!html) {
        toast({ title: 'Error', description: 'Failed to generate PDF' });
        return;
      }

      await generatePDFFromHtml(html, fileName);
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