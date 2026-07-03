const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';

// ---------------------------------------------------------------------------
// Token storage — localStorage keys
// ---------------------------------------------------------------------------
const KEYS = {
  loginToken:        'lsv_login_token',
  registrationToken: 'lsv_reg_token',
};

export const tokenStore = {
  getLogin:           ()      => localStorage.getItem(KEYS.loginToken),
  setLogin:           (t: string) => localStorage.setItem(KEYS.loginToken, t),
  clearLogin:         ()      => localStorage.removeItem(KEYS.loginToken),

  getRegistration:    ()      => localStorage.getItem(KEYS.registrationToken),
  setRegistration:    (t: string) => localStorage.setItem(KEYS.registrationToken, t),
  clearRegistration:  ()      => localStorage.removeItem(KEYS.registrationToken),
};

// ---------------------------------------------------------------------------
// Core fetch wrapper
// ---------------------------------------------------------------------------
interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  token?: string | null;
}

export interface ApiError {
  error: string;
  errors?: string[];
}

export async function apiFetch<T>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const { method = 'GET', body, token } = options;

  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const data = await res.json();

  if (!res.ok) {
    throw data as ApiError;
  }

  return data as T;
}

// ---------------------------------------------------------------------------
// Typed API calls
// ---------------------------------------------------------------------------

export type PaymentMethod = 'ach_transfer' | 'debit_card' | 'manual';
export type PaymentMethodOrAutopay = PaymentMethod | 'autopay';

export const api = {
  // Registration
  verifyIdentity: (accountNumber: string, last4Ssn: string) =>
    apiFetch<{ registrationToken: string }>('/api/registration/verify-identity', {
      method: 'POST',
      body: { accountNumber, last4Ssn },
    }),

  setupAccount: (token: string, payload: {
    email: string;
    confirmEmail: string;
    password: string;
    confirmPassword: string;
    disclaimerAccepted: boolean;
  }) =>
    apiFetch<{ registrationToken: string }>('/api/registration/setup', {
      method: 'POST',
      token,
      body: payload,
    }),

  verifyOtp: (token: string, code: string) =>
    apiFetch<{ loginToken: string }>('/api/registration/verify-otp', {
      method: 'POST',
      token,
      body: { code },
    }),

  resendOtp: (token: string) =>
    apiFetch<{ message: string }>('/api/registration/resend-otp', {
      method: 'POST',
      token,
    }),

  // Auth
  login: (email: string, password: string) =>
    apiFetch<{ loginToken: string }>('/api/auth/login', {
      method: 'POST',
      body: { email, password },
    }),

  // Dashboard
  getDashboard: (token: string) =>
    apiFetch<DashboardData>('/api/dashboard', { token }),

  toggleAutopay: (token: string, enabled: boolean) =>
    apiFetch<{ autopayEnabled: boolean }>('/api/dashboard/autopay', {
      method: 'PATCH',
      token,
      body: { enabled },
    }),

  // Payment
  makePayment: (token: string, payload: {
    amount: number;
    bankAccountNumber: string;
    bankLast4: string;
    method: PaymentMethod;
  }) =>
    apiFetch<PaymentResult>('/api/payment', {
      method: 'POST',
      token,
      body: payload,
    }),

  listPayments: (token: string) =>
    apiFetch<{ payments: PaymentHistoryEntry[] }>('/api/payments', { token }),

  // Due date change
  changeDueDate: (token: string, newDueDate: string) =>
    apiFetch<DueDateChangeResult>('/api/due-date-change', {
      method: 'POST',
      token,
      body: { newDueDate },
    }),
};

// ---------------------------------------------------------------------------
// Shared response types (mirrors backend response shapes)
// ---------------------------------------------------------------------------
export interface DashboardData {
  accountSummary: {
    customerName: string;
    accountNumber: string;
    vehicle: { make: string; model: string; year: number; vin: string | null; color: string | null };
    ownershipType: 'lease' | 'purchase';
    address: string;
    phone: string | null;
    memberSince: string | null;
  };
  paymentProgress: {
    installmentsPaid: number;
    totalInstallments: number;
  };
  amountDue: {
    isDelinquent: boolean;
    amount: number;
    currentDueDate: string;
  };
  dueDateChangesUsed: number;
  dueDateChangesRemaining: number;
  apr: number | null;
  autopayEnabled: boolean;
  autopayCharged: boolean;
  installmentAmount: number;
  totalAmount: number;
  remainingBalance: number;
}

export interface PaymentResult {
  appliedAmount: number;
  adjustedMessage: string | null;
  balanceRemaining: number;
  installmentsPaid: number;
}

export interface PaymentHistoryEntry {
  date: string;
  method: PaymentMethodOrAutopay;
  amount: number;
}

export interface DueDateChangeResult {
  newDueDate: string;
  changesUsed: number;
  changesRemaining: number;
}