/**
 * Unified API interface for frontend components.
 * Interacts with FastAPI backend routes.
 */

import { fetchApi, api } from "./api-client";

export { fetchApi, api };

export const simulationApi = api.simulations;
export const weatherApi = api.weather;
export const materialsApi = api.materials;
export const projectsApi = api.projects;
export const ansysApi = api.ansys;
export const aiApi = api.ai;

