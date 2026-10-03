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
  firstLine: string;
  minimumText: string;
  validText: string;
  imageUrl: string;
    pageUrl: string;
  appUrl: string;
  appScheme: string;
}): string {
  const title = `🎉 Exclusive offer from ${opts.vendorName}`;
  const desc =
    `${opts.firstLine} Code: ${opts.code} • Min order: ${opts.minimumText} • Valid: ${opts.validText}`;

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
  <meta property="og:image:type" content="image/png" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:url" content="${esc(opts.pageUrl)}" />
  <meta name="twitter:card" content="summary_large_image" />
</head>
<body style="margin:0;font-family:Arial,sans-serif;background:#F8E9F6;color:#332633;">
  <div style="background:#7D0C72;color:#fff;padding:28px 24px 60px;">
    <div style="font-size:20px;font-weight:600;">Eventify Hub</div>
    <div style="margin-top:22px;opacity:.9;">Exclusive vendor offer</div>
    <div style="font-size:26px;font-weight:600;margin-top:4px;">A special discount is waiting for you</div>
  </div>

  <div style="max-width:520px;margin:-36px auto 24px;padding:0 16px;">
    <div style="background:#fff;border:1px solid #EAD5E6;border-radius:18px;padding:18px;">
      <div style="color:#766B73;font-size:14px;">Offered by</div>
      <div style="font-size:20px;margin-top:2px;">${esc(opts.vendorName)}</div>
    </div>

    <div style="background:#fff;border:1px solid #EAD5E6;border-radius:18px;padding:26px 18px;margin-top:14px;text-align:center;">
      <div style="letter-spacing:3px;color:#766B73;font-size:14px;">YOU SAVE</div>
      <div style="font-size:52px;font-weight:600;color:#7D0C72;margin-top:6px;">${esc(opts.discountText)}</div>
      <div style="color:#766B73;margin-top:2px;">${esc(opts.firstLine)}</div>

      <div style="margin-top:20px;border:2px dashed #7D0C72;border-radius:14px;background:#F8E9F6;padding:16px;">
        <span id="code" style="font-size:30px;letter-spacing:6px;font-weight:600;color:#7D0C72;">${esc(opts.code)}</span>
        <button onclick="copyCode()" id="cbtn"
          style="margin-left:10px;border:1.5px solid #7D0C72;background:#fff;color:#7D0C72;
                 border-radius:10px;padding:6px 12px;font-size:14px;">Copy</button>
      </div>
    </div>

    <div style="display:flex;gap:12px;margin-top:14px;">
      <div style="flex:1;background:#fff;border:1px solid #EAD5E6;border-radius:16px;padding:16px;">
        <div style="color:#766B73;font-size:13px;">Minimum order</div>
        <div style="font-size:19px;margin-top:4px;">${esc(opts.minimumText)}</div>
      </div>
      <div style="flex:1;background:#fff;border:1px solid #EAD5E6;border-radius:16px;padding:16px;">
        <div style="color:#766B73;font-size:13px;">Valid period</div>
        <div style="font-size:15px;margin-top:4px;">${esc(opts.validText)}</div>
      </div>
    </div>
        <a id="openApp" href="${esc(opts.appScheme)}"
       style="display:block;margin-top:16px;background:#7D0C72;color:#fff;text-decoration:none;
              text-align:center;padding:18px;border-radius:16px;font-size:18px;font-weight:600;">
      Open Eventify Hub &rarr;
    </a>
  </div>

  <script>
    function copyCode() {
      var t = document.getElementById('code').innerText;
      var done = function () { document.getElementById('cbtn').innerText = 'Copied'; };
      if (navigator.clipboard) { navigator.clipboard.writeText(t).then(done); }
      else {
        var r = document.createRange(); r.selectNode(document.getElementById('code'));
        window.getSelection().removeAllRanges(); window.getSelection().addRange(r);
                document.execCommand('copy'); done();
      }
    }

    document.getElementById('openApp').addEventListener('click', function (e) {
      e.preventDefault();
      var fallback = setTimeout(function () {
        alert('Please open the Eventify Hub app and enter the code at checkout.');
      }, 1500);
      window.location = this.getAttribute('href');
      window.addEventListener('pagehide', function () { clearTimeout(fallback); });
    });
  </script>
</body>
</html>`;
}