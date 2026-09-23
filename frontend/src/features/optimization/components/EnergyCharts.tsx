"use client";

import React, { useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  ReferenceArea,
  ReferenceLine,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  ScatterChart,
  Scatter,
  ZAxis,
} from "recharts";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Activity,
  BarChart3,
  PieChart as PieIcon,
  ScatterChart as ScatterIcon,
  Flame,
  Zap,
  Sun,
} from "lucide-react";
import {
  EnergySimulationResult,
  DesignTradeoffCandidate,
} from "../energy-types";

interface EnergyChartsProps {
  simulationResult: EnergySimulationResult;
  tradeoffCandidates: DesignTradeoffCandidate[];
}

export function EnergyCharts({
  simulationResult,
  tradeoffCandidates,
}: EnergyChartsProps) {
  const [activeTab, setActiveTab] = useState<"all" | "diurnal" | "comparison" | "breakdown" | "pareto">("all");

  const {
    hourlyData,
    comfortConfig,
    thermalPerformance,
    baselineThermalPerformance,
    energyMetrics,
    fossilFuelMetrics,
    costBreakdown,
    solarHardware,
  } = simulationResult;

  // 1. Diurnal 24-Hour Temperature Data formatting
  const diurnalChartData = hourlyData.map((d) => ({
    hour: d.timestamp,
    outdoorTemp: d.outdoorTempC,
    baselineTemp: d.baselineIndoorTempC,
    proposedTemp: d.proposedIndoorTempC,
    freeFloatingTemp: d.proposedFreeFloatingTempC,
    keroseneActiveMarker: d.keroseneBackupActivated ? d.proposedIndoorTempC : null,
    keroseneLitres: d.keroseneConsumedL,
    solarKw: parseFloat((d.solarGeneratedKwh).toFixed(2)),
    roofSolarKw: parseFloat((d.rooftopSolarKwh).toFixed(2)),
    windowBipvKw: parseFloat((d.windowBipvSolarKwh).toFixed(2)),
  }));

  // 2. Existing vs Proposed Bar Chart
  const comparisonBarData = [
    {
      metric: "Kerosene (L/day)",
      baseline: fossilFuelMetrics.baselineKeroseneLPerDay,
      proposed: fossilFuelMetrics.keroseneLPerDay,
      unit: "L/d",
    },
    {
      metric: "Total Energy (kWh/day)",
      baseline: parseFloat((fossilFuelMetrics.baselineKeroseneLPerDay * 9.8 * 0.82).toFixed(1)),
      proposed: energyMetrics.totalEnergyRequirementKwhPerDay,
      unit: "kWh/d",
    },
    {
      metric: "Daily Cost (₹/day)",
      baseline: Math.round(costBreakdown.baselineTotalCostPerMonth / 30),
      proposed: costBreakdown.dailyTotalCost,
      unit: "₹/d",
    },
    {
      metric: "Comfort Hours (h/day)",
      baseline: baselineThermalPerformance.comfortHoursPerDay,
      proposed: thermalPerformance.comfortHoursPerDay,
      unit: "h/d",
    },
  ];

  // 3. Energy Source Breakdown Data (Daily kWh)
  const energyBreakdownData = [
    { name: "Rooftop Solar PV", value: energyMetrics.rooftopSolarKwhPerDay, color: "#eab308" },
    { name: "Window BIPV Panes", value: energyMetrics.windowBipvSolarKwhPerDay, color: "#06b6d4" },
    { name: "Battery Storage Discharge", value: energyMetrics.batteryEnergyUsedKwhPerDay, color: "#38bdf8" },
    { name: "Supplemental Electric", value: Math.max(0, energyMetrics.electricityUsedForHeatingKwhPerDay - energyMetrics.solarEnergyUsedKwhPerDay), color: "#a855f7" },
    { name: "Kerosene Backup", value: parseFloat((fossilFuelMetrics.keroseneLPerDay * 9.8 * 0.82).toFixed(1)), color: "#f97316" },
  ].filter((d) => d.value > 0);

  // 4. Cost Breakdown Data (Delivered Monthly ₹)
  const costBreakdownData = [
    { name: "Fuel Purchase", value: costBreakdown.fuelPurchaseCostPerMonth, color: "#f97316" },
    { name: "Transport (Road/Air)", value: costBreakdown.transportationCostPerMonth, color: "#ec4899" },
    { name: "Handling & Storage", value: costBreakdown.handlingStorageCostPerMonth, color: "#8b5cf6" },
    { name: "Auxiliary Electricity", value: costBreakdown.electricityCostPerMonth, color: "#06b6d4" },
  ];

  // 5. Cost vs Comfort Pareto Data
  const paretoScatterData = tradeoffCandidates.map((c) => ({
    name: c.name,
    cost: c.metrics.totalCostPerMonth,
    comfortHours: c.metrics.comfortHoursPerDay,
    keroseneL: c.metrics.keroseneLPerDay,
    isCurrent: !!c.isCurrentProposed,
  }));

  // 6. Monthly Kerosene Reduction Data
  const monthlyKeroseneData = [
    { category: "Conventional Baseline", keroseneLitres: fossilFuelMetrics.baselineKeroseneLPerMonth, fill: "#ef4444" },
    { category: "Proposed Passive+Solar", keroseneLitres: fossilFuelMetrics.keroseneLPerMonth, fill: "#10b981" },
  ];

  return (
    <div className="space-y-6">
      {/* Chart Navigation Tabs */}
      <div className="flex items-center justify-between flex-wrap gap-2 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-cyan-400" />
          <h3 className="text-sm font-semibold text-slate-100 tracking-wide">
            Thermal, Energy & Lifecycle Analytics (6 Key Dimensions)
          </h3>
        </div>
        <div className="flex items-center gap-1.5 bg-slate-900/80 p-1 rounded-lg border border-slate-800 text-xs">
          <Button
            variant={activeTab === "all" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("all")}
            className="h-7 text-xs px-2.5"
          >
            All Charts
          </Button>
          <Button
            variant={activeTab === "diurnal" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("diurnal")}
            className="h-7 text-xs px-2.5"
          >
            24h Diurnal
          </Button>
          <Button
            variant={activeTab === "comparison" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("comparison")}
            className="h-7 text-xs px-2.5"
          >
            Baseline vs Proposed
          </Button>
          <Button
            variant={activeTab === "breakdown" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("breakdown")}
            className="h-7 text-xs px-2.5"
          >
            Energy & Cost Breakdown
          </Button>
          <Button
            variant={activeTab === "pareto" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("pareto")}
            className="h-7 text-xs px-2.5"
          >
            Cost vs Comfort
          </Button>
        </div>
      </div>

      {/* Grid of 6 Analytics Graphs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* GRAPH 1: 24-Hour Diurnal Temperature Profile */}
        {(activeTab === "all" || activeTab === "diurnal") && (
          <Card className="p-5 bg-slate-900/60 border-slate-800 space-y-3 lg:col-span-2">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-cyan-400" />
                  1. 24-Hour Indoor Temperature Profile & Kerosene Backup Points
                </h4>
                <p className="text-xs text-slate-400">
                  Shows diurnal thermal response, comfort band ({comfortConfig.comfortMinC}°C–{comfortConfig.comfortMaxC}°C),
                  and points where kerosene backup heater was triggered.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs text-yellow-400 border-yellow-500/30">
                  <Sun className="w-3 h-3 mr-1" />
                  Roof PV: {solarHardware.rooftopPvKw.toFixed(1)} kWp | BIPV: {solarHardware.windowBipvKw.toFixed(2)} kWp
                </Badge>
                <Badge variant="outline" className="text-xs text-cyan-400 border-cyan-500/30">
                  Hourly Simulation
                </Badge>
              </div>
            </div>

            <div className="h-80 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={diurnalChartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                  <XAxis dataKey="hour" stroke="#94a3b8" fontSize={11} />
                  <YAxis
                    stroke="#94a3b8"
                    fontSize={11}
                    unit="°C"
                    domain={[-20, 26]}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "8px", fontSize: "12px" }}
                    labelStyle={{ color: "#f8fafc", fontWeight: "bold" }}
                  />
                  <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
                  
                  {/* Comfort Range Shading */}
                  <ReferenceArea
                    y1={comfortConfig.comfortMinC}
                    y2={comfortConfig.comfortMaxC}
                    fill="#10b981"
                    fillOpacity={0.08}
                    stroke="#10b981"
                    strokeDasharray="3 3"
                    strokeOpacity={0.3}
                  />
                  <ReferenceLine y={comfortConfig.comfortMinC} stroke="#10b981" strokeDasharray="4 4" label={{ value: "Min Comfort (18°C)", fill: "#10b981", fontSize: 10, position: "insideBottomLeft" }} />
                  
                  <Line
                    type="monotone"
                    dataKey="outdoorTemp"
                    name="Outdoor Ambient (°C)"
                    stroke="#64748b"
                    strokeWidth={1.5}
                    strokeDasharray="4 4"
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="baselineTemp"
                    name="Baseline Shelter (°C)"
                    stroke="#f43f5e"
                    strokeWidth={1.8}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="proposedTemp"
                    name="Proposed Passive + Solar Shelter (°C)"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="freeFloatingTemp"
                    name="Zero-Active Free Floating (°C)"
                    stroke="#38bdf8"
                    strokeWidth={1}
                    strokeDasharray="2 2"
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="keroseneActiveMarker"
                    name="Kerosene Backup Trigger (°C)"
                    stroke="#f59e0b"
                    strokeWidth={0}
                    dot={{ r: 5, fill: "#f59e0b", strokeWidth: 2, stroke: "#ffffff" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center gap-4 text-[11px] text-slate-400 bg-slate-950/50 p-2.5 rounded-lg border border-slate-800">
              <span className="flex items-center gap-1.5 text-amber-400 font-medium">
                ● Amber Dots: Kerosene Backup Active
              </span>
              <span>
                Kerosene is activated strictly during nocturnal hours when stored battery energy is exhausted and indoor temperature breaches {comfortConfig.comfortMinC}°C.
              </span>
            </div>
          </Card>
        )}

        {/* GRAPH 2: Existing vs Proposed Bar Chart */}
        {(activeTab === "all" || activeTab === "comparison") && (
          <Card className="p-5 bg-slate-900/60 border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-emerald-400" />
                  2. Existing Shelter vs Proposed Passive + Solar
                </h4>
                <p className="text-xs text-slate-400">
                  Direct normalized comparison under identical climate & occupancy.
                </p>
              </div>
            </div>

            <div className="h-64 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={comparisonBarData} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                  <XAxis dataKey="metric" stroke="#94a3b8" fontSize={10} angle={-15} textAnchor="end" />
                  <YAxis stroke="#94a3b8" fontSize={11} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "8px", fontSize: "12px" }}
                  />
                  <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
                  <Bar dataKey="baseline" name="Existing Shelter (Baseline)" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="proposed" name="Proposed Shelter" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        )}

        {/* GRAPH 3: Energy Source Breakdown */}
        {(activeTab === "all" || activeTab === "breakdown") && (
          <Card className="p-5 bg-slate-900/60 border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-yellow-400" />
                  3. Energy Contribution Breakdown (Daily)
                </h4>
                <p className="text-xs text-slate-400">
                  Rooftop solar, window BIPV panes, battery storage, and kerosene backup shares.
                </p>
              </div>
            </div>

            <div className="h-64 w-full flex items-center justify-center pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={energyBreakdownData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    labelLine={false}
                  >
                    {energyBreakdownData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "8px", fontSize: "12px" }}
                    formatter={(val: number) => [`${val} kWh/day`, "Delivered Energy"]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>
        )}

        {/* GRAPH 4: Cost Breakdown */}
        {(activeTab === "all" || activeTab === "breakdown") && (
          <Card className="p-5 bg-slate-900/60 border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                  <PieIcon className="w-4 h-4 text-purple-400" />
                  4. Monthly Operating Cost Breakdown (₹)
                </h4>
                <p className="text-xs text-slate-400">
                  Fuel purchase, mountain transit, storage handling, and electricity.
                </p>
              </div>
              <Badge variant="outline" className="text-xs text-slate-400 border-slate-700">
                Total: ₹{costBreakdown.monthlyTotalCost.toLocaleString()}
              </Badge>
            </div>

            <div className="h-64 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={costBreakdownData} layout="vertical" margin={{ top: 10, right: 30, left: 60, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                  <XAxis type="number" stroke="#94a3b8" fontSize={11} tickFormatter={(v) => `₹${v}`} />
                  <YAxis type="category" dataKey="name" stroke="#94a3b8" fontSize={10} width={100} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "8px", fontSize: "12px" }}
                    formatter={(val: number) => [`₹${val.toLocaleString()}/mo`, "Cost Component"]}
                  />
                  <Bar dataKey="value" name="Monthly Cost (₹)" fill="#8b5cf6" radius={[0, 4, 4, 0]}>
                    {costBreakdownData.map((entry, index) => (
                      <Cell key={`bar-cost-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        )}

        {/* GRAPH 5: Cost vs Comfort Trade-off Curve */}
        {(activeTab === "all" || activeTab === "pareto") && (
          <Card className="p-5 bg-slate-900/60 border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                  <ScatterIcon className="w-4 h-4 text-cyan-400" />
                  5. Cost vs Comfort Optimization Trade-off
                </h4>
                <p className="text-xs text-slate-400">
                  X-Axis: Monthly Total Cost (₹) | Y-Axis: Living Zone Comfort Hours/day
                </p>
              </div>
              <Badge variant="outline" className="text-xs text-cyan-400 border-cyan-500/30">
                Multi-Design Frontier
              </Badge>
            </div>

            <div className="h-64 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 10, right: 30, left: 0, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                  <XAxis
                    type="number"
                    dataKey="cost"
                    name="Monthly Cost"
                    unit="₹"
                    stroke="#94a3b8"
                    fontSize={11}
                    domain={["auto", "auto"]}
                  />
                  <YAxis
                    type="number"
                    dataKey="comfortHours"
                    name="Comfort Hours"
                    unit="h"
                    stroke="#94a3b8"
                    fontSize={11}
                    domain={[12, 24]}
                  />
                  <ZAxis range={[60, 160]} />
                  <Tooltip
                    cursor={{ strokeDasharray: "3 3" }}
                    contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "8px", fontSize: "12px" }}
                    formatter={(value: any, name: string) => [
                      name === "Monthly Cost" ? `₹${value.toLocaleString()}` : `${value} h/day`,
                      name,
                    ]}
                  />
                  <Scatter name="Design Configurations" data={paretoScatterData} fill="#38bdf8">
                    {paretoScatterData.map((entry, index) => (
                      <Cell
                        key={`cell-scatter-${index}`}
                        fill={entry.isCurrent ? "#10b981" : "#06b6d4"}
                        stroke={entry.isCurrent ? "#ffffff" : "#0284c7"}
                        strokeWidth={entry.isCurrent ? 2 : 1}
                      />
                    ))}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            </div>
            <div className="text-[11px] text-slate-400 flex items-center justify-between">
              <span className="text-emerald-400 font-medium">● Green Node: Active Proposed Shelter</span>
              <span>Ideal Frontier: Top-left quadrant (High Comfort, Low Cost)</span>
            </div>
          </Card>
        )}

        {/* GRAPH 6: Monthly Kerosene Reduction Comparison */}
        {(activeTab === "all" || activeTab === "comparison") && (
          <Card className="p-5 bg-slate-900/60 border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                  <Flame className="w-4 h-4 text-rose-400" />
                  6. Monthly Kerosene Reduction (Baseline vs Proposed)
                </h4>
                <p className="text-xs text-slate-400">
                  Fossil fuel saving achieved strictly through passive envelope + solar heating.
                </p>
              </div>
              <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30">
                Save {fossilFuelMetrics.keroseneSavedLPerMonth} L/mo
              </Badge>
            </div>

            <div className="h-64 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyKeroseneData} margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                  <XAxis dataKey="category" stroke="#94a3b8" fontSize={11} />
                  <YAxis stroke="#94a3b8" fontSize={11} unit=" L" />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "8px", fontSize: "12px" }}
                    formatter={(val: number) => [`${val} Litres/month`, "Kerosene Required"]}
                  />
                  <Bar dataKey="keroseneLitres" name="Kerosene Consumption (L/month)" radius={[6, 6, 0, 0]}>
                    {monthlyKeroseneData.map((entry, index) => (
                      <Cell key={`bar-kerosene-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
