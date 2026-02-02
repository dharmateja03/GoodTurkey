const API_BASE = import.meta.env.VITE_API_URL || '/api';

export interface AuthResponse {
  token: string;
  user: {
    id: string;
    email: string;
  };
}

export interface BlockedSite {
  id: string;
  userId: string;
  categoryId: string | null;
  url: string;
  isActive: boolean;
  createdAt: string;
  timeWindows: TimeWindow[];
  unlockRequestedAt: string | null;
  unlockReady: boolean;
  timeRemaining: number | null; // milliseconds remaining
  accessAttempts: number; // how many times user tried to access
}

export interface Category {
  id: string;
  userId: string;
  name: string;
  color: string;
  createdAt: string;
}

export interface TimeWindow {
  id: string;
  blockedSiteId: string;
  dayOfWeek: number | null;
  startTime: string;
  endTime: string;
  createdAt: string;
}

export interface SyncResponse {
  timestamp: string;
  rules: Array<{
    id: string;
    url: string;
    timeWindows: Array<{
      id: string;
      dayOfWeek: number | null;
      startTime: string;
      endTime: string;
    }>;
  }>;
}

export interface Quote {
  id: string;
  userId: string | null;
  text: string;
  author: string;
  isActive: boolean;
  isSystem: boolean;
  createdAt: string;
}

function getToken(): string | null {
  return localStorage.getItem('authToken');
}

function getHeaders(includeAuth = true): HeadersInit {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (includeAuth) {
    const token = getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  return headers;
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }
  return response.json();
}

// Auth endpoints
export async function register(email: string, password: string): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: getHeaders(false),
    body: JSON.stringify({ email, password }),
  });
  return handleResponse(response);
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: getHeaders(false),
    body: JSON.stringify({ email, password }),
  });
  return handleResponse(response);
}

export function logout(): void {
  localStorage.removeItem('authToken');
}

export function setToken(token: string): void {
  localStorage.setItem('authToken', token);
}

export function isLoggedIn(): boolean {
  return !!getToken();
}

// Sites endpoints
export async function getSites(): Promise<BlockedSite[]> {
  const response = await fetch(`${API_BASE}/sites`, {
    headers: getHeaders(),
  });
  return handleResponse(response);
}

export async function createSite(url: string, categoryId?: string): Promise<BlockedSite> {
  const response = await fetch(`${API_BASE}/sites`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ url, categoryId: categoryId || null, isActive: true }),
  });
  return handleResponse(response);
}

export async function updateSite(id: string, data: Partial<BlockedSite>): Promise<BlockedSite> {
  const response = await fetch(`${API_BASE}/sites/${id}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(data),
  });
  return handleResponse(response);
}

export async function deleteSite(id: string): Promise<{ success: boolean }> {
  const response = await fetch(`${API_BASE}/sites/${id}`, {
    method: 'DELETE',
    headers: getHeaders(),
  });
  return handleResponse(response);
}

export async function requestUnlock(id: string): Promise<BlockedSite> {
  const response = await fetch(`${API_BASE}/sites/${id}/request-unlock`, {
    method: 'POST',
    headers: getHeaders(),
  });
  return handleResponse(response);
}

export async function cancelUnlock(id: string): Promise<BlockedSite> {
  const response = await fetch(`${API_BASE}/sites/${id}/cancel-unlock`, {
    method: 'POST',
    headers: getHeaders(),
  });
  return handleResponse(response);
}

// Categories endpoints
export async function getCategories(): Promise<Category[]> {
  const response = await fetch(`${API_BASE}/categories`, {
    headers: getHeaders(),
  });
  return handleResponse(response);
}

export async function createCategory(name: string, color?: string): Promise<Category> {
  const response = await fetch(`${API_BASE}/categories`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ name, color: color || '#6B7280' }),
  });
  return handleResponse(response);
}

export async function updateCategory(id: string, name: string, color: string): Promise<Category> {
  const response = await fetch(`${API_BASE}/categories/${id}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify({ name, color }),
  });
  return handleResponse(response);
}

export async function deleteCategory(id: string): Promise<{ success: boolean }> {
  const response = await fetch(`${API_BASE}/categories/${id}`, {
    method: 'DELETE',
    headers: getHeaders(),
  });
  return handleResponse(response);
}

// Time windows endpoints
export async function createTimeWindow(
  blockedSiteId: string,
  startTime: string,
  endTime: string,
  dayOfWeek?: number | null
): Promise<TimeWindow> {
  const response = await fetch(`${API_BASE}/time-windows`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      blockedSiteId,
      startTime,
      endTime,
      dayOfWeek: dayOfWeek ?? null,
    }),
  });
  return handleResponse(response);
}

export async function deleteTimeWindow(id: string): Promise<{ success: boolean }> {
  const response = await fetch(`${API_BASE}/time-windows/${id}`, {
    method: 'DELETE',
    headers: getHeaders(),
  });
  return handleResponse(response);
}

// Sync endpoint
export async function getSync(): Promise<SyncResponse> {
  const response = await fetch(`${API_BASE}/sync`, {
    headers: getHeaders(),
  });
  return handleResponse(response);
}

// Quotes endpoints
export async function getQuotes(): Promise<Quote[]> {
  const response = await fetch(`${API_BASE}/quotes`, {
    headers: getHeaders(),
  });
  return handleResponse(response);
}

export async function createQuote(text: string, author: string): Promise<Quote> {
  const response = await fetch(`${API_BASE}/quotes`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ text, author }),
  });
  return handleResponse(response);
}

export async function updateQuote(id: string, data: Partial<Quote>): Promise<Quote> {
  const response = await fetch(`${API_BASE}/quotes/${id}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(data),
  });
  return handleResponse(response);
}

export async function deleteQuote(id: string): Promise<{ success: boolean }> {
  const response = await fetch(`${API_BASE}/quotes/${id}`, {
    method: 'DELETE',
    headers: getHeaders(),
  });
  return handleResponse(response);
}
