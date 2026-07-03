import { renderEmailLayout, COLORS } from './layout';

export function renderOtpEmail(otp: string, expiryMinutes: number): { html: string; text: string } {
  const bodyHtml = `
    <p style="margin:0 0 20px 0;">
      Use the verification code below to complete your registration. This code expires in
      <strong>${expiryMinutes} minutes</strong>.
    </p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto 20px auto; max-width:320px; width:100%;">
      <tr>
        <td align="center" style="background-color:${COLORS.accentBg}; border:1px solid ${COLORS.accentBorder}; border-radius:8px; padding:20px; word-break:break-word;">
          <span style="display:block; width:100%; font-family:'Courier New',Courier,monospace; font-size:28px; font-weight:bold; letter-spacing:8px; color:${COLORS.textPrimary}; text-align:center;">
            ${otp}
          </span>
        </td>
      </tr>
    </table>

    <p style="margin:0; font-size:13px; color:${COLORS.textMuted}; line-height:20px;">
      If you didn't request this code, you can safely ignore this email.
    </p>
  `;

  const html = renderEmailLayout({
    previewText: `Your verification code is ${otp}`,
    heading: 'Your verification code',
    bodyHtml,
  });

  const text =
    `Your verification code is ${otp}. It expires in ${expiryMinutes} minutes. ` +
    `If you didn't request this code, you can safely ignore this email.`;

  return { html, text };
}