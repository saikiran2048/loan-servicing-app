import { renderEmailLayout, COLORS } from './layout';

export type PaymentMethod = 'autopay' | 'ach_transfer' | 'debit_card' | 'manual';

export interface PaymentConfirmationEmailParams {
  customerName: string;
  accountNumber: string;
  amount: number;
  paymentDate: Date;
  balanceRemaining: number;
  method?: PaymentMethod;
  // Required for ach_transfer/debit_card/manual; not applicable for
  // autopay, which has no bank details attached to a specific charge.
  bankLast4?: string;
}

function formatCurrency(amount: number): string {
  return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

const METHOD_LABELS: Record<PaymentMethod, string> = {
  autopay: 'Autopay',
  ach_transfer: 'ACH bank transfer',
  debit_card: 'Debit card',
  manual: 'Manual payment',
};

function formatPaymentMethod(params: PaymentConfirmationEmailParams): string {
  if (params.method === 'autopay') {
    return METHOD_LABELS.autopay;
  }
  const methodLabel = params.method ? METHOD_LABELS[params.method] : 'Bank account';
  return params.bankLast4 ? `${methodLabel} \u2022\u2022\u2022\u2022 ${params.bankLast4}` : methodLabel;
}

/**
 * Per REQUIREMENTS.md §7.2: deliberately NO due date field — payment does
 * not affect the due date (only the DDC flow does), so it's intentionally
 * omitted here rather than showing a possibly-misleading unrelated value.
 *
 * Stage 4 addition: the "Bank account" row is now a "Payment method" row,
 * since autopay-triggered charges have no bank details attached.
 */
export function renderPaymentConfirmationEmail(
  params: PaymentConfirmationEmailParams
): { html: string; text: string } {
  const last4 = params.accountNumber.slice(-4);
  const formattedAmount = formatCurrency(params.amount);
  const formattedDate = formatDate(params.paymentDate);
  const formattedBalance = formatCurrency(params.balanceRemaining);
  const methodDisplay = formatPaymentMethod(params);

  const bodyHtml = `
    <p style="margin:0 0 16px 0; line-height:24px; word-break:break-word;">Hi ${params.customerName},</p>
    <p style="margin:0 0 20px 0; line-height:24px; word-break:break-word;">
      We've received your payment for account ending in <strong>${last4}</strong>. Here's a summary:
    </p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
           style="border:1px solid #e2e4e8; border-radius:6px; overflow:hidden; margin:0 0 16px 0; width:100%; max-width:100%; table-layout:fixed;">
      <tr>
        <td style="padding:12px 16px; background-color:${COLORS.accentBg}; border-bottom:1px solid ${COLORS.accentBorder}; font-size:13px; color:${COLORS.textMuted}; width:50%; word-break:break-word;">Amount paid</td>
        <td style="padding:12px 16px; background-color:${COLORS.accentBg}; border-bottom:1px solid ${COLORS.accentBorder}; font-size:14px; font-weight:bold; color:${COLORS.accent}; text-align:right; width:50%; word-break:break-word;">${formattedAmount}</td>
      </tr>
      <tr>
        <td style="padding:12px 16px; border-bottom:1px solid #e2e4e8; font-size:13px; color:#5b6472; word-break:break-word;">Payment date</td>
        <td style="padding:12px 16px; border-bottom:1px solid #e2e4e8; font-size:14px; color:#1a1f29; text-align:right; word-break:break-word;">${formattedDate}</td>
      </tr>
      <tr>
        <td style="padding:12px 16px; border-bottom:1px solid #e2e4e8; font-size:13px; color:#5b6472; word-break:break-word;">Payment method</td>
        <td style="padding:12px 16px; border-bottom:1px solid #e2e4e8; font-size:14px; color:#1a1f29; text-align:right; word-break:break-word;">${methodDisplay}</td>
      </tr>
      <tr>
        <td style="padding:12px 16px; font-size:13px; color:#5b6472; word-break:break-word;">Remaining balance</td>
        <td style="padding:12px 16px; font-size:14px; font-weight:bold; color:#1a1f29; text-align:right; word-break:break-word;">${formattedBalance}</td>
      </tr>
    </table>

    <p style="margin:0; font-size:13px; color:#5b6472; line-height:20px; word-break:break-word;">
      This payment does not change your scheduled due date.
    </p>
  `;

  const html = renderEmailLayout({
    previewText: `We received your payment of ${formattedAmount} on account ending in ${last4}.`,
    heading: `Payment Received \u2014 Account ${last4}`,
    bodyHtml,
  });

  const text =
    `Hi ${params.customerName}, we received your payment of ${formattedAmount} on ${formattedDate} ` +
    `for account ending in ${last4} (${methodDisplay}). ` +
    `Remaining balance: ${formattedBalance}. This payment does not change your scheduled due date.`;

  return { html, text };
}