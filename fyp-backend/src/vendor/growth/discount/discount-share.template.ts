const esc = (v: unknown): string =>
  String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

// WhatsApp preview ke liye 1200x630 banner (SVG -> sharp se PNG)
export function buildShareBannerSvg(discountText: string, code: string): string {
  const big = discountText.replace(/\s*OFF$/i, '').trim();
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#8A0C7C"/>
      <stop offset="1" stop-color="#5E0A56"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#g)"/>
  <circle cx="1090" cy="80" r="190" fill="#ffffff" fill-opacity="0.10"/>
  <circle cx="90" cy="600" r="120" fill="#ffffff" fill-opacity="0.08"/>
  <text x="80" y="140" font-family="Arial, Helvetica, sans-serif" font-size="38"
        letter-spacing="6" fill="#F3DCEF">EVENTIFY HUB</text>
  <text x="80" y="340" font-family="Arial, Helvetica, sans-serif" font-size="190"
        font-weight="700" fill="#FFFFFF">${esc(big)}<tspan font-size="110" dx="20">OFF</tspan></text>
  <rect x="80" y="400" rx="22" ry="22" width="620" height="130" fill="#F8E9F6"
        stroke="#FFFFFF" stroke-width="3" stroke-dasharray="12 8"/>
  <text x="120" y="480" font-family="Arial, Helvetica, sans-serif" font-size="40"
        fill="#766B73">CODE</text>
  <text x="250" y="485" font-family="Arial, Helvetica, sans-serif" font-size="68"
        font-weight="700" letter-spacing="8" fill="#7D0C72">${esc(code)}</text>
</svg>`;
}

// Link kholne par yeh page aata hai (WhatsApp crawler isi ke og tags padhta hai)
export function buildSharePageHtml(opts: {
  vendorName: string;
  code: string;
  discountText: string;
  imageUrl: string;
  pageUrl: string;
}): string {
  const title = `${opts.discountText} from ${opts.vendorName}`;
  const desc = `Use code ${opts.code} at checkout on Eventify Hub.`;
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${esc(title)}</title>
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="Eventify Hub" />
  <meta property="og:title" content="${esc(title)}" />
  <meta property="og:description" content="${esc(desc)}" />
  <meta property="og:image" content="${esc(opts.imageUrl)}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:url" content="${esc(opts.pageUrl)}" />
  <meta name="twitter:card" content="summary_large_image" />
</head>
<body style="font-family:Arial,sans-serif;text-align:center;padding:40px;background:#F8E9F6;color:#332633;">
  <h2 style="color:#7D0C72;">${esc(opts.discountText)}</h2>
  <p>Offer from <b>${esc(opts.vendorName)}</b></p>
  <p>Use code</p>
  <div style="display:inline-block;border:2px dashed #7D0C72;padding:14px 28px;
              font-size:28px;letter-spacing:6px;color:#7D0C72;background:#fff;border-radius:12px;">
    ${esc(opts.code)}
  </div>
  <p style="margin-top:24px;">Open the Eventify Hub app and enter this code at checkout.</p>
</body>
</html>`;
}