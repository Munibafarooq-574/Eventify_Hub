interface DiscountEmailTemplateData {
  vendorBrandName: string;
  code: string;
  discountText: string;
  minimumOrder: number;
  startDate: string;
  endDate: string;
}

const escapeHtml = (value: unknown): string =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

// Email clients me emoji/icon fonts unreliable hote hain (image me boxes
// aa rahe the), isliye icons ki jagah simple text/CSS use kiya hai.
const BRAND = '#7D0C72';
const BRAND_LIGHT = '#F8E9F6';
const BORDER = '#EAD5E6';
const MUTED = '#766B73';
const TEXT = '#332633';


export function buildDiscountOfferEmail(
  data: DiscountEmailTemplateData,
): string {
  const vendorBrandName = escapeHtml(data.vendorBrandName);
  const code = escapeHtml(data.code);
  const startDate = escapeHtml(data.startDate);
  const endDate = escapeHtml(data.endDate);

  // discountText example: "15% OFF" ya "Rs. 500 OFF"
  // Isko big value + chhote "OFF" me todte hain
  const rawDiscount = String(data.discountText ?? '');
  const discountMatch = rawDiscount.match(/^(.*?)\s*OFF$/i);
  const discountValue = escapeHtml(
    (discountMatch ? discountMatch[1] : rawDiscount).trim(),
  );

  const minimumOrderText =
    data.minimumOrder > 0
      ? `Rs ${data.minimumOrder.toLocaleString()}`
      : 'No minimum';

  const vendorInitials = escapeHtml(
    (data.vendorBrandName || 'V')
      .trim()
      .split(/\s+/)
      .map((w) => w[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'V',
  );

  const step2 =
    data.minimumOrder > 0
      ? `Add items worth ${minimumOrderText} or more to your order`
      : 'Choose an eligible service or package';

  const stepRow = (num: number, content: string) => `
    <tr>
      <td width="34" valign="top" style="padding:6px 0;">
        <div style="
          width:28px;height:28px;line-height:28px;
          background:${BRAND};color:#ffffff;
          border-radius:14px;text-align:center;
          font-size:13px;font-weight:700;
        ">${num}</div>
      </td>
      <td valign="middle" style="
        padding:6px 0 6px 12px;
        font-size:15px;color:${TEXT};
      ">${content}</td>
    </tr>`;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>

<body style="margin:0;padding:0;background:#fafafa;font-family:Arial,Helvetica,sans-serif;color:${TEXT};">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"
    style="padding:24px 12px;background:#fafafa;">
    <tr>
      <td align="center">

        <!-- OUTER CARD -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"
          style="max-width:640px;background:${BRAND_LIGHT};border-radius:16px;overflow:hidden;border:1px solid ${BORDER};">

          <!-- HEADER -->
          <tr>
            <td style="background:${BRAND};padding:28px 32px 70px;color:#ffffff;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="font-size:22px;font-weight:600;color:#ffffff;">
                    Eventify Hub
                  </td>
                  <td align="right">
                    <span style="
                      display:inline-block;background:#FFD166;color:#7A3E00;
                      padding:8px 18px;border-radius:20px;
                      font-size:14px;font-weight:600;
                    ">Limited time</span>
                  </td>
                </tr>
              </table>

              <div style="margin-top:34px;font-size:16px;color:#f3dcef;">
                Exclusive vendor offer
              </div>
              <div style="margin-top:6px;font-size:29px;line-height:36px;font-weight:600;color:#ffffff;">
                A special discount is waiting for you
              </div>
            </td>
          </tr>

          <!-- VENDOR CARD (overlaps header) -->
          <tr>
            <td style="padding:0 22px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"
                style="margin-top:-48px;background:#ffffff;border:1px solid ${BORDER};border-radius:18px;">
                <tr>
                  <td style="padding:22px;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td width="76" valign="middle">
                          <div style="
                            width:72px;height:72px;line-height:72px;
                            border:2px solid ${BRAND};border-radius:36px;
                            text-align:center;font-size:24px;color:${BRAND};
                            background:#ffffff;
                          ">${vendorInitials}</div>
                        </td>
                        <td valign="middle" style="padding-left:16px;">
                          <div style="font-size:14px;color:${MUTED};">Offered by</div>
                          <div style="margin-top:3px;font-size:21px;color:${TEXT};">
                            ${vendorBrandName}
                          </div>
                          <div style="margin-top:5px;font-size:14px;color:${BRAND};">
                            &#10003; Verified vendor on Eventify Hub
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- DISCOUNT + PROMO CODE CARD -->
          <tr>
            <td style="padding:20px 22px 0;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"
                style="background:#ffffff;border:1px solid ${BORDER};border-radius:18px;">
                <tr>
                  <td align="center" style="padding:32px 20px 22px;">
                    <div style="font-size:15px;letter-spacing:3px;color:${MUTED};">YOU SAVE</div>
                    <div style="margin-top:10px;color:${BRAND};">
                      <span style="font-size:64px;line-height:70px;font-weight:600;">${discountValue}</span>
                      <span style="font-size:30px;font-weight:500;">&nbsp;OFF</span>
                    </div>
                    <div style="margin-top:6px;font-size:16px;color:${MUTED};">
                      on your next booking with this vendor
                    </div>
                  </td>
                </tr>

                <tr>
                  <td style="padding:0 30px;">
                    <div style="border-top:1px dashed #E3C3DD;"></div>
                  </td>
                </tr>

                <tr>
                  <td align="center" style="padding:24px 24px 28px;">
                    <div style="font-size:15px;letter-spacing:2.5px;color:${MUTED};">YOUR PROMO CODE</div>
                    <div style="
                      margin-top:14px;background:${BRAND_LIGHT};
                      border:2px dashed ${BRAND};border-radius:14px;
                      padding:22px 12px;
                      font-size:40px;letter-spacing:8px;font-weight:600;color:${BRAND};
                    ">${code}</div>
                    <div style="margin-top:10px;font-size:13px;color:${BRAND};">
                      Long-press / select the code to copy it
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- MINIMUM ORDER + VALID PERIOD -->
          <tr>
            <td style="padding:16px 22px 0;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td width="49%" valign="top" style="background:#ffffff;border:1px solid ${BORDER};border-radius:16px;padding:20px;">
                    <div style="font-size:14px;color:${MUTED};">Minimum order</div>
                    <div style="margin-top:6px;font-size:21px;color:${TEXT};">${minimumOrderText}</div>
                  </td>
                  <td width="2%"></td>
                  <td width="49%" valign="top" style="background:#ffffff;border:1px solid ${BORDER};border-radius:16px;padding:20px;">
                    <div style="font-size:14px;color:${MUTED};">Valid period</div>
                    <div style="margin-top:6px;font-size:19px;color:${TEXT};">${startDate} to ${endDate}</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- HOW TO REDEEM -->
          <tr>
            <td style="padding:16px 22px 0;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"
                style="background:#ffffff;border:1px solid ${BORDER};border-radius:16px;">
                <tr>
                  <td style="padding:22px 26px;">
                    <div style="font-size:20px;color:${TEXT};margin-bottom:14px;">How to redeem</div>
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                      ${stepRow(1, "Open Eventify Hub and choose this vendor's service")}
                      ${stepRow(2, step2)}
                      ${stepRow(
                        3,
                        `Enter <span style="color:${BRAND};">${code}</span> at checkout to apply your discount`,
                      )}
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- CTA BUTTON -->
          <tr>
            <td style="padding:18px 22px 22px;">
                            <div style="
                display:block;background:${BRAND};color:#ffffff;
                padding:22px 20px;border-radius:16px;text-align:center;
                font-size:18px;font-weight:600;
              ">Open the Eventify Hub app to claim this offer</div>
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td align="center" style="border-top:1px solid ${BORDER};padding:26px 28px 30px;color:${MUTED};">
              <div style="font-size:14px;line-height:22px;">
                Offer valid only on orders from this vendor between ${startDate} and ${endDate}.
                Cannot be combined with other offers.
              </div>

              <div style="margin-top:12px;font-size:14px;">
                Eventify Hub, seamless event planning.
              </div>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
}