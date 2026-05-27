import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { chatId, formType, incidentId, incidentRef, assetName, message } = await req.json();
    if (!chatId || !formType || !incidentId) {
      return Response.json({ error: 'Missing required fields: chatId, formType, incidentId' }, { status: 400 });
    }

    const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN');
    if (!TELEGRAM_BOT_TOKEN) return Response.json({ error: 'Telegram bot token not configured' }, { status: 500 });

    // Generate a short-lived token: base64(incidentId:formType:timestamp)
    const tokenPayload = `${incidentId}:${formType}:${Date.now()}`;
    const token = btoa(tokenPayload);

    // Get the app URL from environment or use a default
    const APP_URL = Deno.env.get('APP_URL') || 'https://app.base44.com';
    const formUrl = `${APP_URL}/FieldWorkerForm?token=${encodeURIComponent(token)}`;

    const formLabels = {
      make_safe: '🛡️ Make-Safe Checklist',
      corrective: '🔧 Corrective Work Order Checklist',
    };

    const formLabel = formLabels[formType] || formType;

    const telegramMessage = message || 
      `📋 *Field Worker Form Request*\n\n` +
      `You have been assigned to complete a form:\n\n` +
      `*Form:* ${formLabel}\n` +
      `*Incident:* ${incidentRef || incidentId}\n` +
      `${assetName ? `*Asset:* ${assetName}\n` : ''}` +
      `\n🔗 [Open Form](${formUrl})\n\n` +
      `_This link is valid for 48 hours._`;

    const telegramRes = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: telegramMessage,
        parse_mode: 'Markdown',
        disable_web_page_preview: false,
      }),
    });

    const telegramData = await telegramRes.json();
    if (!telegramData.ok) {
      return Response.json({ error: `Telegram error: ${telegramData.description}` }, { status: 400 });
    }

    // Log to audit trail
    await base44.asServiceRole.entities.IncidentAuditTrail.create({
      incident_id: incidentId,
      action: 'Field Worker Form Sent',
      details: `${formLabel} link sent via Telegram to chat ID: ${chatId}`,
      user: user?.email,
    });

    return Response.json({ success: true, formUrl, token });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});