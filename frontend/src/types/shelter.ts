/**
 * Canonical ShelterModel domain interface for the frontend application.
 * Must stay in 1:1 synchronization with backend Pydantic models.
 */

export interface LocationModel {
  latitude: number;
  longitude: number;
  elevation: number;
  region: string;
  climateZone: string;
  weatherSource: string;
}

export interface GeometryModel {
  shape: string;
  length: number;
  width: number;
  height: number;
  orientation: number;
  roofType: string;
  roofAngle: number;
  floorElevation: number;
}

export interface LayerModel {
  materialId: string;
  thickness: number; // in meters
}

export interface WallAssemblyModel {
  constructionId: string;
  layers: LayerModel[];
}

export interface ShelterModel {
  id: string;
  name: string;
  description?: string;
  tags: string[];
  version: string;
  location: LocationModel;
  geometry: GeometryModel;
  walls: {
    north: WallAssemblyModel;
    south: WallAssemblyModel;
    east: WallAssemblyModel;
    west: WallAssemblyModel;
  };
  roof: {
    constructionId: string;
    layers: LayerModel[];
    slope: number;
  };
  floor: {
    constructionId: string;
    layers: LayerModel[];
    groundContact: boolean;
  };
  windows: Array<{
    id: string;
    wall: "north" | "south" | "east" | "west";
    width: number;
    height: number;
    sillHeight: number;
  }>;
  doors: Array<{
    id: string;
    wall: "north" | "south" | "east" | "west";
    width: number;
    height: number;
  }>;
}
