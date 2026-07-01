// Shared layout wrapping every outbound email. Table-based markup with
// inline CSS only — no <style> blocks, no flexbox/grid — for maximum
// compatibility across email clients (Outlook desktop in particular only
// reliably renders table layouts with inline styles).
//
// All placeholder values (logo, portal URL, support phone/hours/email,
// disclaimer text) are non-real boilerplate per REQUIREMENTS.md §7.1 —
// this is a portfolio project, not a real loan servicer.

const BRAND_NAME = 'Loan Servicing Notification Validator';
const PORTAL_URL = 'https://example-loan-servicing-portal.demo';
const SUPPORT_PHONE = '1-800-555-0100';
const SUPPORT_HOURS = 'Mon\u2013Fri 8am\u20138pm CT';
const SUPPORT_EMAIL = 'support@loanservicing.demo';

const COLORS = {
  bg: '#f4f5f7',
  panel: '#ffffff',
  border: '#e2e4e8',
  textPrimary: '#1a1f29',
  textMuted: '#5b6472',
  accent: '#2155cd',
  footerBg: '#f9fafb',
};

export interface EmailLayoutParams {
  previewText: string; // hidden preheader text, improves inbox preview line
  heading: string;
  bodyHtml: string; // pre-rendered inner HTML for the body slot
}

function renderFooter(): string {
  return `
    <tr>
      <td style="background-color:${COLORS.footerBg}; border-top:1px solid ${COLORS.border}; padding:24px 32px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td style="font-family:Arial,Helvetica,sans-serif; font-size:13px; color:${COLORS.textMuted}; line-height:20px;">
              <p style="margin:0 0 12px 0; font-weight:bold; color:${COLORS.textPrimary};">${BRAND_NAME}</p>

              <p style="margin:0 0 12px 0;">
                <a href="${PORTAL_URL}" style="color:${COLORS.accent}; text-decoration:none;">Visit your Customer Portal</a>
              </p>

              <p style="margin:0 0 4px 0;">
                Customer Support: <strong>${SUPPORT_PHONE}</strong> (${SUPPORT_HOURS})
              </p>
              <p style="margin:0 0 16px 0;">
                Email: <a href="mailto:${SUPPORT_EMAIL}" style="color:${COLORS.accent}; text-decoration:none;">${SUPPORT_EMAIL}</a>
              </p>

              <p style="margin:0; font-size:11px; color:${COLORS.textMuted}; line-height:16px;">
                This communication is provided for informational purposes regarding your account and does not
                constitute an offer of credit. ${BRAND_NAME} is an equal opportunity lender/servicer. Licensed
                where required by applicable state law. This is a demonstration system; no real loan servicing
                activity is associated with this message.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  `;
}

export function renderEmailLayout(params: EmailLayoutParams): string {
  const { previewText, heading, bodyHtml } = params;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="x-apple-disable-message-reformatting" content="yes" />
  <title>${heading}</title>
</head>
<body style="margin:0; padding:0; width:100%; background-color:${COLORS.bg}; -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%;">
  <!-- Preheader: hidden preview text shown in inbox lists, not in the body -->
  <div style="display:none; max-height:0; overflow:hidden; opacity:0; font-size:1px; line-height:1px; color:transparent;">
    ${previewText}
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${COLORS.bg}; table-layout:fixed; min-width:100%;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
               style="width:100%; max-width:600px; margin:0 auto; background-color:${COLORS.panel}; border:1px solid ${COLORS.border}; border-radius:8px; overflow:hidden; table-layout:fixed;">

          <!-- Header / logo placeholder -->
          <tr>
            <td style="padding:24px 24px 20px 24px; border-bottom:1px solid ${COLORS.border};">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="font-family:Arial,Helvetica,sans-serif; font-size:18px; font-weight:bold; color:${COLORS.textPrimary}; word-break:break-word;">
                    ${BRAND_NAME}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:24px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="font-family:Arial,Helvetica,sans-serif; font-size:20px; font-weight:bold; color:${COLORS.textPrimary}; padding-bottom:16px; word-break:break-word;">
                    ${heading}
                  </td>
                </tr>
                <tr>
                  <td style="font-family:Arial,Helvetica,sans-serif; font-size:15px; color:${COLORS.textPrimary}; line-height:24px; word-break:break-word;">
                    ${bodyHtml}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          ${renderFooter()}
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
