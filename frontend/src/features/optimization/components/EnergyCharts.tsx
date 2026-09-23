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
  IndianRupee,
  TrendingDown,
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
  const [activeTab, setActiveTab] = useState<"all" | "diurnal" | "comparison" | "breakdown" | "pareto" | "payback">("all");

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

  // 7. 5-Year Cumulative Lifecycle Cost & Payback Data (in ₹ Lakhs)
  const baselineCapex = 4.5; // ₹4.5 Lakhs (standard uninsulated GI/CGI barrack structure)
  const proposedCapex = 8.5; // ₹8.5 Lakhs (passive insulated envelope + solar PV + battery + inverter)
  const ultraPassiveCapex = 11.2; // ₹11.2 Lakhs (aerogel VIP composite + 5.2 kWp PV microgrid)

  const baselineMonthlyLakhs = costBreakdown.baselineTotalCostPerMonth / 100000;
  const proposedMonthlyLakhs = costBreakdown.monthlyTotalCost / 100000;
  const ultraMonthlyLakhs = Math.max(0.02, (costBreakdown.monthlyTotalCost * 0.45) / 100000);

  const monthsMilestones = [0, 6, 12, 18, 24, 30, 36, 42, 48, 54, 60];
  const lifecyclePaybackData = monthsMilestones.map((m) => {
    const baseTotal = baselineCapex + m * baselineMonthlyLakhs;
    const propTotal = proposedCapex + m * proposedMonthlyLakhs;
    const ultraTotal = ultraPassiveCapex + m * ultraMonthlyLakhs;
    return {
      monthNum: m,
      monthLabel: m === 0 ? "Initial" : `Yr ${(m / 12).toFixed(1)}`,
      baselineCumulative: parseFloat(baseTotal.toFixed(2)),
      proposedCumulative: parseFloat(propTotal.toFixed(2)),
      ultraCumulative: parseFloat(ultraTotal.toFixed(2)),
    };
  });

  return (
    <div className="space-y-6">
      {/* Chart Navigation Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-secondary flex items-center justify-center text-foreground border border-border">
            <Activity className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <span className="micro-label">Comparative Energy Analytics</span>
            <h3 className="font-editorial text-2xl font-medium text-foreground tracking-tight mt-0.5">
              Thermodynamic & Cost Analytics Studio
            </h3>
          </div>
        </div>
        <div className="flex items-center gap-1 bg-secondary/50 p-1 rounded-full border border-border text-xs flex-wrap">
          {(
            [
              { id: "all", label: "All Charts" },
              { id: "diurnal", label: "24h Diurnal" },
              { id: "comparison", label: "Baseline vs Proposed" },
              { id: "breakdown", label: "Energy & Cost Breakdown" },
              { id: "pareto", label: "Cost vs Comfort" },
              { id: "payback", label: "5-Yr Payback" },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-full px-3.5 py-1 text-xs font-semibold transition cursor-pointer ${
                activeTab === tab.id
                  ? "bg-black text-white dark:bg-white dark:text-black shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of 6 Analytics Graphs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* GRAPH 1: 24-Hour Diurnal Temperature Profile */}
        {(activeTab === "all" || activeTab === "diurnal") && (
          <div className="rounded-[2rem] border border-border bg-card p-6 sm:p-7 shadow-[0_20px_55px_rgba(0,0,0,.04)] space-y-4 lg:col-span-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
              <div>
                <span className="micro-label">Hourly Thermal Balance</span>
                <h4 className="font-editorial text-xl font-medium text-foreground tracking-tight mt-0.5 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                  1. 24-Hour Indoor Temperature Profile & Kerosene Backup Points
                </h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Shows diurnal thermal response, comfort band ({comfortConfig.comfortMinC}°C–{comfortConfig.comfortMaxC}°C),
                  and points where kerosene backup heater was triggered.
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="text-xs text-amber-600 dark:text-amber-400 border-amber-500/30">
                  <Sun className="w-3 h-3 mr-1" />
                  Roof PV: {solarHardware.rooftopPvKw.toFixed(1)} kWp | BIPV: {solarHardware.windowBipvKw.toFixed(2)} kWp
                </Badge>
                <Badge variant="outline" className="text-xs text-cyan-600 dark:text-cyan-400 border-cyan-500/30">
                  Hourly Simulation
                </Badge>
              </div>
            </div>

            <div className="h-80 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={diurnalChartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.08} />
                  <XAxis dataKey="hour" stroke="#6E818F" fontSize={11} />
                  <YAxis
                    stroke="#6E818F"
                    fontSize={11}
                    unit="°C"
                    domain={[-20, 26]}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", borderRadius: "1rem", color: "hsl(var(--foreground))", boxShadow: "0 10px 30px rgba(0,0,0,0.08)" }}
                    labelStyle={{ color: "hsl(var(--foreground))", fontWeight: "600" }}
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
            <div className="flex items-center gap-4 text-[11px] text-muted-foreground bg-secondary/40 p-3 rounded-xl border border-border/80">
              <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-semibold">
                ● Amber Dots: Kerosene Backup Active
              </span>
              <span>
                Kerosene is activated strictly during nocturnal hours when stored battery energy is exhausted and indoor temperature breaches {comfortConfig.comfortMinC}°C.
              </span>
            </div>
          </div>
        )}

        {/* GRAPH 2: Existing vs Proposed Bar Chart */}
        {(activeTab === "all" || activeTab === "comparison") && (
          <div className="rounded-[2rem] border border-border bg-card p-6 sm:p-7 shadow-[0_20px_55px_rgba(0,0,0,.04)] space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <span className="micro-label">Comparative Baseline</span>
                <h4 className="font-editorial text-lg font-medium text-foreground tracking-tight mt-0.5 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  2. Existing Shelter vs Proposed Passive + Solar
                </h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Direct normalized comparison under identical climate & occupancy.
                </p>
              </div>
            </div>

            <div className="h-64 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={comparisonBarData} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.08} />
                  <XAxis dataKey="metric" stroke="#6E818F" fontSize={10} angle={-15} textAnchor="end" />
                  <YAxis stroke="#6E818F" fontSize={11} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", borderRadius: "1rem", color: "hsl(var(--foreground))", boxShadow: "0 10px 30px rgba(0,0,0,0.08)" }}
                  />
                  <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
                  <Bar dataKey="baseline" name="Existing Shelter (Baseline)" fill="#ef4444" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="proposed" name="Proposed Shelter" fill="#10b981" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* GRAPH 3: Energy Source Breakdown */}
        {(activeTab === "all" || activeTab === "breakdown") && (
          <div className="rounded-[2rem] border border-border bg-card p-6 sm:p-7 shadow-[0_20px_55px_rgba(0,0,0,.04)] space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <span className="micro-label">Dispatch Allocation</span>
                <h4 className="font-editorial text-lg font-medium text-foreground tracking-tight mt-0.5 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-500" />
                  3. Energy Contribution Breakdown (Daily)
                </h4>
                <p className="text-xs text-muted-foreground mt-0.5">
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
                    contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", borderRadius: "1rem", color: "hsl(var(--foreground))", boxShadow: "0 10px 30px rgba(0,0,0,0.08)" }}
                    formatter={(val: number) => [`${val} kWh/day`, "Delivered Energy"]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* GRAPH 4: Cost Breakdown */}
        {(activeTab === "all" || activeTab === "breakdown") && (
          <div className="rounded-[2rem] border border-border bg-card p-6 sm:p-7 shadow-[0_20px_55px_rgba(0,0,0,.04)] space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <span className="micro-label">Logistics Accounting</span>
                <h4 className="font-editorial text-lg font-medium text-foreground tracking-tight mt-0.5 flex items-center gap-2">
                  <PieIcon className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  4. Monthly Operating Cost Breakdown (₹)
                </h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Fuel purchase, mountain transit, storage handling, and electricity.
                </p>
              </div>
              <Badge variant="outline" className="text-xs text-muted-foreground border-border font-mono">
                Total: ₹{costBreakdown.monthlyTotalCost.toLocaleString()}
              </Badge>
            </div>

            <div className="h-64 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={costBreakdownData} layout="vertical" margin={{ top: 10, right: 30, left: 60, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.08} />
                  <XAxis type="number" stroke="#6E818F" fontSize={11} tickFormatter={(v) => `₹${v}`} />
                  <YAxis type="category" dataKey="name" stroke="#6E818F" fontSize={10} width={100} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", borderRadius: "1rem", color: "hsl(var(--foreground))", boxShadow: "0 10px 30px rgba(0,0,0,0.08)" }}
                    formatter={(val: number) => [`₹${val.toLocaleString()}/mo`, "Cost Component"]}
                  />
                  <Bar dataKey="value" name="Monthly Cost (₹)" fill="#8b5cf6" radius={[0, 6, 6, 0]}>
                    {costBreakdownData.map((entry, index) => (
                      <Cell key={`bar-cost-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* GRAPH 5: Cost vs Comfort Trade-off Curve */}
        {(activeTab === "all" || activeTab === "pareto") && (
          <div className="rounded-[2rem] border border-border bg-card p-6 sm:p-7 shadow-[0_20px_55px_rgba(0,0,0,.04)] space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <span className="micro-label">Pareto Trade-Off</span>
                <h4 className="font-editorial text-lg font-medium text-foreground tracking-tight mt-0.5 flex items-center gap-2">
                  <ScatterIcon className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                  5. Cost vs Comfort Optimization Trade-off
                </h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  X-Axis: Monthly Total Cost (₹) | Y-Axis: Living Zone Comfort Hours/day
                </p>
              </div>
              <Badge variant="outline" className="text-xs text-cyan-600 dark:text-cyan-400 border-cyan-500/30">
                Multi-Design Frontier
              </Badge>
            </div>

            <div className="h-64 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 10, right: 30, left: 0, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.08} />
                  <XAxis
                    type="number"
                    dataKey="cost"
                    name="Monthly Cost"
                    unit="₹"
                    stroke="#6E818F"
                    fontSize={11}
                    domain={["auto", "auto"]}
                  />
                  <YAxis
                    type="number"
                    dataKey="comfortHours"
                    name="Comfort Hours"
                    unit="h"
                    stroke="#6E818F"
                    fontSize={11}
                    domain={[12, 24]}
                  />
                  <ZAxis range={[60, 160]} />
                  <Tooltip
                    cursor={{ strokeDasharray: "3 3" }}
                    contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", borderRadius: "1rem", color: "hsl(var(--foreground))", boxShadow: "0 10px 30px rgba(0,0,0,0.08)" }}
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
            <div className="text-[11px] text-muted-foreground flex items-center justify-between p-3 rounded-xl bg-secondary/40 border border-border/80">
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold">● Green Node: Active Proposed Shelter</span>
              <span>Ideal Frontier: Top-left quadrant (High Comfort, Low Cost)</span>
            </div>
          </div>
        )}

        {/* GRAPH 6: Monthly Kerosene Reduction Comparison */}
        {(activeTab === "all" || activeTab === "comparison") && (
          <div className="rounded-[2rem] border border-border bg-card p-6 sm:p-7 shadow-[0_20px_55px_rgba(0,0,0,.04)] space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <span className="micro-label">Fossil Fuel Abatement</span>
                <h4 className="font-editorial text-lg font-medium text-foreground tracking-tight mt-0.5 flex items-center gap-2">
                  <Flame className="w-4 h-4 text-rose-500" />
                  6. Monthly Kerosene Reduction (Baseline vs Proposed)
                </h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Fossil fuel saving achieved strictly through passive envelope + solar heating.
                </p>
              </div>
              <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                Save {fossilFuelMetrics.keroseneSavedLPerMonth} L/mo
              </Badge>
            </div>

            <div className="h-64 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyKeroseneData} margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.08} />
                  <XAxis dataKey="category" stroke="#6E818F" fontSize={11} />
                  <YAxis stroke="#6E818F" fontSize={11} unit=" L" />
                  <Tooltip
                    contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", borderRadius: "1rem", color: "hsl(var(--foreground))", boxShadow: "0 10px 30px rgba(0,0,0,0.08)" }}
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
          </div>
        )}

        {/* GRAPH 7: 5-Year Cumulative Lifecycle Cost & Payback Projection */}
        {(activeTab === "all" || activeTab === "payback") && (
          <div className="rounded-[2rem] border border-border bg-card p-6 sm:p-7 shadow-[0_20px_55px_rgba(0,0,0,.04)] space-y-4 lg:col-span-2">
            <div className="flex items-center justify-between flex-wrap gap-2 border-b border-border pb-3">
              <div>
                <span className="micro-label">Lifecycle Break-Even Analysis</span>
                <h4 className="font-editorial text-xl font-medium text-foreground tracking-tight mt-0.5 flex items-center gap-2">
                  <IndianRupee className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  7. 5-Year Cumulative Lifecycle Expenditure & Payback Trajectory
                </h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Total capital investment plus cumulative fuel/convoy logistics costs over 60 months (in ₹ Lakhs).
                  Cross-over indicates financial break-even against uninsulated CGI barrack.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                  <TrendingDown className="w-3 h-3 mr-1" />
                  Net 5-Yr Savings: ₹{Math.round(((baselineMonthlyLakhs - proposedMonthlyLakhs) * 60 - (proposedCapex - baselineCapex)) * 10) / 10} Lakhs
                </Badge>
              </div>
            </div>

            <div className="h-72 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={lifecyclePaybackData} margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.08} />
                  <XAxis dataKey="monthLabel" stroke="#6E818F" fontSize={11} />
                  <YAxis stroke="#6E818F" fontSize={11} unit=" L" tickFormatter={(v) => `₹${v}L`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", borderRadius: "1rem", color: "hsl(var(--foreground))", boxShadow: "0 10px 30px rgba(0,0,0,0.08)" }}
                    formatter={(val: number, name: string) => [`₹${val} Lakhs`, name]}
                  />
                  <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
                  <Line
                    type="monotone"
                    dataKey="baselineCumulative"
                    name="Conventional CGI Barrack (₹ Lakhs)"
                    stroke="#ef4444"
                    strokeWidth={2.5}
                    strokeDasharray="5 5"
                    dot={{ fill: "#ef4444", r: 3 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="proposedCumulative"
                    name="Proposed Passive + Solar (₹ Lakhs)"
                    stroke="#10b981"
                    strokeWidth={3}
                    dot={{ fill: "#10b981", r: 4 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="ultraCumulative"
                    name="Ultra-Passive Microgrid (₹ Lakhs)"
                    stroke="#06b6d4"
                    strokeWidth={2}
                    dot={{ fill: "#06b6d4", r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="text-[11px] text-muted-foreground bg-secondary/40 p-3 rounded-xl border border-border/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                ● Break-even occurs within ~{(Math.max(1, Math.round((proposedCapex - baselineCapex) / Math.max(0.01, baselineMonthlyLakhs - proposedMonthlyLakhs))))} months.
              </span>
              <span>After break-even, the passive solar shelter delivers pure operational defense savings.</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
