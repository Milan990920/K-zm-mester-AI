const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface CurrentUser {
  id: string;
  tenant_id: string | null;
  role: string;
}

export interface DocumentUploadResult {
  id: string;
  original_filename: string;
  status: "uploaded" | "processing" | "done" | "failed" | "needs_review";
  is_digital: boolean | null;
  page_count: number | null;
}

export interface Invoice {
  id: string;
  provider_id: string | null;
  consumption_point_id: string | null;
  utility_type: string;
  secondary_utility_types: string[];
  invoice_type: string;
  delivery_format: string;
  invoice_number: string | null;
  invoice_date: string | null;
  due_date: string | null;
  billing_period_start: string | null;
  billing_period_end: string | null;
  pod: string | null;
  net_amount: number | null;
  vat_amount: number | null;
  gross_amount: number | null;
  amount_due: number | null;
  currency: string;
  validation_status: "pending" | "valid" | "invalid" | "needs_review";
  processing_status: "queued" | "processing" | "done" | "failed" | "needs_review";
}

export interface MonthlyCost {
  month: string;
  gross_amount_sum: number;
  currency: string;
}

export interface MonthlyConsumption {
  month: string;
  utility_type: string;
  consumption_unit: string | null;
  consumption_sum: number;
}

export interface DashboardSummary {
  monthly_costs: MonthlyCost[];
  monthly_consumption: MonthlyConsumption[];
  yearly_total_cost: number;
  yearly_total_cost_currency: string;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new ApiError(body?.detail ?? "Ismeretlen hiba történt", response.status);
  }

  return response.json() as Promise<T>;
}

export function login(email: string, password: string): Promise<TokenResponse> {
  return request<TokenResponse>("/api/v1/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export function fetchCurrentUser(accessToken: string): Promise<CurrentUser> {
  return request<CurrentUser>("/api/v1/users/me", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export async function uploadDocument(
  accessToken: string,
  file: File,
): Promise<DocumentUploadResult> {
  const formData = new FormData();
  formData.append("file", file);

  // Deliberately not going through `request()` — it forces a JSON
  // Content-Type header, which would break the browser's multipart
  // boundary for FormData uploads.
  const response = await fetch(`${API_BASE_URL}/api/v1/documents`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: formData,
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new ApiError(body?.detail ?? "A feltöltés sikertelen volt", response.status);
  }

  return response.json() as Promise<DocumentUploadResult>;
}

export function listInvoices(accessToken: string): Promise<Invoice[]> {
  return request<Invoice[]>("/api/v1/invoices", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export interface InvoiceSite {
  id: string;
  site_address: string;
  site_identifier: string | null;
  meter_serial_number: string | null;
  consumption_value: number | null;
  consumption_unit: string | null;
  gross_amount: number | null;
}

export function fetchInvoiceSites(accessToken: string, invoiceId: string): Promise<InvoiceSite[]> {
  return request<InvoiceSite[]>(`/api/v1/invoices/${invoiceId}/sites`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export function fetchDashboardSummary(accessToken: string): Promise<DashboardSummary> {
  return request<DashboardSummary>("/api/v1/dashboard/summary", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export async function exportInvoices(
  accessToken: string,
  format: "csv" | "xlsx",
): Promise<Blob> {
  const response = await fetch(`${API_BASE_URL}/api/v1/invoices/export?format=${format}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new ApiError(body?.detail ?? "Az exportálás sikertelen volt", response.status);
  }

  return response.blob();
}
