const TOKEN_KEY = 'taxledger.token';

export type User = {
  id: string;
  email: string;
  pan: string;
  name: string;
  role: 'taxpayer' | 'ca' | 'admin';
  defaultTaxRegime: 'old' | 'new';
  createdAt: string;
};

export type Filing = {
  id: string;
  userId: string;
  assessmentYear: string;
  grossIncome: number;
  taxRegime: 'old' | 'new';
  status: 'draft' | 'submitted' | 'processing' | 'assessed' | 'refund_issued';
  computedTax: number;
  submittedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type TaxBreakdown = {
  grossIncome: number;
  assessmentYear: string;
  regime: 'old' | 'new';
  slabTax: number;
  rebate87A: number;
  surcharge: number;
  cess: number;
  finalTax: number;
  formattedTax: string;
};

type ApiErrorBody = {
  error?: { message?: string; code?: string };
};

function baseUrl(): string {
  return import.meta.env.VITE_API_URL ?? '';
}

export function getToken(): string | null {
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null): void {
  if (token) {
    window.localStorage.setItem(TOKEN_KEY, token);
    return;
  }
  window.localStorage.removeItem(TOKEN_KEY);
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (!headers.has('Content-Type') && init.body && !(init.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  const token = getToken();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${baseUrl()}${path}`, { ...init, headers });
  const payload = (await response.json().catch(() => ({}))) as T & ApiErrorBody;
  if (!response.ok) {
    throw new Error(payload.error?.message ?? `Request failed (${response.status})`);
  }
  return payload;
}

export const api = {
  register(body: {
    email: string;
    password: string;
    name: string;
    pan: string;
    defaultTaxRegime: 'old' | 'new';
  }) {
    return request<{ token: string; user: User }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },
  login(body: { email: string; password: string }) {
    return request<{ token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },
  me() {
    return request<{ user: User }>('/auth/me');
  },
  listFilings() {
    return request<{ filings: Filing[] }>('/filings');
  },
  getFiling(id: string) {
    return request<{ filing: Filing }>(`/filings/${id}`);
  },
  createFiling(body: { assessmentYear: string; grossIncome: number; taxRegime: 'old' | 'new' }) {
    return request<{ filing: Filing }>('/filings', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },
  submitFiling(id: string) {
    return request<{ filing: Filing }>(`/filings/${id}/submit`, { method: 'PATCH' });
  },
  payFiling(id: string, amount: number) {
    return request<{ gatewayReference: string }>(`/filings/${id}/payments`, {
      method: 'POST',
      body: JSON.stringify({ amount }),
    });
  },
  calculateTax(body: { grossIncome: number; assessmentYear: string; taxRegime: 'old' | 'new' }) {
    return request<TaxBreakdown>('/tax/calculate', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },
};
