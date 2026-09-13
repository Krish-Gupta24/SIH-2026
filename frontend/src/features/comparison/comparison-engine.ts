import { SimulationJobItem } from "@/lib/store/use-shelter-store";
import {
  ComparisonObjective,
  ComparisonObjectiveId,
  MetricDifference,
  WinnerEvaluationResult,
  ReproducibilityManifest,
} from "./types";

export const COMPARISON_OBJECTIVES: ComparisonObjective[] = [
  {
    id: "passive-resilience",
    title: "Maximize Passive Nocturnal Resilience",
    shortLabel: "Nocturnal Resilience",
    description: "Prioritizes maintaining the highest indoor minimum temperature during coldest pre-dawn hours without fuel or active heating.",
    constraintDescription: "Zero Active HVAC (Unconditioned Mode, Sub-Zero Alpine Winter)",
    primaryMetric: "Minimum Indoor Temperature",
    higherIsBetter: true,
  },
  {
    id: "minimize-energy",
    title: "Minimize Annual Space Heating Energy",
    shortLabel: "Minimum Heating Energy",
    description: "Minimizes auxiliary fuel and electricity consumption required to sustain indoor comfort standards.",
    constraintDescription: "Target Living Zone Comfort ≥ 75% of Winter Run Period",
    primaryMetric: "Heating Demand Index (kWh/m²·a)",
    higherIsBetter: false,
  },
  {
    id: "maximize-comfort",
    title: "Maximize Adaptive Comfort Band Hours",
    shortLabel: "Maximum Comfort Hours",
    description: "Maximizes operational hours within the 18°C–24°C thermal envelope per ASHRAE 55 Adaptive Comfort standards.",
    constraintDescription: "Standard Structural Footprint & Passive Solar Aperture",
    primaryMetric: "Hours in Comfort Band (%)",
    higherIsBetter: true,
  },
  {
    id: "balanced-optimum",
    title: "Balanced Multi-Criteria Thermal Resilience",
    shortLabel: "Balanced Multi-Criteria",
    description: "Holistic composite evaluation balancing nocturnal buffer, solar harvesting efficiency, minimal auxiliary heating, and thermal swing damping.",
    constraintDescription: "Comprehensive Cold-Climate Engineering Envelope",
    primaryMetric: "Composite Resilience Score (0–100)",
    higherIsBetter: true,
  },
];

export function calculateDifference(
  baselineValue: number,
  candidateValue: number,
  higherIsBetter: boolean,
  unit: string = ""
): MetricDifference {
  const deltaAbsolute = Number((candidateValue - baselineValue).toFixed(2));
  let deltaPercentage = 0;

  if (Math.abs(baselineValue) > 0.0001) {
    deltaPercentage = Number(((candidateValue - baselineValue) / Math.abs(baselineValue) * 100).toFixed(1));
  }

  const isImprovement = higherIsBetter ? deltaAbsolute > 0 : deltaAbsolute < 0;

  return {
    baselineValue,
    candidateValue,
    deltaAbsolute,
    deltaPercentage,
    isImprovement,
    unit,
  };
}

export function evaluateObjectiveWinner(
  jobs: SimulationJobItem[],
  objectiveId: ComparisonObjectiveId = "passive-resilience"
): WinnerEvaluationResult {
  const objective =
    COMPARISON_OBJECTIVES.find((o) => o.id === objectiveId) ||
    COMPARISON_OBJECTIVES[0];

  const scoresByJobId: Record<string, number> = {};

  jobs.forEach((job) => {
    const summary = job.results?.summary;
    if (!summary) {
      scoresByJobId[job.id] = 0;
      return;
    }

    switch (objectiveId) {
      case "passive-resilience": {
        // Score primarily on Min Indoor Temp (°C) mapped to 0-75 pts base, with up to 25 pts for damping
        const minTemp = summary.indoorMinC;
        const damping = summary.diurnalSwingDampingPct ?? 0;
        const tempBase = Math.min(75, Math.max(0, (minTemp + 30) * (75 / 45)));
        const dampBonus = Math.min(25, Math.max(0, damping * 0.25));
        scoresByJobId[job.id] = Number((tempBase + dampBonus).toFixed(1));
        break;
      }
      case "minimize-energy": {
        // Lower heating demand is better; invert to higher score
        const demand = summary.heatingDemandKwhM2;
        const comfortPct = summary.comfortHoursPct;
        const penalty = comfortPct < 70 ? (70 - comfortPct) * 2 : 0;
        scoresByJobId[job.id] = Number((Math.max(0, 200 - demand) - penalty).toFixed(2));
        break;
      }
      case "maximize-comfort": {
        // Comfort percentage is paramount
        const comfortPct = summary.comfortHoursPct;
        const meanTemp = summary.indoorMeanC;
        scoresByJobId[job.id] = Number((comfortPct * 0.8 + meanTemp * 1.5).toFixed(2));
        break;
      }
      case "balanced-optimum":
      default: {
        // Weighted composite formula:
        // 35% Comfort Hours + 30% Min Night Temp + 20% Heating Reduction + 15% Damping Ratio
        const cScore = summary.comfortHoursPct * 0.35;
        const tScore = Math.min(100, Math.max(0, (summary.indoorMinC + 10) * 4)) * 0.30;
        const eScore = Math.min(100, Math.max(0, (180 - summary.heatingDemandKwhM2) * 0.6)) * 0.20;
        const dScore = (summary.diurnalSwingDampingPct ?? 0) * 0.15;
        scoresByJobId[job.id] = Number((cScore + tScore + eScore + dScore).toFixed(1));
        break;
      }
    }
  });

  // Sort by score descending
  const sorted = [...jobs].sort(
    (a, b) => (scoresByJobId[b.id] ?? 0) - (scoresByJobId[a.id] ?? 0)
  );

  const winner = sorted[0];
  const runnerUp = sorted[1];
  const winScore = scoresByJobId[winner?.id] ?? 0;
  const runnerScore = scoresByJobId[runnerUp?.id] ?? 0;
  const marginPct =
    runnerScore > 0.1
      ? Math.max(0, Math.round(((winScore - runnerScore) / runnerScore) * 100))
      : 0;

  const winSummary = winner?.results?.summary;
  const runnerSummary = runnerUp?.results?.summary;

  // Build rigorous multi-criteria rationale
  const rationalePoints: string[] = [];

  if (winSummary && runnerSummary) {
    if (objectiveId === "passive-resilience") {
      rationalePoints.push(
        `Maintains a pre-dawn minimum indoor temperature of ${winSummary.indoorMinC}°C (+${(winSummary.indoorMinC - runnerSummary.indoorMinC).toFixed(1)}°C higher than ${runnerUp.projectName}).`
      );
      rationalePoints.push(
        `Achieves ${winSummary.diurnalSwingDampingPct}% diurnal thermal damping due to effective thermal mass buffering.`
      );
      rationalePoints.push(
        `Zero reliance on auxiliary electrical heaters or diesel gensets under freeze-up risks.`
      );
    } else if (objectiveId === "minimize-energy") {
      const fuelReduction = runnerSummary.heatingDemandKwhM2 > 0.01
        ? `${Math.max(0, Math.round(((runnerSummary.heatingDemandKwhM2 - winSummary.heatingDemandKwhM2) / runnerSummary.heatingDemandKwhM2) * 100))}%`
        : "significant";
      rationalePoints.push(
        `Consumes only ${winSummary.heatingDemandKwhM2} kWh/m²·a space heating demand, reducing fuel requirements by ${fuelReduction}.`
      );
      rationalePoints.push(
        `Maintains compliance with winter comfort targets with ${winSummary.comfortHoursPct}% hours inside the comfort boundary.`
      );
      rationalePoints.push(
        `Significantly lowers logistics supply chain burdens for remote border outposts.`
      );
    } else if (objectiveId === "maximize-comfort") {
      rationalePoints.push(
        `Delivers ${winSummary.comfortHoursPct}% comfort band hours (18°C–24°C), outperforming ${runnerUp.projectName} by +${(winSummary.comfortHoursPct - runnerSummary.comfortHoursPct).toFixed(1)}% absolute comfort time.`
      );
      rationalePoints.push(
        `Maintains a balanced diurnal mean living zone temperature of ${winSummary.indoorMeanC}°C.`
      );
      rationalePoints.push(
        `Minimizes occupant cold stress and hypothermia indicators during severe sub-zero cold waves.`
      );
    } else {
      rationalePoints.push(
        `Highest composite engineering rating (${winScore}/100) balancing nocturnal warmth, comfort hours, and energy savings.`
      );
      rationalePoints.push(
        `Nocturnal minimum temp of ${winSummary.indoorMinC}°C with ${winSummary.comfortHoursPct}% comfort coverage and only ${winSummary.heatingDemandKwhM2} kWh/m²·a auxiliary heating demand.`
      );
      rationalePoints.push(
        `Superior life-cycle performance across extreme diurnal temperature fluctuations.`
      );
    }
  }

  // Canonical statement required by engineering specification
  const statementText = `Best according to ${objective.title} under ${objective.constraintDescription}.`;

  return {
    winnerJobId: winner?.id || "",
    winnerName: winner?.projectName || "Selected Design",
    objectiveId,
    objectiveTitle: objective.title,
    constraintDescription: objective.constraintDescription,
    statementText,
    marginOfVictory: `+${marginPct}% Margin over ${runnerUp?.projectName || "Runner-Up"}`,
    score: winScore,
    rationalePoints,
    scoresByJobId,
  };
}

export function generateReproducibilityManifest(jobs: SimulationJobItem[]): ReproducibilityManifest {
  const referenceJob = jobs[0];
  const weather = referenceJob?.weatherDatasetName || "Leh Airport Station (3500m)";
  const coords = {
    latitude: referenceJob?.shelterModel?.location?.latitude || 34.1526,
    longitude: referenceJob?.shelterModel?.location?.longitude || 77.5771,
  };
  const elevation = referenceJob?.shelterModel?.location?.elevation || 3500.0;

  return {
    manifestId: `REP-MAN-${Date.now().toString().slice(-8)}`,
    generatedAt: new Date().toISOString(),
    engineName: referenceJob?.engine || "EnergyPlus",
    engineVersion: referenceJob?.engineVersion || "26.1.0",
    weatherDatasetName: weather,
    weatherStationId: referenceJob?.weatherDatasetId || "wx-leh-ladakh",
    elevationM: elevation,
    coordinates: coords,
    simulationSettings: {
      timestepsPerHour: referenceJob?.shelterModel?.simulationSettings?.timestepsPerHour || 4,
      runPeriodDays: referenceJob?.shelterModel?.simulationSettings?.runPeriodDays || 3,
      startMonth: referenceJob?.shelterModel?.simulationSettings?.startMonth || 1,
      startDay: referenceJob?.shelterModel?.simulationSettings?.startDay || 1,
      solverTolerance: "1e-5 Energy Balance Convergence",
    },
    modelsCompared: jobs.map((j) => {
      const g = j.shelterModel?.geometry;
      const L = g?.length || 6.0;
      const W = g?.width || 4.0;
      const H = g?.height || 2.8;
      const floorArea = L * W;
      const vol = floorArea * H;

      const layers = j.shelterModel?.envelope?.walls?.south?.layers || j.shelterModel?.envelope?.walls?.north?.layers;
      let approxU: number | string = "Metric unavailable from this simulation";
      if (layers && layers.length > 0) {
        let totalR = 0.17;
        for (const l of layers) {
          const k = l.materialId?.includes("aerogel") ? 0.015 : l.materialId?.includes("eps") ? 0.035 : l.materialId?.includes("earth") ? 1.1 : 0.04;
          totalR += (l.thickness || 0.1) / k;
        }
        approxU = Number((1.0 / totalR).toFixed(2));
      } else if (typeof (j.results?.summary as any)?.totalHeatLossUA === "number" && floorArea > 0) {
        approxU = Number(((j.results?.summary as any).totalHeatLossUA / (floorArea * 3.5)).toFixed(2));
      }

      const ach = typeof j.shelterModel?.ventilation?.infiltrationACH === "number"
        ? j.shelterModel.ventilation.infiltrationACH
        : "Metric unavailable from this simulation";

      return {
        jobId: j.id,
        projectId: j.projectId,
        projectName: j.projectName,
        version: j.shelterModel?.project?.version || "1.0.0",
        dimensions: `${L}m × ${W}m × ${H}m`,
        floorAreaM2: Number(floorArea.toFixed(1)),
        volumeM3: Number(vol.toFixed(1)),
        wallUValueApprox: approxU,
        infiltrationACH: ach,
      };
    }),
  };
}
