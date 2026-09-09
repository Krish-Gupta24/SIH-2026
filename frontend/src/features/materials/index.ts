/**
 * Materials & Envelope Feature Module
 * Responsible for material selection, layer stack management, U-value calculation,
 * and thermal mass estimation with strict provenance tracking.
 */

export interface MaterialItem {
  id: string;
  name: string;
  conductivity: number; // W/(m·K)
  density: number;      // kg/m³
  specificHeat: number; // J/(kg·K)
  provenance: string;
  isUserDefined: boolean;
}
