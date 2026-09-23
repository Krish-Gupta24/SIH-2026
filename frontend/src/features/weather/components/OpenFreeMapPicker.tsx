"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import type { Map as MapLibreMapInstance } from "maplibre-gl";
import {
  Search,
  MapPin,
  Mountain,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Crosshair,
  Sliders,
  Layers,
} from "lucide-react";
import { api } from "@/lib/api-client";

export interface TacticalHotspot {
  name: string;
  shortName: string;
  latitude: number;
  longitude: number;
  elevation_m: number;
  description: string;
}

export const TACTICAL_HIMALAYAN_HOTSPOTS: TacticalHotspot[] = [
  {
    name: "Siachen Glacier Forward Base",
    shortName: "Siachen (5400m)",
    latitude: 35.4200,
    longitude: 77.1100,
    elevation_m: 5400.0,
    description: "Highest battlefield on Earth. Sub-zero temperatures down to -50°C, 51 kPa atmospheric pressure.",
  },
  {
    name: "Daulat Beg Oldi (DBO) Outpost",
    shortName: "DBO (5065m)",
    latitude: 35.2500,
    longitude: 77.9200,
    elevation_m: 5065.0,
    description: "Highest operational airstrip in the world. Extreme high-altitude plateau with brutal wind chills.",
  },
  {
    name: "Galwan Valley Cold Ridge",
    shortName: "Galwan (4800m)",
    latitude: 34.7500,
    longitude: 78.2000,
    elevation_m: 4800.0,
    description: "Steep gorge terrain with valley shadow casting and severe diurnal temperature swings.",
  },
  {
    name: "Pangong Tso Alpine Lake Post",
    shortName: "Pangong (4250m)",
    latitude: 33.7600,
    longitude: 78.6800,
    elevation_m: 4250.0,
    description: "High-altitude saline lake perimeter with high solar reflection and persistent mountain gales.",
  },
  {
    name: "Kargil / Dras Valley Outpost",
    shortName: "Dras (3280m)",
    latitude: 34.4300,
    longitude: 75.7500,
    elevation_m: 3280.0,
    description: "Second coldest permanently inhabited place on Earth. Record lows plunge to -45°C.",
  },
  {
    name: "Leh District Regional Baseline",
    shortName: "Leh (3500m)",
    latitude: 34.1526,
    longitude: 77.5771,
    elevation_m: 3500.0,
    description: "Standard WMO 427053 airport meteorological station baseline reference.",
  },
];

// High-reliability multi-provider style catalog (OpenFreeMap + Satellite + Carto)
const MAP_STYLES: Array<{
  id: string;
  name: string;
  style: any;
}> = [
  {
    id: "satellite",
    name: "Satellite Imagery",
    style: {
      version: 8,
      sources: {
        "esri-sat": {
          type: "raster",
          tiles: [
            "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
          ],
          tileSize: 256,
          attribution: "© Esri, Earthstar Geographics",
        },
      },
      layers: [
        {
          id: "esri-sat-layer",
          type: "raster",
          source: "esri-sat",
          minzoom: 0,
          maxzoom: 19,
        },
      ],
    },
  },
  {
    id: "liberty",
    name: "Topographic",
    style: {
      version: 8,
      sources: {
        "esri-topo": {
          type: "raster",
          tiles: [
            "https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}",
          ],
          tileSize: 256,
          attribution: "© Esri, HERE, Garmin, FAO, USGS, NOAA",
        },
      },
      layers: [
        {
          id: "esri-topo-layer",
          type: "raster",
          source: "esri-topo",
          minzoom: 0,
          maxzoom: 19,
        },
      ],
    },
  },
  {
    id: "carto",
    name: "Clean Alpine",
    style: {
      version: 8,
      sources: {
        "carto-voyager": {
          type: "raster",
          tiles: [
            "https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png",
            "https://b.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png",
            "https://c.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png",
            "https://d.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png",
          ],
          tileSize: 256,
          attribution: "© CARTO, © OpenStreetMap contributors",
        },
      },
      layers: [
        {
          id: "carto-voyager-layer",
          type: "raster",
          source: "carto-voyager",
          minzoom: 0,
          maxzoom: 20,
        },
      ],
    },
  },
  {
    id: "osm",
    name: "OpenStreetMap",
    style: {
      version: 8,
      sources: {
        "osm-standard": {
          type: "raster",
          tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
          tileSize: 256,
          attribution: "© OpenStreetMap contributors",
        },
      },
      layers: [
        {
          id: "osm-layer",
          type: "raster",
          source: "osm-standard",
          minzoom: 0,
          maxzoom: 19,
        },
      ],
    },
  },
];

export interface OpenFreeMapPickerProps {
  initialLatitude?: number;
  initialLongitude?: number;
  initialElevation?: number;
  initialLocationName?: string;
  onLocationChange?: (loc: {
    latitude: number;
    longitude: number;
    elevation: number;
    locality: string;
    region: string;
  }) => void;
  onEpwGenerated?: (epwFilename: string, summary: any) => void;
  className?: string;
  height?: string;
  showMicroclimateSynthesizer?: boolean;
}

export function OpenFreeMapPicker({
  initialLatitude = 34.1526,
  initialLongitude = 77.5771,
  initialElevation = 3500.0,
  initialLocationName = "Leh, Ladakh, India",
  onLocationChange,
  onEpwGenerated,
  className = "",
  height = "420px",
  showMicroclimateSynthesizer = true,
}: OpenFreeMapPickerProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMapInstance | null>(null);
  const markerRef = useRef<any>(null);

  // Active Coordinates & Metadata
  const [latitude, setLatitude] = useState(initialLatitude);
  const [longitude, setLongitude] = useState(initialLongitude);
  const [elevation, setElevation] = useState(initialElevation);
  const [locationName, setLocationName] = useState(initialLocationName);
  const [regionName, setRegionName] = useState("Ladakh, India");

  // Map Style
  const [selectedStyleId, setSelectedStyleId] = useState<string>("satellite");

  // Search autocomplete
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);

  // Synthesizer State
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [synthesizeStatus, setSynthesizeStatus] = useState<{
    type: "success" | "error";
    message: string;
    summary?: any;
  } | null>(null);
  const [horizonAngle, setHorizonAngle] = useState(15.0);

  // Estimated atmospheric pressure
  const estimatedPressureKpa = React.useMemo(() => {
    const pPa = 101325.0 * Math.pow(1.0 - 2.25577e-5 * Math.max(0, elevation), 5.25588);
    return (pPa / 1000.0).toFixed(1);
  }, [elevation]);

  // Elevation delta relative to standard Leh airport (3,500m)
  const elevationDeltaM = elevation - 3500.0;
  const estimatedLapseCoolingC = ((elevationDeltaM / 1000.0) * -6.5).toFixed(1);

  // Reverse geocode when coordinates change
  const fetchReverseGeocode = useCallback(
    async (lat: number, lon: number) => {
      try {
        const data = await api.weather.reverseGeocode(lat, lon);
        if (data) {
          if (data.elevation_m && data.elevation_m > 0) {
            setElevation(data.elevation_m);
          }
          if (data.display_name) {
            setLocationName(data.display_name);
          }
          if (data.region) {
            setRegionName(data.region);
          }
          onLocationChange?.({
            latitude: lat,
            longitude: lon,
            elevation: data.elevation_m || elevation,
            locality: data.display_name || locationName,
            region: data.region || regionName,
          });
        }
      } catch (err) {
        onLocationChange?.({
          latitude: lat,
          longitude: lon,
          elevation,
          locality: locationName,
          region: regionName,
        });
      }
    },
    [elevation, locationName, regionName, onLocationChange]
  );

  // Initialize MapLibre GL with ResizeObserver and error protection
  useEffect(() => {
    let isCancelled = false;
    let map: MapLibreMapInstance | null = null;
    let resizeObserver: ResizeObserver | null = null;

    async function initMap() {
      if (!mapContainerRef.current) return;

      try {
        // Dynamically import maplibre-gl to guarantee client-only execution
        const maplibregl = await import("maplibre-gl");

        if (isCancelled || !mapContainerRef.current) return;

        const currentStyleConfig =
          MAP_STYLES.find((s) => s.id === selectedStyleId) || MAP_STYLES[0];

        map = new maplibregl.Map({
          container: mapContainerRef.current,
          style: currentStyleConfig.style,
          center: [longitude, latitude],
          zoom: 9.0,
          pitch: 0,
          bearing: 0,
        });

        // Add Navigation controls
        map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "top-right");

        // Alpine Tactical Pin Marker DOM Element
        const el = document.createElement("div");
        el.className = "tactical-pin-marker";
        el.style.width = "36px";
        el.style.height = "36px";
        el.style.cursor = "grab";
        el.style.display = "flex";
        el.style.alignItems = "center";
        el.style.justifyContent = "center";
        el.innerHTML = `
          <div style="position: relative; display: flex; align-items: center; justify-content: center;">
            <div style="position: absolute; width: 36px; height: 36px; border-radius: 50%; background: rgba(203, 220, 230, 0.4); box-shadow: 0 0 12px rgba(0,0,0,0.3);"></div>
            <div style="position: relative; width: 22px; height: 22px; border-radius: 50%; background: #000000; border: 3px solid #ffffff; box-shadow: 0 4px 14px rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center;">
              <div style="width: 6px; height: 6px; border-radius: 50%; background: #CBDCE6;"></div>
            </div>
          </div>
        `;

        const marker = new maplibregl.Marker({
          element: el,
          draggable: true,
          anchor: "center",
        })
          .setLngLat([longitude, latitude])
          .addTo(map);

        // Click anywhere to drop / move pin
        map.on("click", (e: any) => {
          const { lng, lat } = e.lngLat;
          const roundedLat = Math.round(lat * 10000) / 10000;
          const roundedLon = Math.round(lng * 10000) / 10000;
          marker.setLngLat([roundedLon, roundedLat]);
          setLatitude(roundedLat);
          setLongitude(roundedLon);
          fetchReverseGeocode(roundedLat, roundedLon);
        });

        // Drag marker
        marker.on("dragend", () => {
          const lngLat = marker.getLngLat();
          const roundedLat = Math.round(lngLat.lat * 10000) / 10000;
          const roundedLon = Math.round(lngLat.lng * 10000) / 10000;
          setLatitude(roundedLat);
          setLongitude(roundedLon);
          fetchReverseGeocode(roundedLat, roundedLon);
        });

        // Fail-safe resize events (essential for modals, flex layouts, and tab changes)
        map.on("load", () => {
          map?.resize();
        });

        // Fallback style if vector fails to load
        map.on("error", (e: any) => {
          // If style fails, fall back to satellite or carto
          if (e?.error?.message?.includes("style") || e?.error?.message?.includes("source")) {
            console.warn("Map style error detected, switching to fallback satellite style:", e);
            map?.setStyle(MAP_STYLES[0].style);
          }
        });

        // Delayed resizes to catch modal opening animations
        setTimeout(() => map?.resize(), 100);
        setTimeout(() => map?.resize(), 400);
        setTimeout(() => map?.resize(), 1000);

        // ResizeObserver guarantees visibility even if container size changes
        if (typeof ResizeObserver !== "undefined" && mapContainerRef.current) {
          resizeObserver = new ResizeObserver(() => {
            map?.resize();
          });
          resizeObserver.observe(mapContainerRef.current);
        }

        mapRef.current = map;
        markerRef.current = marker;
      } catch (err) {
        console.error("Failed to initialize MapLibre GL map:", err);
      }
    }

    initMap();

    return () => {
      isCancelled = true;
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      if (map) {
        map.remove();
      }
    };
  }, []);

  // Update map style if changed
  const handleStyleChange = (styleId: string) => {
    setSelectedStyleId(styleId);
    const chosen = MAP_STYLES.find((s) => s.id === styleId);
    if (chosen && mapRef.current) {
      mapRef.current.setStyle(chosen.style);
      setTimeout(() => mapRef.current?.resize(), 100);
    }
  };

  // Fly to specific coordinates
  const flyToCoords = (lat: number, lon: number, elev: number, name: string) => {
    setLatitude(lat);
    setLongitude(lon);
    setElevation(elev);
    setLocationName(name);

    if (mapRef.current) {
      mapRef.current.flyTo({
        center: [lon, lat],
        zoom: 11.5,
        speed: 1.4,
        curve: 1.2,
      });
      mapRef.current.resize();
    }
    if (markerRef.current) {
      markerRef.current.setLngLat([lon, lat]);
    }

    onLocationChange?.({
      latitude: lat,
      longitude: lon,
      elevation: elev,
      locality: name,
      region: regionName,
    });
  };

  // Search input debounced query
  useEffect(() => {
    if (!searchQuery || searchQuery.trim().length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await api.weather.geocode(searchQuery);
        setSearchResults(results || []);
        setShowSearchResults(true);
      } catch (err) {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Execute High-Altitude Microclimate Synthesis
  const handleSynthesizeMicroclimate = async () => {
    setIsSynthesizing(true);
    setSynthesizeStatus(null);

    try {
      const res = await api.weather.microclimateSynthesize({
        target_latitude: latitude,
        target_longitude: longitude,
        target_elevation_m: elevation,
        location_name: locationName.split(",")[0] || "High Altitude Outpost",
        horizon_shadow_angle_deg: horizonAngle,
      });

      if (res && res.epw_file) {
        setSynthesizeStatus({
          type: "success",
          message: `Generated localized 8,760h EPW: ${res.epw_file} (Min Temp: ${res.min_temperature_c}°C, Pressure: ${res.surface_pressure_hpa} hPa)`,
          summary: res,
        });
        onEpwGenerated?.(res.epw_file, res);
      } else {
        throw new Error("Failed to receive valid synthesis response from engine.");
      }
    } catch (err: any) {
      setSynthesizeStatus({
        type: "error",
        message: err.message || "Microclimate synthesis failed. Check connection to backend engine.",
      });
    } finally {
      setIsSynthesizing(false);
    }
  };

  return (
    <div className={`flex flex-col gap-3.5 ${className}`}>
      {/* Search & Style Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <div className="relative flex items-center">
            <Search className="absolute left-3.5 h-4 w-4 text-[#6E818F] pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setShowSearchResults(true)}
              placeholder="Search place, mountain pass, or outpost (e.g. Siachen, Galwan, DBO, Pangong, Dras)..."
              className="w-full rounded-full border border-border bg-white/90 pl-10 pr-8 py-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:border-black focus:outline-none shadow-sm transition-all"
            />
            {isSearching && (
              <Loader2 className="absolute right-3.5 h-3.5 w-3.5 animate-spin text-[#6E818F]" />
            )}
          </div>

          {/* Autocomplete Results Dropdown */}
          {showSearchResults && searchResults.length > 0 && (
            <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-56 overflow-y-auto rounded-2xl border border-border bg-white p-2 shadow-xl backdrop-blur-md">
              <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#6E818F] px-2 py-1">
                Matched Locations
              </div>
              {searchResults.map((r, i) => (
                <button
                  key={`${r.id}-${i}`}
                  type="button"
                  onClick={() => {
                    flyToCoords(r.latitude, r.longitude, r.elevation_m || 3500, r.display_name);
                    setShowSearchResults(false);
                    setSearchQuery(r.name);
                  }}
                  className="w-full text-left rounded-xl p-2.5 hover:bg-[#CBDCE6]/40 transition flex items-center justify-between group"
                >
                  <div className="flex items-center gap-2.5">
                    <MapPin className="h-3.5 w-3.5 text-black group-hover:scale-110 transition-transform" />
                    <div>
                      <div className="text-xs font-semibold text-foreground">{r.name}</div>
                      <div className="text-[10px] text-muted-foreground line-clamp-1">{r.display_name}</div>
                    </div>
                  </div>
                  {r.elevation_m > 0 && (
                    <span className="text-[10px] font-mono font-semibold text-black bg-[#CBDCE6]/60 border border-[#CBDCE6] px-2 py-0.5 rounded-full">
                      {Math.round(r.elevation_m)} m
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Style Selector */}
        <div className="flex items-center gap-1.5 self-end sm:self-center">
          <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#6E818F] hidden md:inline flex items-center gap-1">
            <Layers className="h-3 w-3" /> Style:
          </span>
          {MAP_STYLES.map((st) => (
            <button
              key={st.id}
              type="button"
              onClick={() => handleStyleChange(st.id)}
              className={`rounded-full px-3 py-1 text-[11px] font-semibold transition border ${
                selectedStyleId === st.id
                  ? "bg-black text-white border-black shadow-sm"
                  : "bg-white/80 border-border text-foreground hover:bg-[#CBDCE6]"
              }`}
            >
              {st.name}
            </button>
          ))}
        </div>
      </div>

      {/* Tactical Himalayan Hotspots Quick-Picks */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#6E818F] flex items-center gap-1 whitespace-nowrap pl-0.5">
          <Mountain className="h-3 w-3" /> Hotspots:
        </span>
        {TACTICAL_HIMALAYAN_HOTSPOTS.map((spot) => (
          <button
            key={spot.shortName}
            type="button"
            onClick={() => flyToCoords(spot.latitude, spot.longitude, spot.elevation_m, spot.name)}
            className={`whitespace-nowrap rounded-full border px-3 py-1 text-[11px] font-medium transition ${
              Math.abs(latitude - spot.latitude) < 0.05 && Math.abs(longitude - spot.longitude) < 0.05
                ? "border-black bg-black text-white font-semibold shadow-sm"
                : "border-border bg-white text-foreground hover:bg-[#CBDCE6]"
            }`}
          >
            {spot.shortName}
          </button>
        ))}
      </div>

      {/* Main Map Container with Explicit Sizing and Elevated HUD Overlay */}
      <div
        className="relative rounded-2xl overflow-hidden border border-border shadow-[0_10px_30px_rgba(0,0,0,0.05)] bg-[#CBDCE6]/20"
        style={{ width: "100%", height, minHeight: height }}
      >
        {/* The actual MapLibre container - must have explicit 100% width and height */}
        <div
          ref={mapContainerRef}
          style={{ width: "100%", height: "100%", minHeight: height, position: "relative" }}
          className="w-full h-full"
        />

        {/* Tactical Crosshairs & Instructions Bar */}
        <div className="absolute top-3 left-3 z-10 flex items-center gap-2 rounded-full bg-white/95 px-3 py-1.5 backdrop-blur-md border border-border text-[11px] text-[#536772] shadow-md pointer-events-none">
          <Crosshair className="h-3.5 w-3.5 text-black" />
          <span>Click anywhere or drag marker to set coordinates</span>
        </div>

        {/* Live Coordinate HUD Overlay (Bottom-Left) */}
        <div className="absolute bottom-3 left-3 z-10 rounded-2xl bg-white/95 p-3.5 backdrop-blur-md border border-border text-xs shadow-lg max-w-sm space-y-2 pointer-events-auto">
          <div className="flex items-center justify-between gap-3 border-b border-border pb-2">
            <div className="flex items-center gap-1.5 font-bold text-foreground text-xs truncate">
              <MapPin className="h-3.5 w-3.5 text-black flex-shrink-0" />
              <span className="truncate">{locationName}</span>
            </div>
            {elevation >= 4500 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-black text-white px-2 py-0.5 text-[9px] font-bold whitespace-nowrap">
                EXTREME ALTITUDE
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11px]">
            <div className="text-muted-foreground">
              Lat: <span className="font-mono font-semibold text-black">{latitude.toFixed(4)}°N</span>
            </div>
            <div className="text-muted-foreground">
              Lon: <span className="font-mono font-semibold text-black">{longitude.toFixed(4)}°E</span>
            </div>
            <div className="text-muted-foreground">
              Altitude: <span className="font-mono font-bold text-black">{Math.round(elevation)} m</span>
            </div>
            <div className="text-muted-foreground">
              Air Pressure: <span className="font-mono font-bold text-black">{estimatedPressureKpa} kPa</span>
            </div>
          </div>

          {elevationDeltaM !== 0 && (
            <div className="text-[10px] text-muted-foreground border-t border-border pt-1.5 flex items-center justify-between">
              <span>vs Leh Base (3500m):</span>
              <span className="font-mono font-semibold text-black">
                {elevationDeltaM > 0 ? `+${Math.round(elevationDeltaM)}m` : `${Math.round(elevationDeltaM)}m`} ({estimatedLapseCoolingC}°C lapse)
              </span>
            </div>
          )}
        </div>

        {/* Map Attribution */}
        <div className="absolute bottom-1 right-1 z-10 rounded bg-white/70 px-2 py-0.5 text-[9px] text-muted-foreground backdrop-blur-sm">
          Map: <a href="https://openfreemap.org" target="_blank" rel="noreferrer" className="underline hover:text-black">OpenFreeMap</a> · ESRI · OSM
        </div>
      </div>

      {/* Physics-Informed ML Microclimate Synthesizer Action Card */}
      {showMicroclimateSynthesizer && (
        <div className="rounded-2xl border border-border bg-gradient-to-br from-[#CBDCE6]/30 via-white to-[#CBDCE6]/15 p-4 space-y-3.5 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.12em] text-black">
                <Sparkles className="h-4 w-4 text-[#6E818F]" />
                High-Altitude Microclimate Weather Synthesizer (Physics-Informed ML)
              </div>
              <p className="text-xs text-muted-foreground mt-1 max-w-xl">
                Official airport EPWs reflect lower elevations (Leh 3,500m). Downscale to frontline defense outposts ({Math.round(elevation)}m, {estimatedPressureKpa} kPa) using diurnal lapse rates and optical solar scaling.
              </p>
            </div>

            <button
              type="button"
              disabled={isSynthesizing}
              onClick={handleSynthesizeMicroclimate}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-black px-5 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-[#6E818F] disabled:opacity-45 transition whitespace-nowrap self-start sm:self-center"
            >
              {isSynthesizing ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Synthesizing 8,760h EPW...
                </>
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5" />
                  Synthesize 8,760h Microclimate EPW
                </>
              )}
            </button>
          </div>

          {/* Valley Wall Horizon Cutoff Control */}
          <div className="flex items-center gap-3 pt-2 border-t border-border text-xs text-muted-foreground">
            <Sliders className="h-3.5 w-3.5 text-[#6E818F]" />
            <span className="whitespace-nowrap font-medium">Valley Horizon Shadow Angle:</span>
            <input
              type="range"
              min="0"
              max="45"
              step="5"
              value={horizonAngle}
              onChange={(e) => setHorizonAngle(Number(e.target.value))}
              className="w-32 accent-black"
            />
            <span className="font-mono text-black font-bold">{horizonAngle}°</span>
            <span className="text-[11px] text-muted-foreground hidden md:inline">
              (Blocks direct solar rays obstructed by surrounding mountain ridges)
            </span>
          </div>

          {/* Status Message */}
          {synthesizeStatus && (
            <div
              className={`rounded-xl p-3 text-xs flex items-start gap-2.5 ${
                synthesizeStatus.type === "success"
                  ? "bg-emerald-50 text-emerald-950 border border-emerald-300"
                  : "bg-red-50 text-red-950 border border-red-300"
              }`}
            >
              {synthesizeStatus.type === "success" ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
              )}
              <div className="space-y-1">
                <div className="font-semibold">{synthesizeStatus.message}</div>
                {synthesizeStatus.summary && (
                  <div className="text-[11px] font-mono text-emerald-800">
                    Surface Pressure: {synthesizeStatus.summary.surface_pressure_hpa} hPa · Elevation Delta: {synthesizeStatus.summary.elevation_delta_m > 0 ? `+${synthesizeStatus.summary.elevation_delta_m}` : synthesizeStatus.summary.elevation_delta_m}m · Hours: {synthesizeStatus.summary.records_count}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
