import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const token = Deno.env.get('TELEGRAM_BOT_TOKEN');
    if (!token) return Response.json({ error: 'No TELEGRAM_BOT_TOKEN set' }, { status: 500 });

    const res = await fetch(`https://api.telegram.org/bot${token}/getMe`);
    const data = await res.json();

    return Response.json(data);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});