import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import { jsPDF } from 'npm:jspdf@4.0.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { workOrderId, workOrderType, incidentId } = await req.json();

    if (!workOrderId || !workOrderType || !incidentId) {
      return Response.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // Fetch work order and incident data
    const [workOrder, incident, attachments] = await Promise.all([
      base44.entities.WorkOrders.filter({ id: workOrderId }),
      base44.entities.Incidents.filter({ id: incidentId }),
      base44.entities.IncidentAttachments.filter({ incident_id: incidentId })
    ]);

    if (!workOrder.length || !incident.length) {
      return Response.json({ error: 'Work order or incident not found' }, { status: 404 });
    }

    const wo = workOrder[0];
    const inc = incident[0];

    // Create PDF
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let yPosition = 20;

    // Header
    doc.setFontSize(16);
    doc.setTextColor(0, 0, 0);
    doc.text(`${workOrderType} Form`, 20, yPosition);
    yPosition += 10;

    // Incident Information
    doc.setFontSize(11);
    doc.setTextColor(50, 50, 50);
    doc.text('Incident Information', 20, yPosition);
    yPosition += 6;

    doc.setFontSize(10);
    doc.setTextColor(80, 80, 80);
    const incidentInfo = [
      [`Incident ID:`, inc.incident_id],
      [`Title:`, inc.title],
      [`Asset:`, inc.related_asset_name || '—'],
      [`Status:`, inc.status],
      [`Priority:`, inc.priority],
      [`Reported Date:`, inc.reported_date || '—'],
      [`Description:`, inc.description || '—']
    ];

    incidentInfo.forEach(([label, value]) => {
      if (yPosition > pageHeight - 40) {
        doc.addPage();
        yPosition = 20;
      }
      doc.text(`${label}`, 20, yPosition);
      const wrappedValue = doc.splitTextToSize(String(value || '—'), pageWidth - 90);
      doc.text(wrappedValue, 100, yPosition);
      yPosition += wrappedValue.length > 1 ? wrappedValue.length * 4 + 2 : 6;
    });

    // Work Order Information
    yPosition += 4;
    doc.setFontSize(11);
    doc.setTextColor(50, 50, 50);
    doc.text('Work Order Information', 20, yPosition);
    yPosition += 6;

    doc.setFontSize(10);
    doc.setTextColor(80, 80, 80);
    const woInfo = [
      [`Work Order ID:`, wo.work_order_id],
      [`Type:`, workOrderType],
      [`Title:`, wo.title],
      [`Status:`, wo.status],
      [`Assigned To:`, wo.assigned_to || '—'],
      [`Due Date:`, wo.due_date || '—`'],
      [`Description:`, wo.description || '—']
    ];

    woInfo.forEach(([label, value]) => {
      if (yPosition > pageHeight - 40) {
        doc.addPage();
        yPosition = 20;
      }
      doc.text(`${label}`, 20, yPosition);
      const wrappedValue = doc.splitTextToSize(String(value || '—'), pageWidth - 90);
      doc.text(wrappedValue, 100, yPosition);
      yPosition += wrappedValue.length > 1 ? wrappedValue.length * 4 + 2 : 6;
    });

    // Attachments section
    const relevantAttachments = attachments.filter(a => a.file_type === 'Photo');
    if (relevantAttachments.length > 0) {
      yPosition += 4;
      if (yPosition > pageHeight - 40) {
        doc.addPage();
        yPosition = 20;
      }

      doc.setFontSize(11);
      doc.setTextColor(50, 50, 50);
      doc.text('Attached Photos', 20, yPosition);
      yPosition += 6;

      doc.setFontSize(9);
      doc.setTextColor(80, 80, 80);
      relevantAttachments.slice(0, 5).forEach((att, idx) => {
        if (yPosition > pageHeight - 40) {
          doc.addPage();
          yPosition = 20;
        }
        doc.text(`${idx + 1}. ${att.file_name}`, 25, yPosition);
        yPosition += 5;
      });

      if (relevantAttachments.length > 5) {
        doc.text(`... and ${relevantAttachments.length - 5} more`, 25, yPosition);
      }
    }

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`,
      20,
      pageHeight - 10
    );

    const pdfBytes = doc.output('arraybuffer');

    return new Response(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${workOrderType.replace(/\s+/g, '_')}_${wo.work_order_id}.pdf"`
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});