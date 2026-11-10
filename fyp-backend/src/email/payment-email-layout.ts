/**
 * Shared payment receipt shell for booking and vendor subscription emails.
 * Callers must HTML-escape any user-provided values in the body.
 */
export function renderEventifyPaymentEmail(title: string, body: string): string {
  const safeTitle = title.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#F8E9F6;font-family:Arial,sans-serif;color:#332633;">
  <div style="max-width:650px;margin:30px auto;background:#FFFFFF;border-radius:16px;overflow:hidden;border:1px solid #EAD5E6;">
    <div style="background:#7D0C72;color:#FFFFFF;padding:28px;">
      <div style="font-size:24px;font-weight:700;">Eventify Hub</div>
      <div style="margin-top:8px;font-size:16px;">${safeTitle}</div>
    </div>
    <div style="padding:28px;">
      ${body}
    </div>
  </div>
</body>
</html>`;
}

export function escapeEmailHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function emailReceiptSection(title: string, rows: Array<[string, unknown]>): string {
  return `<div style="margin-top:24px;font-size:17px;font-weight:700;color:#7D0C72;">${escapeEmailHtml(title)}</div>
  <div style="margin-top:12px;padding:18px;background:#FAF5F9;border-radius:12px;">
    ${rows.map(([label, value]) => `<div style="margin-top:8px;"><strong>${escapeEmailHtml(label)}:</strong> ${escapeEmailHtml(value)}</div>`).join('')}
  </div>`;
}
