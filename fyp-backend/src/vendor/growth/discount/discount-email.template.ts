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

export function buildDiscountOfferEmail(
  data: DiscountEmailTemplateData,
): string {
  const vendorBrandName =
    escapeHtml(data.vendorBrandName);

  const code = escapeHtml(data.code);
  const discountText =
    escapeHtml(data.discountText);

  const startDate =
    escapeHtml(data.startDate);

  const endDate =
    escapeHtml(data.endDate);

  const minimumOrderText =
    data.minimumOrder > 0
      ? `Rs ${data.minimumOrder.toLocaleString()}`
      : 'No minimum';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta
    name="viewport"
    content="width=device-width, initial-scale=1.0"
  />
</head>

<body style="
  margin:0;
  padding:0;
  background:#f5f5f5;
  font-family:Arial,Helvetica,sans-serif;
  color:#332633;
">
  <table
    role="presentation"
    width="100%"
    cellspacing="0"
    cellpadding="0"
    border="0"
    style="padding:30px 12px;background:#f5f5f5;"
  >
    <tr>
      <td align="center">

        <table
          role="presentation"
          width="100%"
          cellspacing="0"
          cellpadding="0"
          border="0"
          style="
            max-width:700px;
            background:#faeefa;
            border-radius:18px;
            overflow:hidden;
            border:1px solid #ead5e6;
          "
        >

          <!-- HEADER -->
          <tr>
            <td style="
              background:#850665;
              padding:28px 28px 38px;
              color:#ffffff;
            ">
              <table
                role="presentation"
                width="100%"
                cellspacing="0"
                cellpadding="0"
              >
                <tr>
                  <td style="
                    font-size:22px;
                    font-weight:700;
                  ">
                    Eventify Hub
                  </td>

                  <td
                    align="right"
                    style="font-size:13px;"
                  >
                    <span style="
                      display:inline-block;
                      background:#ffd166;
                      color:#7a3e00;
                      padding:8px 16px;
                      border-radius:20px;
                      font-weight:700;
                    ">
                      Limited time
                    </span>
                  </td>
                </tr>
              </table>

              <div style="
                margin-top:30px;
                font-size:14px;
                opacity:0.92;
              ">
                Exclusive vendor offer
              </div>

              <div style="
                margin-top:6px;
                font-size:27px;
                line-height:34px;
                font-weight:700;
              ">
                A special discount is waiting for you
              </div>
            </td>
          </tr>

          <!-- VENDOR -->
          <tr>
            <td style="padding:0 20px;">
              <table
                role="presentation"
                width="100%"
                cellspacing="0"
                cellpadding="0"
                style="
                  margin-top:-20px;
                  background:#ffffff;
                  border:1px solid #ead5e6;
                  border-radius:16px;
                "
              >
                <tr>
                  <td style="padding:20px;">

                    <div style="
                      font-size:13px;
                      color:#766b73;
                    ">
                      Offered by
                    </div>

                    <div style="
                      margin-top:4px;
                      font-size:18px;
                      font-weight:700;
                      color:#332633;
                    ">
                      ${vendorBrandName}
                    </div>

                    <div style="
                      margin-top:6px;
                      font-size:13px;
                      color:#850665;
                    ">
                      Vendor on Eventify Hub
                    </div>

                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- DISCOUNT -->
          <tr>
            <td style="padding:18px 20px 0;">
              <table
                role="presentation"
                width="100%"
                cellspacing="0"
                cellpadding="0"
                style="
                  background:#ffffff;
                  border:1px solid #ead5e6;
                  border-radius:16px;
                "
              >
                <tr>
                  <td
                    align="center"
                    style="padding:28px 20px 18px;"
                  >
                    <div style="
                      font-size:13px;
                      letter-spacing:2px;
                      color:#766b73;
                    ">
                      YOU SAVE
                    </div>

                    <div style="
                      margin-top:8px;
                      font-size:42px;
                      line-height:50px;
                      font-weight:700;
                      color:#850665;
                    ">
                      ${discountText}
                    </div>

                    <div style="
                      margin-top:4px;
                      font-size:14px;
                      color:#766b73;
                    ">
                      on your next eligible booking
                      with this vendor
                    </div>
                  </td>
                </tr>

                <tr>
                  <td style="padding:0 20px;">
                    <div style="
                      border-top:1px dashed #dfbed7;
                    "></div>
                  </td>
                </tr>

                <tr>
                  <td
                    align="center"
                    style="padding:20px;"
                  >
                    <div style="
                      font-size:13px;
                      letter-spacing:1.5px;
                      color:#766b73;
                    ">
                      YOUR PROMO CODE
                    </div>

                    <div style="
                      margin-top:10px;
                      background:#faeefa;
                      border:1px dashed #850665;
                      border-radius:12px;
                      padding:17px;
                      font-size:27px;
                      letter-spacing:5px;
                      font-weight:700;
                      color:#850665;
                    ">
                      ${code}
                    </div>

                    <div style="
                      margin-top:8px;
                      font-size:12px;
                      color:#850665;
                    ">
                      Copy this code and enter it at checkout
                    </div>
                  </td>
                </tr>

              </table>
            </td>
          </tr>

          <!-- DETAILS -->
          <tr>
            <td style="padding:16px 20px 0;">
              <table
                role="presentation"
                width="100%"
                cellspacing="0"
                cellpadding="0"
              >
                <tr>

                  <td
                    width="48%"
                    style="
                      background:#ffffff;
                      border:1px solid #ead5e6;
                      border-radius:14px;
                      padding:18px;
                    "
                  >
                    <div style="
                      font-size:12px;
                      color:#766b73;
                    ">
                      Minimum order
                    </div>

                    <div style="
                      margin-top:5px;
                      font-size:17px;
                      font-weight:700;
                    ">
                      ${minimumOrderText}
                    </div>
                  </td>

                  <td width="4%"></td>

                  <td
                    width="48%"
                    style="
                      background:#ffffff;
                      border:1px solid #ead5e6;
                      border-radius:14px;
                      padding:18px;
                    "
                  >
                    <div style="
                      font-size:12px;
                      color:#766b73;
                    ">
                      Valid period
                    </div>

                    <div style="
                      margin-top:5px;
                      font-size:15px;
                      font-weight:700;
                    ">
                      ${startDate} to ${endDate}
                    </div>
                  </td>

                </tr>
              </table>
            </td>
          </tr>

          <!-- REDEEM -->
          <tr>
            <td style="padding:16px 20px 0;">
              <table
                role="presentation"
                width="100%"
                cellspacing="0"
                cellpadding="0"
                style="
                  background:#ffffff;
                  border:1px solid #ead5e6;
                  border-radius:14px;
                "
              >
                <tr>
                  <td style="padding:20px;">

                    <div style="
                      font-size:18px;
                      font-weight:700;
                      margin-bottom:16px;
                    ">
                      How to redeem
                    </div>

                    <div style="
                      font-size:14px;
                      line-height:28px;
                    ">
                      <strong style="color:#850665;">
                        1.
                      </strong>
                      Open Eventify Hub and choose
                      this vendor's service.
                      <br />

                      <strong style="color:#850665;">
                        2.
                      </strong>
                      ${
                        data.minimumOrder > 0
                          ? `Add services worth ${minimumOrderText} or more to your order.`
                          : 'Choose an eligible service or package.'
                      }
                      <br />

                      <strong style="color:#850665;">
                        3.
                      </strong>
                      Enter
                      <strong style="color:#850665;">
                        ${code}
                      </strong>
                      at checkout to apply your discount.
                    </div>

                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- CTA -->
          <tr>
            <td style="padding:18px 20px;">
              <div style="
                background:#850665;
                color:#ffffff;
                padding:17px 20px;
                border-radius:12px;
                text-align:center;
                font-size:16px;
                font-weight:700;
              ">
                Claim offer on Eventify Hub
              </div>
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td
              align="center"
              style="
                border-top:1px solid #ead5e6;
                padding:22px 25px 26px;
                color:#766b73;
              "
            >
              <div style="
                font-size:12px;
                line-height:20px;
              ">
                Offer valid only on eligible bookings
                from ${vendorBrandName} between
                ${startDate} and ${endDate}.
                Discount eligibility is verified
                at checkout.
              </div>

              <div style="
                margin-top:14px;
                font-size:13px;
                font-weight:700;
                color:#850665;
              ">
                Eventify Hub
              </div>

              <div style="
                margin-top:5px;
                font-size:12px;
              ">
                Seamless event planning.
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