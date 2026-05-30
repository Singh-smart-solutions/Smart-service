// Vercel serverless function
// Triggered by Supabase Database Webhook when a new request is inserted
// Sends Telegram notification to all staff in the relevant department

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  // Verify webhook secret
  const secret = req.headers['x-webhook-secret'];
  if (secret !== process.env.WEBHOOK_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { record } = req.body;
    if (!record) return res.status(200).json({ ok: true });

    const {
      hotel_id,
      department,
      service,
      guest_room,
      guest_name,
      notes,
      language,
    } = record;

    if (!hotel_id || !department) return res.status(200).json({ ok: true });

    const BOT_TOKEN = process.env.VITE_TELEGRAM_BOT_TOKEN;
    if (!BOT_TOKEN) return res.status(200).json({ ok: true });

    // Language flags
    const LANG_FLAG = {
      English: '🇺🇸', Arabic: '🇦🇪', Russian: '🇷🇺',
      Hindi: '🇮🇳', French: '🇫🇷', Turkish: '🇹🇷', Chinese: '🇨🇳',
    };
    const flag = LANG_FLAG[language] || '';

    // Fetch SLA limit for this dept
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );

    const { data: slaDat } = await supabase
      .from('sla_settings')
      .select('sla_minutes')
      .eq('department', department)
      .eq('hotel_id', hotel_id)
      .single();
    const slaMin = slaDat?.sla_minutes || 30;

    // Build message
    const msg = `🔔 <b>New Request — ${service}</b>\n`
      + `🏨 Room ${guest_room} · ${guest_name || 'Guest'} ${flag}\n`
      + `📝 ${notes || '—'}\n`
      + `⏰ SLA: ${slaMin} min\n`
      + `👉 <a href="https://smart-service-rho.vercel.app">Open Sentinel Pro</a>`;

    // Fetch all staff in this dept with telegram_chat_id
    const { data: staff } = await supabase
      .from('staff')
      .select('telegram_chat_id, name')
      .eq('hotel_id', hotel_id)
      .eq('department', department)
      .not('telegram_chat_id', 'is', null);

    if (!staff || staff.length === 0) {
      return res.status(200).json({ ok: true, sent: 0 });
    }

    // Send to all staff
    let sent = 0;
    for (const s of staff) {
      if (!s.telegram_chat_id) continue;
      await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: s.telegram_chat_id,
          text: msg,
          parse_mode: 'HTML',
        }),
      });
      sent++;
    }

    res.status(200).json({ ok: true, sent });
  } catch (err) {
    console.error('Notify error:', err);
    res.status(200).json({ ok: true }); // Always 200 to Supabase
  }
}
