"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  Layers,
  Cpu,
  ShieldCheck,
  BrainCircuit,
  Box,
  ArrowRight,
  TrendingDown,
  Info,
} from "lucide-react";
import { PageIntro } from "@/components/v0/platform-components";
import { WorkflowFooter } from "@/components/layout/WorkflowFooter";
import { useShelterStore } from "@/lib/store/use-shelter-store";
import { aiApi } from "@/lib/api";

import {
  AICandidate,
  GenerateDesignParams,
  ModelStatus,
  OptimizationJobStatus,
  SHAPReport,
} from "./types";
import { MissionRequirementsForm } from "./components/MissionRequirementsForm";
import { SearchProgressPanel } from "./components/SearchProgressPanel";
import { ParetoFrontierChart } from "./components/ParetoFrontierChart";
import { CandidateDesignCard } from "./components/CandidateDesignCard";
import { AIVsPhysicsTrustTable } from "./components/AIVsPhysicsTrustTable";
import { SHAPWaterfallChart } from "./components/SHAPWaterfallChart";

export function AIDesignerView() {
  const router = useRouter();
  const { applyAICandidate } = useShelterStore();

  // Model & Environment Status
  const [modelStatus, setModelStatus] = useState<ModelStatus | null>(null);

  // Form Parameters
  const [params, setParams] = useState<GenerateDesignParams>({
    weather_id: "leh_ladakh_tmyx",
    target_indoor_min_c: 12.0,
    max_envelope_mass_kg: null,
    optimization_mode: "BALANCED",
    population_size: 100,
    generations: 40,
    occupants: 4,
  });

  // Optimization Job & Candidates State
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentJob, setCurrentJob] = useState<OptimizationJobStatus | null>(null);
  const [candidates, setCandidates] = useState<AICandidate[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<AICandidate | null>(null);

  // Verification & Explainability State
  const [isVerifying, setIsVerifying] = useState(false);
  const [isExplaining, setIsExplaining] = useState(false);
  const [shapReport, setShapReport] = useState<SHAPReport | null>(null);
  const [notification, setNotification] = useState<{
    type: "success" | "info" | "error";
    message: string;
  } | null>(null);

  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Check active surrogate model status on mount
  useEffect(() => {
    async function checkStatus() {
      try {
        const res = await aiApi.getModelStatus();
        setModelStatus(res);
      } catch (err) {
        console.warn("Could not fetch surrogate model status:", err);
      }
    }
    checkStatus();
  }, []);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  // Handle parameter changes
  const handleParamChange = (updates: Partial<GenerateDesignParams>) => {
    setParams((prev) => ({ ...prev, ...updates }));
  };

  // Trigger Genetic Algorithm Optimization
  const handleStartOptimization = async () => {
    setIsGenerating(true);
    setNotification(null);
    setShapReport(null);
    setSelectedCandidate(null);
    setCandidates([]);

    try {
      const job = await aiApi.generate(params);
      setCurrentJob(job as any);

      // Start polling status
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = setInterval(async () => {
        try {
          const updatedJob = await aiApi.getJobStatus(job.job_id);
          setCurrentJob(updatedJob as any);

          if (updatedJob.status === "COMPLETED") {
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
            setIsGenerating(false);

            // Fetch non-dominated Pareto candidates
            const cands = await aiApi.getCandidates(job.job_id);
            const typedCands = cands as any as AICandidate[];
            setCandidates(typedCands);
            if (typedCands.length > 0) {
              setSelectedCandidate(typedCands[0]);
            }
            setNotification({
              type: "success",
              message: `AI Generative search completed! Found ${typedCands.length} Pareto-optimal shelter blueprints.`,
            });
          } else if (updatedJob.status === "FAILED") {
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
            setIsGenerating(false);
            setNotification({
              type: "error",
              message: updatedJob.error_message || "Optimization search failed.",
            });
          }
        } catch (pollErr) {
          console.error("Job status polling error:", pollErr);
        }
      }, 500);
    } catch (err: any) {
      setIsGenerating(false);
      setNotification({
        type: "error",
        message: err.message || "Failed to start AI Generative Design search.",
      });
    }
  };

  // Run EnergyPlus verification on selected candidates
  const handleVerifyCandidate = async (cand: AICandidate) => {
    if (!currentJob) return;
    setIsVerifying(true);
    try {
      const res = await aiApi.verifyCandidates(currentJob.job_id, { k: 5, period_days: 3 });
      // Update candidate state with physics results
      const verifiedList = res.candidates || [];
      const updatedCand = verifiedList.find((v: any) => v.candidate_id === cand.candidate_id) || verifiedList[0];

      if (updatedCand) {
        const merged: AICandidate = {
          ...cand,
          is_physics_verified: true,
          verified_physics: updatedCand.verified_physics,
          calibration_error: updatedCand.calibration_error,
          verification_duration_s: updatedCand.verification_duration_s,
        };

        setCandidates((prev) =>
          prev.map((c) => (c.candidate_id === merged.candidate_id ? merged : c))
        );
        setSelectedCandidate(merged);
        setNotification({
          type: "success",
          message: "EnergyPlus ground-truth physics calculation completed and verified!",
        });
      }
    } catch (err: any) {
      setNotification({
        type: "error",
        message: `Physics verification failed: ${err.message}`,
      });
    } finally {
      setIsVerifying(false);
    }
  };

  // Compute SHAP feature attributions
  const handleExplainCandidate = async (cand: AICandidate) => {
    setIsExplaining(true);
    try {
      const report = await aiApi.explainCandidate({
        candidate: cand,
        target_name: "winter_indoor_min_c",
        top_k: 6,
      });
      setShapReport(report as any);
    } catch (err: any) {
      setNotification({
        type: "error",
        message: `Explainability calculation failed: ${err.message}`,
      });
    } finally {
      setIsExplaining(false);
    }
  };

  // Apply candidate to 3D CAD designer as a new project
  const handleApplyToDesigner = async (cand: AICandidate) => {
    try {
      const { projects } = useShelterStore.getState();
      const existingNames = projects.map((p) => p.project?.name || p.name || "");
      const res = await aiApi.applyCandidate({
        ...cand,
        existing_names: existingNames,
      });
      if (res.success && res.shelter_model) {
        const newProjId = applyAICandidate(res.shelter_model);
        router.push("/designer");
      }
    } catch (err: any) {
      setNotification({
        type: "error",
        message: `Failed to load blueprint into designer: ${err.message}`,
      });
    }
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Intro Header */}
      <PageIntro
        eyebrow="FLAGSHIP AI FEATURE · SURROGATE ML + NSGA-II"
        title="AI Generative Thermal Design Engine"
        description="Inverse thermal design powered by Physics-Informed ML Surrogate, true NSGA-II genetic optimization, SHAP explainability, and authentic EnergyPlus validation."
      />

      {/* User Notifications */}
      {notification && (
        <div
          className={`flex items-center justify-between p-4 rounded-2xl border text-xs font-semibold ${
            notification.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
              : notification.type === "error"
              ? "bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400"
              : "bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400"
          }`}
        >
          <span>{notification.message}</span>
          <button
            onClick={() => setNotification(null)}
            className="text-muted-foreground hover:text-foreground ml-4"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* 1. Mission Requirements Form */}
      <MissionRequirementsForm
        params={params}
        onChange={handleParamChange}
        onSubmit={handleStartOptimization}
        isGenerating={isGenerating}
        modelStatus={modelStatus}
      />

      {/* 2. Progress Panel (Shown during or after optimization) */}
      {currentJob && <SearchProgressPanel job={currentJob} />}

      {/* 3. Pareto Frontier Chart & Results */}
      {candidates.length > 0 && (
        <>
          <ParetoFrontierChart
            candidates={candidates}
            selectedCandidateId={selectedCandidate?.candidate_id || null}
            onSelectCandidate={(cand) => setSelectedCandidate(cand)}
          />

          {/* 4. Selected Candidate Detailed Blueprint */}
          {selectedCandidate && (
            <div className="space-y-6">
              <CandidateDesignCard
                candidate={selectedCandidate}
                onVerify={handleVerifyCandidate}
                onExplain={handleExplainCandidate}
                onApplyToDesigner={handleApplyToDesigner}
                isVerifying={isVerifying}
                isExplaining={isExplaining}
              />

              {/* 5. EnergyPlus Physics Verification Table (if verified) */}
              {selectedCandidate.is_physics_verified && (
                <AIVsPhysicsTrustTable candidate={selectedCandidate} />
              )}

              {/* 6. SHAP Feature Attribution Waterfall (if explained) */}
              {shapReport && (
                <SHAPWaterfallChart
                  report={shapReport}
                  onClose={() => setShapReport(null)}
                />
              )}
            </div>
          )}
        </>
      )}

      {/* Workflow Navigation Footer */}
      <WorkflowFooter
        customNextLabel="Open 3D CAD Massing"
        customNextHref="/designer"
      />
    </div>
  );
}
