// Vercel serverless function — receives Telegram webhook updates
// When staff clicks the bot link, saves their chat_id to staff table

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY // needs service key to update staff table
);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  // Verify webhook secret
  const secret = req.headers['x-webhook-secret'];
  if (process.env.WEBHOOK_SECRET && secret !== process.env.WEBHOOK_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { message } = req.body;
    if (!message?.text || !message?.chat?.id) return res.status(200).end();

    const chatId = String(message.chat.id);
    const text = message.text.trim();

    // /start STAFF_UUID — link staff account to this Telegram chat
    if (text.startsWith('/start ')) {
      const staffId = text.replace('/start ', '').trim();

      if (staffId) {
        const { data: staff } = await supabase
          .from('staff')
          .select('id, name')
          .eq('id', staffId)
          .single();

        if (staff) {
          await supabase
            .from('staff')
            .update({ telegram_chat_id: chatId })
            .eq('id', staffId);

          // Welcome message
          await fetch(`https://api.telegram.org/bot${process.env.VITE_TELEGRAM_BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              text: `✅ <b>Sentinel Pro Connected!</b>\n\nHello ${staff.name}! You will now receive notifications for new guest requests and SLA alerts.\n\nLogin at: https://smart-service-rho.vercel.app`,
              parse_mode: 'HTML',
            }),
          });
        } else {
          await fetch(`https://api.telegram.org/bot${process.env.VITE_TELEGRAM_BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              text: '❌ Staff account not found. Please use the link from your Sentinel Pro profile.',
            }),
          });
        }
      }
    }

    res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Telegram webhook error:', err);
    res.status(200).json({ ok: true }); // Always return 200 to Telegram
  }
}
