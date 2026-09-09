/**
 * Strongly-typed HTTP client for communicating with the FastAPI backend platform.
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

export async function fetchApi<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`API Error [${response.status}]: ${errorBody || response.statusText}`);
    }

    return (await response.json()) as T;
  } catch (err: any) {
    // Graceful error logging
    console.warn(`[API fetchApi] ${endpoint} request failed:`, err.message);
    throw err;
  }
}

export const api = {
  projects: {
    list: () => fetchApi<any[]>("/projects"),
    get: (id: string) => fetchApi<any>(`/projects/${id}`),
    create: (data: any) =>
      fetchApi<any>("/projects", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    update: (id: string, data: any) =>
      fetchApi<any>(`/projects/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
  },
  materials: {
    list: () => fetchApi<any[]>("/materials"),
    create: (data: any) =>
      fetchApi<any>("/materials", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    update: (id: string, data: any) =>
      fetchApi<any>(`/materials/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
  },
  simulations: {
    submit: (projectId: string, payload: any) =>
      fetchApi<{ job_id: string; status: string; message: string }>(`/projects/${projectId}/simulate`, {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    status: (jobId: string) => fetchApi<any>(`/simulations/${jobId}`),
    results: (jobId: string) => fetchApi<any>(`/simulations/${jobId}/results`),
  },
};
