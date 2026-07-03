import { renderEmailLayout, COLORS } from './layout';

export interface DueDateChangeConfirmationEmailParams {
  customerName: string;
  accountNumber: string;
  previousDueDate: Date;
  newDueDate: Date;
  changesRemaining: number;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

export function renderDueDateChangeConfirmationEmail(
  params: DueDateChangeConfirmationEmailParams
): { html: string; text: string } {
  const last4 = params.accountNumber.slice(-4);
  const formattedPrevious = formatDate(params.previousDueDate);
  const formattedNew = formatDate(params.newDueDate);
  const changesLabel = params.changesRemaining === 1 ? 'change' : 'changes';

  const bodyHtml = `
    <p style="margin:0 0 16px 0;">Hi ${params.customerName},</p>
    <p style="margin:0 0 20px 0;">
      Your due date for account ending in <strong>${last4}</strong> has been updated.
    </p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
           style="margin:0 0 16px 0; width:100%; max-width:100%; font-size:0; line-height:0;">
      <tr>
        <td style="display:inline-block; vertical-align:top; width:100%; max-width:260px; font-size:16px; line-height:24px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
                 style="background-color:${COLORS.footerBg}; border:1px solid ${COLORS.border}; border-radius:6px; padding:14px 16px; text-align:center;">
            <tr>
              <td>
                <p style="margin:0; font-size:12px; color:${COLORS.textMuted};">Previous due date</p>
                <p style="margin:6px 0 0 0; font-size:15px; font-weight:bold; color:${COLORS.textPrimary}; text-decoration:line-through; opacity:0.6;">${formattedPrevious}</p>
              </td>
            </tr>
          </table>
        </td>
        <td style="display:inline-block; vertical-align:top; width:100%; max-width:16px; font-size:1px; line-height:1px;">&nbsp;</td>
        <td style="display:inline-block; vertical-align:top; width:100%; max-width:260px; font-size:16px; line-height:24px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
                 style="background-color:${COLORS.accentBg}; border:1px solid ${COLORS.accentBorder}; border-radius:6px; padding:14px 16px; text-align:center;">
            <tr>
              <td>
                <p style="margin:0; font-size:12px; color:${COLORS.textMuted};">New due date</p>
                <p style="margin:6px 0 0 0; font-size:15px; font-weight:bold; color:${COLORS.accent};">${formattedNew}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <p style="margin:0; font-size:13px; color:${COLORS.textMuted}; line-height:20px; word-break:break-word;">
      You have <strong>${params.changesRemaining}</strong> due date ${changesLabel} remaining for this account.
    </p>
  `;

  const html = renderEmailLayout({
    previewText: `Your due date changed from ${formattedPrevious} to ${formattedNew}.`,
    heading: `Due Date Updated \u2014 Account ${last4}`,
    bodyHtml,
  });

  const text =
    `Hi ${params.customerName}, your due date for account ending in ${last4} has been updated ` +
    `from ${formattedPrevious} to ${formattedNew}. You have ${params.changesRemaining} due date ${changesLabel} remaining.`;

  return { html, text };
}