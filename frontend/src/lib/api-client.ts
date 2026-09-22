/**
 * Strongly-typed HTTP client for communicating with the FastAPI backend platform.
 */

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  (typeof window !== "undefined"
    ? "/api/v1"
    : (process.env.BACKEND_INTERNAL_URL ? `${process.env.BACKEND_INTERNAL_URL}/api/v1` : "http://127.0.0.1:8000/api/v1"));

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

export interface SimulationSubmitResponse {
  simulation_id: string;
  job_id?: string;
  status: string;
  message: string;
  created_at?: string;
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
    delete: (id: string) =>
      fetchApi<any>(`/projects/${id}`, {
        method: "DELETE",
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
    queue: (payload: any) =>
      fetchApi<SimulationSubmitResponse>("/simulations", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    submit: (arg1: any, arg2?: any) => {
      // Support both submit(payload) and submit(projectId, payload)
      const payload = arg2 !== undefined ? arg2 : arg1;
      return fetchApi<SimulationSubmitResponse>("/simulations", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },
    status: (jobId: string) => fetchApi<any>(`/simulations/${jobId}`),
    results: (jobId: string) => fetchApi<any>(`/simulations/${jobId}/results`),
    list: () => fetchApi<any[]>("/simulations"),
    demonstration: () =>
      fetchApi<any>("/simulations/demonstration", {
        method: "POST",
      }),
    cancel: (jobId: string) =>
      fetchApi<any>(`/simulations/${jobId}/cancel`, {
        method: "POST",
      }),
    outputVariables: () => fetchApi<any>("/simulations/output-variables"),
    benchmark: (benchmarkId = "ladakh") => fetchApi<any>(`/simulations/benchmark/${benchmarkId}`),
  },
  weather: {
    list: () => fetchApi<any[]>("/weather"),
    sources: () => fetchApi<any[]>("/weather/sources"),
    queryNasa: (params: any) =>
      fetchApi<any>("/weather/nasa-power", {
        method: "POST",
        body: JSON.stringify(params),
      }),
    liveFetch: (params: {
      latitude: number;
      longitude: number;
      location_name?: string;
      elevation_m?: number;
      provider?: string;
      start_date?: string;
      end_date?: string;
    }) =>
      fetchApi<any>("/weather/live-fetch", {
        method: "POST",
        body: JSON.stringify(params),
      }),
    validate: (weatherFile: string) =>
      fetchApi<any>("/weather/validate", {
        method: "POST",
        body: JSON.stringify({ weather_file: weatherFile }),
      }),
    generateManual: (params: any) =>
      fetchApi<any>("/weather/manual", {
        method: "POST",
        body: JSON.stringify(params),
      }),
    microclimateSynthesize: (params: {
      target_latitude: number;
      target_longitude: number;
      target_elevation_m: number;
      location_name: string;
      horizon_shadow_angle_deg?: number;
      reference_epw?: string;
    }) =>
      fetchApi<any>("/weather/microclimate-synthesize", {
        method: "POST",
        body: JSON.stringify(params),
      }),
    geocode: (query: string) =>
      fetchApi<any[]>(`/weather/geocode?query=${encodeURIComponent(query)}`),
    reverseGeocode: (latitude: number, longitude: number) =>
      fetchApi<any>(`/weather/reverse-geocode?latitude=${latitude}&longitude=${longitude}`),
    deleteDataset: (filename: string) =>
      fetchApi<any>(`/weather/datasets/${encodeURIComponent(filename)}`, { method: "DELETE" }),
  },
  ansys: {
    status: () => fetchApi<any>("/ansys/status"),
    export: (shelterModel: any, weatherContext?: any) =>
      fetchApi<any>("/ansys/export", {
        method: "POST",
        body: JSON.stringify({ shelter_model: shelterModel, weather_context: weatherContext }),
      }),
    materialComparison: () => fetchApi<any>("/ansys/material-comparison"),
    downloadUrl: `${API_BASE_URL}/ansys/download`,
    downloadZip: async (shelterModel: any, weatherContext?: any): Promise<Blob> => {
      const res = await fetch(`${API_BASE_URL}/ansys/download`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shelter_model: shelterModel, weather_context: weatherContext }),
      });
      if (!res.ok) {
        throw new Error(`ANSYS download failed with status ${res.status}`);
      }
      return await res.blob();
    },
  },
  reports: {
    compile: (payload: any) =>
      fetchApi<any>("/reports/compile", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    exportPdf: async (payload: any): Promise<Blob> => {
      const urlsToTry = [
        "/api/v1/reports/export/pdf",
        `${API_BASE_URL}/reports/export/pdf`,
      ];
      let lastErr: any = null;
      for (const url of urlsToTry) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 6000);
          const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
            signal: controller.signal,
          });
          clearTimeout(timeoutId);
          if (res.ok) {
            return await res.blob();
          }
        } catch (e) {
          lastErr = e;
        }
      }
      throw lastErr || new Error("Failed to export PDF from reports service.");
    },
    exportCsv: (payload: any) =>
      fetchApi<string>("/reports/export/csv", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    exportJson: (payload: any) =>
      fetchApi<any>("/reports/export/json", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
  },
  ai: {
    getModelStatus: () => fetchApi<{
      is_surrogate_available: boolean;
      model_card?: any;
      message?: string;
    }>("/ai/models/status"),
    listModels: () => fetchApi<{ models: any[] }>("/ai/models"),
    generate: (params: {
      weather_id?: string;
      target_indoor_min_c?: number;
      max_envelope_mass_kg?: number | null;
      optimization_mode?: string;
      population_size?: number;
      generations?: number;
      occupants?: number;
    }) =>
      fetchApi<{
        job_id: string;
        status: string;
        progress_pct: number;
        current_generation: number;
        total_generations: number;
        evaluations_count: number;
        elapsed_seconds: number;
        candidates_count: number;
        error_message?: string | null;
      }>("/ai/design/generate", {
        method: "POST",
        body: JSON.stringify(params),
      }),
    getJobStatus: (jobId: string) =>
      fetchApi<{
        job_id: string;
        status: string;
        progress_pct: number;
        current_generation: number;
        total_generations: number;
        evaluations_count: number;
        elapsed_seconds: number;
        candidates_count: number;
        error_message?: string | null;
      }>(`/ai/design/jobs/${jobId}`),
    getCandidates: (jobId: string) =>
      fetchApi<Array<{
        candidate_id: string;
        parameters: Record<string, any>;
        surrogate_predictions: Record<string, number>;
        uncertainty_margin_c: number;
        is_high_uncertainty: boolean;
        objective_values: number[];
        is_physics_verified: boolean;
        verified_physics?: Record<string, number> | null;
        calibration_error?: Record<string, number> | null;
        verification_duration_s?: number | null;
      }>>(`/ai/design/candidates/${jobId}`),
    verifyCandidates: (jobId: string, options?: { k?: number; period_days?: number }) =>
      fetchApi<{
        job_id: string;
        verified_count: number;
        candidates: any[];
      }>(`/ai/design/verify/${jobId}`, {
        method: "POST",
        body: JSON.stringify(options || { k: 5, period_days: 3 }),
      }),
    explainCandidate: (payload: { candidate: any; target_name?: string; top_k?: number }) =>
      fetchApi<{
        candidate_id: string;
        target_name: string;
        predicted_value: number;
        base_value: number;
        top_positive_features: Array<{ feature: string; shap_value: number; feature_value: any; direction: string }>;
        top_negative_features: Array<{ feature: string; shap_value: number; feature_value: any; direction: string }>;
        all_attributions: Record<string, number>;
      }>("/ai/design/explain", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    applyCandidate: (candidate: any) =>
      fetchApi<{
        success: boolean;
        shelter_model: any;
      }>("/ai/design/apply", {
        method: "POST",
        body: JSON.stringify(candidate),
      }),
  },
};

