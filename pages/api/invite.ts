import type { NextApiRequest, NextApiResponse } from 'next';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.nayeret.ai';
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? 'noreply@nayeret.ai';

function buildEmailHtml(opts: {
  inviterName: string;
  groupName: string;
  groupEmoji: string;
  role: string;
  lang: 'he' | 'en';
}): string {
  const { inviterName, groupName, groupEmoji, role, lang } = opts;
  const isHe = lang === 'he';
  const dir = isHe ? 'rtl' : 'ltr';

  const title = isHe
    ? `הוזמנת לקבוצה "${groupName}" ב-Nayeret.AI`
    : `You're invited to "${groupName}" on Nayeret.AI`;

  const body = isHe
    ? `<b>${inviterName}</b> מזמין/ת אותך להצטרף לקבוצה <b>${groupEmoji} ${groupName}</b> ב-Nayeret.AI בתור <b>${role}</b>.`
    : `<b>${inviterName}</b> has invited you to join the group <b>${groupEmoji} ${groupName}</b> on Nayeret.AI as a <b>${role}</b>.`;

  const cta = isHe ? 'הצטרף לקבוצה' : 'Join the group';

  return `<!DOCTYPE html>
<html dir="${dir}" lang="${lang}">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#0f0f0f;font-family:system-ui,sans-serif;color:#e5e5e5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;margin:40px auto;">
    <tr><td style="background:#1a1a1a;border-radius:16px;padding:36px;border:1px solid #2a2a2a;">
      <!-- Logo / emoji header -->
      <p style="font-size:36px;margin:0 0 24px;text-align:center;">🔒</p>
      <h1 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#ffffff;">${title}</h1>
      <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#a0a0a0;">${body}</p>

      <!-- CTA button -->
      <a href="${APP_URL}"
        style="display:inline-block;background:#5d8a6a;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:10px;font-size:15px;font-weight:600;">
        ${cta} →
      </a>

      <!-- Footer -->
      <p style="margin:32px 0 0;font-size:12px;color:#555555;">
        ${isHe
          ? 'אם לא ציפית להזמנה זו, תוכל/י להתעלם ממנה בבטחה.'
          : "If you weren't expecting this invitation, you can safely ignore it."}
      </p>
    </td></tr>
  </table>
</body>
</html>`;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const { toEmail, inviterName, groupName, groupEmoji, role, lang } = req.body as {
    toEmail: string;
    inviterName: string;
    groupName: string;
    groupEmoji: string;
    role: string;
    lang: 'he' | 'en';
  };

  if (!toEmail || !toEmail.includes('@') || !groupName || !inviterName) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  if (!process.env.RESEND_API_KEY) {
    // Gracefully degrade: log and return success so the UI still saves the member
    console.warn('[invite] RESEND_API_KEY not set — skipping email send');
    return res.status(200).json({ sent: false, reason: 'no_api_key' });
  }

  const isHe = lang === 'he';
  const subject = isHe
    ? `הוזמנת ל-${groupEmoji} ${groupName} ב-Nayeret.AI`
    : `You're invited to ${groupEmoji} ${groupName} on Nayeret.AI`;

  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: toEmail,
      subject,
      html: buildEmailHtml({ inviterName, groupName, groupEmoji, role, lang }),
    });

    if (error) {
      console.error('[invite] Resend error:', error);
      return res.status(502).json({ error: error.message });
    }

    return res.status(200).json({ sent: true });
  } catch (err) {
    console.error('[invite] Unexpected error:', err);
    return res.status(500).json({ error: 'Failed to send invitation' });
  }
}
