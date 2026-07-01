import { renderEmailLayout } from './layout';

export function renderRegistrationConfirmationEmail(
  customerName: string,
  accountNumber: string
): { html: string; text: string } {
  const last4 = accountNumber.slice(-4);

  const bodyHtml = `
    <p style="margin:0 0 16px 0;">Hi ${customerName},</p>
    <p style="margin:0 0 16px 0;">
      Your account has been successfully registered. You can now log in to your Customer Portal
      to view your account summary, make payments, and manage your due date.
    </p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 16px 0; width:100%; max-width:320px;">
      <tr>
        <td style="background-color:#f9fafb; border:1px solid #e2e4e8; border-radius:6px; padding:16px;">
          <p style="margin:0; font-size:13px; color:#5b6472; line-height:20px; word-break:break-word;">Account number</p>
          <p style="margin:4px 0 0 0; font-size:16px; font-weight:bold; color:#1a1f29; line-height:24px; word-break:break-word;">
            &bull;&bull;&bull;&bull;&bull;&bull;${last4}
          </p>
        </td>
      </tr>
    </table>

    <p style="margin:0; font-size:13px; color:#5b6472; line-height:20px; word-break:break-word;">
      If you didn't register for this account, please contact Customer Support immediately.
    </p>
  `;

  const html = renderEmailLayout({
    previewText: `Your account ending in ${last4} is now registered.`,
    heading: 'Welcome \u2014 Your account is registered',
    bodyHtml,
  });

  const text =
    `Hi ${customerName}, your account ending in ${last4} has been successfully registered. ` +
    `You can now log in to your Customer Portal to view your account, make payments, and manage your due date.`;

  return { html, text };
}
