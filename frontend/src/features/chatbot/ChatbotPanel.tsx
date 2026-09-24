"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  MessageSquare,
  X,
  Send,
  Sparkles,
  Bot,
  User,
  Settings as SettingsIcon,
  Trash2,
  Maximize2,
  Minimize2,
  Copy,
  Check,
  Volume2,
  VolumeX,
  Mic,
  MicOff,
  ShieldCheck,
  Key,
} from "lucide-react";
import { usePathname } from "next/navigation";
import { useShelterStore } from "@/lib/store/use-shelter-store";
import { useAIChat, ChatMessageItem } from "./use-ai-chat";
import { QUICK_SUGGESTIONS } from "./chatbot-knowledge";
import { ProjectContextTelemetry, PageContextInfo } from "./thermal-ai-engine";

// Animated AI Video Avatar from frontend/public/aichatbot.mp4
export function ChatbotVideoLogo({
  className = "size-8 rounded-full",
  indicatorClassName,
}: {
  className?: string;
  indicatorClassName?: string;
}) {
  return (
    <div
      className={`relative flex items-center justify-center overflow-hidden shrink-0 border border-border/80 bg-slate-950 shadow-xs ${className}`}
    >
      <video
        src="/aichatbot.mp4"
        autoPlay
        loop
        muted
        playsInline
        aria-hidden="true"
        className="size-full object-cover pointer-events-none select-none scale-105"
      />
      {indicatorClassName && <span className={indicatorClassName} />}
    </div>
  );
}

// Helper component to render markdown formatted message text
function MarkdownContent({ content }: { content: string }) {
  const [copiedCodeIdx, setCopiedCodeIdx] = useState<number | null>(null);

  const copyToClipboard = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedCodeIdx(idx);
    setTimeout(() => setCopiedCodeIdx(null), 2000);
  };

  const renderFormatted = useMemo(() => {
    const lines = content.split("\n");
    const elements: React.ReactNode[] = [];
    let inCodeBlock = false;
    let codeBuffer: string[] = [];
    let codeBlockIdx = 0;
    let inTable = false;
    let tableRows: string[][] = [];

    const flushTable = () => {
      if (tableRows.length === 0) return;
      const header = tableRows[0];
      const rows = tableRows.slice(1).filter((r) => !r.every((c) => c.match(/^[:\-\s]+$/)));

      elements.push(
        <div key={`table-${elements.length}`} className="my-3 overflow-x-auto rounded-xl border border-border bg-white shadow-sm">
          <table className="w-full text-left text-xs">
            <thead className="bg-secondary/40 text-foreground font-semibold border-b border-border">
              <tr>
                {header.map((col, ci) => (
                  <th key={ci} className="px-3 py-2 font-bold">
                    {col.trim()}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-foreground">
              {rows.map((row, ri) => (
                <tr key={ri} className="hover:bg-secondary/20 transition-colors">
                  {row.map((cell, ci) => (
                    <td key={ci} className="px-3 py-1.5 whitespace-nowrap">
                      {cell.trim()}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      tableRows = [];
      inTable = false;
    };

    lines.forEach((line, index) => {
      if (line.trim().startsWith("```")) {
        if (inCodeBlock) {
          const codeText = codeBuffer.join("\n");
          const curIdx = codeBlockIdx++;
          elements.push(
            <div key={`code-${index}`} className="my-2.5 rounded-xl border border-border bg-[#f8fafc] p-3 text-xs font-mono relative group text-slate-800 shadow-xs">
              <button
                type="button"
                onClick={() => copyToClipboard(codeText, curIdx)}
                className="absolute top-2.5 right-2.5 px-2 py-1 rounded bg-secondary hover:bg-secondary/80 text-foreground text-[10px] flex items-center gap-1 transition cursor-pointer border border-border"
              >
                {copiedCodeIdx === curIdx ? <Check className="size-3 text-emerald-600" /> : <Copy className="size-3" />}
                <span>{copiedCodeIdx === curIdx ? "Copied" : "Copy"}</span>
              </button>
              <pre className="overflow-x-auto text-emerald-700 pr-14">{codeText}</pre>
            </div>
          );
          codeBuffer = [];
          inCodeBlock = false;
        } else {
          flushTable();
          inCodeBlock = true;
        }
        return;
      }

      if (inCodeBlock) {
        codeBuffer.push(line);
        return;
      }

      if (line.trim().startsWith("|") && line.trim().endsWith("|")) {
        inTable = true;
        const cols = line
          .trim()
          .slice(1, -1)
          .split("|")
          .map((c) => c.trim());
        tableRows.push(cols);
        return;
      } else if (inTable) {
        flushTable();
      }

      if (line.startsWith("### ")) {
        elements.push(
          <h3 key={index} className="text-sm font-bold text-foreground mt-3 mb-1.5">
            {line.replace("### ", "")}
          </h3>
        );
        return;
      }
      if (line.startsWith("#### ")) {
        elements.push(
          <h4 key={index} className="text-xs font-bold text-foreground mt-2 mb-1">
            {line.replace("#### ", "")}
          </h4>
        );
        return;
      }

      if (line.trim() === "---") {
        elements.push(<hr key={index} className="my-2.5 border-border" />);
        return;
      }

      if (line.trim().startsWith("* ") || line.trim().startsWith("- ")) {
        const text = line.trim().substring(2);
        elements.push(
          <div key={index} className="flex items-start gap-2 my-1 pl-1 text-xs text-foreground leading-relaxed">
            <span className="size-1.5 rounded-full bg-black mt-1.5 shrink-0" />
            <span>{formatInline(text)}</span>
          </div>
        );
        return;
      }

      const numMatch = line.trim().match(/^(\d+)\.\s+(.*)/);
      if (numMatch) {
        elements.push(
          <div key={index} className="flex items-start gap-2 my-1 pl-1 text-xs text-foreground leading-relaxed">
            <span className="text-black font-bold shrink-0">{numMatch[1]}.</span>
            <span>{formatInline(numMatch[2])}</span>
          </div>
        );
        return;
      }

      if (line.trim().length > 0) {
        elements.push(
          <p key={index} className="text-xs text-foreground my-1 leading-relaxed">
            {formatInline(line)}
          </p>
        );
      }
    });

    if (inTable) flushTable();

    return elements;
  }, [content, copiedCodeIdx]);

  return <div className="space-y-1">{renderFormatted}</div>;
}

function formatInline(text: string): React.ReactNode {
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code key={i} className="px-1.5 py-0.5 rounded bg-secondary/50 text-foreground font-mono text-[11px] border border-border">
          {part.slice(1, -1)}
        </code>
      );
    }
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="text-foreground font-bold">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
}

export interface PageConfig {
  title: string;
  subtitle: string;
  isProjectPage: boolean;
  suggestedQueries: string[];
}

export function getPageConfig(
  pathname: string,
  projectName?: string,
  elevationM: number = 3500
): PageConfig {
  const normalized = pathname.toLowerCase().replace(/\/$/, "") || "/";
  const name = projectName || "Active Habitat";

  if (normalized === "") {
    return {
      title: "Platform Overview",
      subtitle: "Platform Mode · Habitat Engineering",
      isProjectPage: false,
      suggestedQueries: [
        "What is ThermoShelter and DRDO PS 26051 compliance?",
        "How does passive solar heating work in Ladakh & Siachen?",
        "Compare Rammed Earth vs Aerogel vs PIR insulation",
        "How do I start a shelter thermal simulation?",
      ],
    };
  }

  if (normalized.startsWith("/projects")) {
    return {
      title: "Shelter Catalog",
      subtitle: "Fleet Management · Tactical Shelters",
      isProjectPage: false,
      suggestedQueries: [
        "What standard military shelter templates are available?",
        "How do I clone or create a new Siachen habitat?",
        "Compare Ladakh Passive Solar Outpost vs Baseline Tin Shed",
        "What are the sizing guidelines for extreme altitude shelters?",
      ],
    };
  }

  if (normalized.startsWith("/weather")) {
    return {
      title: "Climate Intelligence",
      subtitle: "Meteorological & Solar Radiation Data",
      isProjectPage: false,
      suggestedQueries: [
        "What are the design winter temperatures for Leh & Siachen?",
        "How does solar irradiance at 3,500m ASL compare to sea level?",
        "Explain Heating Degree Days (HDD) for extreme cold regimes",
        "How does sub-zero air density affect infiltration heat loss?",
      ],
    };
  }

  if (normalized.startsWith("/materials")) {
    return {
      title: "Materials Library",
      subtitle: "Thermophysical & Insulation Database",
      isProjectPage: false,
      suggestedQueries: [
        "Which insulation material has the lowest conductivity for extreme cold?",
        "Compare Silica Aerogel vs PUF/PIR vs XPS boards",
        "What is the optimal thermal mass thickness for 8-10h lag?",
        "Calculate U-value for 150mm EPS + 200mm Rammed Earth",
      ],
    };
  }

  if (normalized.startsWith("/settings")) {
    return {
      title: "Platform Settings",
      subtitle: "Solver & Preference Configuration",
      isProjectPage: false,
      suggestedQueries: [
        "How do I configure Groq Llama 3.3 70B reasoning?",
        "Explain ASHRAE 55 Adaptive Comfort vs PMV Model",
        "How does the finite-difference solver calculate nocturnal heat loss?",
        "Switch between SI Metric and IP Imperial units",
      ],
    };
  }

  if (
    normalized.startsWith("/designer/3d") ||
    normalized.startsWith("/designer") ||
    normalized.startsWith("/ai-designer")
  ) {
    return {
      title: "3D Architecture & Envelope",
      subtitle: `${name} · ${elevationM}m ASL`,
      isProjectPage: true,
      suggestedQueries: [
        `What are the dimensions and solar orientation of ${name}?`,
        `Audit south-facing glazing area and Trombe wall placement`,
        `Check wall and roof layer thermal resistances (R-values)`,
        `How to optimize envelope for extreme sub-zero winds?`,
      ],
    };
  }

  if (normalized.startsWith("/simulations")) {
    return {
      title: "Simulation Engine",
      subtitle: `${name} · ${elevationM}m ASL`,
      isProjectPage: true,
      suggestedQueries: [
        `Diagnose the 24h indoor temperature profile for ${name}`,
        `What is the peak heating load during -25°C design night?`,
        `How does solar heat gain perform across the diurnal cycle?`,
        `How to increase thermal comfort above 90% without active fuel?`,
      ],
    };
  }

  if (normalized.startsWith("/results")) {
    return {
      title: "Thermal Results & Analytics",
      subtitle: `${name} · ${elevationM}m ASL`,
      isProjectPage: true,
      suggestedQueries: [
        `Summarize simulation findings for ${name}`,
        `Explain solar heat gain vs envelope transmission losses`,
        `What is the operative temperature band compliance?`,
        `Evaluate nocturnal heat retention with Trombe wall mass`,
      ],
    };
  }

  if (normalized.startsWith("/fuel-costs")) {
    return {
      title: "Bukhari Fuel & Economics",
      subtitle: `${name} · ${elevationM}m ASL`,
      isProjectPage: true,
      suggestedQueries: [
        `How many liters of Bukhari kerosene does ${name} save?`,
        `Calculate 10-year lifecycle savings vs standard tin shed`,
        `What is the logistics cost savings of reduced airlifts?`,
        `What is the carbon emission reduction for this habitat?`,
      ],
    };
  }

  if (normalized.startsWith("/comparison")) {
    return {
      title: "Multi-Model Benchmarking",
      subtitle: `${name} · ${elevationM}m ASL`,
      isProjectPage: true,
      suggestedQueries: [
        `Compare ${name} against the baseline tin shed`,
        `Which variant achieves higher comfort hours in peak winter?`,
        `What is the delta in heating demand between models?`,
        `Recommendation for DRDO deployment prioritization`,
      ],
    };
  }

  if (normalized.startsWith("/optimization")) {
    return {
      title: "AI Design Optimization",
      subtitle: `${name} · ${elevationM}m ASL`,
      isProjectPage: true,
      suggestedQueries: [
        `Run multi-objective optimization analysis for ${name}`,
        `What is the optimal insulation thickness vs weight trade-off?`,
        `Evaluate window-to-wall ratio (WWR) optimization`,
        `Recommend optimal Trombe wall thickness for 10-hour lag`,
      ],
    };
  }

  if (normalized.startsWith("/reports")) {
    return {
      title: "Compliance & Reports",
      subtitle: `${name} · ${elevationM}m ASL`,
      isProjectPage: true,
      suggestedQueries: [
        `Generate an executive summary for DRDO PS 26051 compliance`,
        `Audit envelope U-values against NBC 2016 and ECBC guidelines`,
        `What key metrics should be highlighted to Military Engineer Services (MES)?`,
        `Export verification checklist for cold-climate deployment`,
      ],
    };
  }

  if (normalized.startsWith("/dashboard")) {
    return {
      title: "Habitat Overview",
      subtitle: `${name} · ${elevationM}m ASL`,
      isProjectPage: true,
      suggestedQueries: [
        `Provide a complete thermal summary for ${name}`,
        `What is the annual heating demand and comfort compliance?`,
        `How much Bukhari kerosene does this shelter displace?`,
        `What are the top thermal vulnerabilities in this design?`,
      ],
    };
  }

  // Fallback for home or other unmapped pages
  return {
    title: "Platform Overview",
    subtitle: "Platform Mode · Habitat Engineering",
    isProjectPage: false,
    suggestedQueries: [
      "What is ThermoShelter and DRDO PS 26051 compliance?",
      "How does passive solar heating work in Ladakh & Siachen?",
      "Compare Rammed Earth vs Aerogel vs PIR insulation",
      "How do I start a shelter thermal simulation?",
    ],
  };
}

export function ChatbotPanel() {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [inputMessage, setInputMessage] = useState<string>("");
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);
  const [isListening, setIsListening] = useState<boolean>(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const pathname = usePathname() || "/";
  const { projects, activeProjectId, simulations, materials } = useShelterStore();

  const rawActiveProject = projects.find((p) => p.id === activeProjectId) || projects[0];
  const pageConfig = useMemo(
    () =>
      getPageConfig(
        pathname,
        rawActiveProject?.project?.name || rawActiveProject?.name,
        rawActiveProject?.location?.elevation ?? 3500
      ),
    [pathname, rawActiveProject]
  );

  // If we are on Home page ("/") or non-project catalog/reference pages, no active project is open!
  const hasActiveProject = pageConfig.isProjectPage && Boolean(rawActiveProject);
  const activeProject = hasActiveProject ? rawActiveProject : null;

  const latestSim = simulations.find(
    (s) => s.projectId === activeProject?.id && s.status === "completed" && s.results
  );

  const projectTelemetry: ProjectContextTelemetry = useMemo(() => {
    const pageContext: PageContextInfo = {
      pathname,
      pageTitle: pageConfig.title,
      pageDescription: pageConfig.subtitle,
      hasActiveProject,
    };

    if (!hasActiveProject || !activeProject) {
      return {
        hasActiveProject: false,
        pageContext,
        projectName: undefined,
        locationName: undefined,
      };
    }

    const geom = activeProject?.geometry;
    const length = geom?.length ?? 6;
    const width = geom?.width ?? 4;
    const height = geom?.height ?? 2.8;
    const floorArea = length * width;
    const volume = floorArea * height;
    const summary = latestSim?.results?.summary;

    const getMaterialName = (matId?: string) => {
      if (!matId || typeof matId !== "string") return "Insulation Layer";
      const found = materials.find((m) => m.id === matId);
      return found ? found.name : matId.replace(/^mat-/, "").replace(/-/g, " ");
    };

    const wallLayers = (activeProject?.envelope?.walls?.south?.layers || []).map(
      (l) => `${Math.round((l?.thickness ?? 0.1) * 1000)}mm ${l?.name || getMaterialName(l?.materialId)}`
    );
    const roofLayers = (activeProject?.envelope?.roof?.layers || []).map(
      (l) => `${Math.round((l?.thickness ?? 0.15) * 1000)}mm ${l?.name || getMaterialName(l?.materialId)}`
    );
    const windows = activeProject?.windows || activeProject?.openings?.windows || [];
    const totalWindowArea = windows.reduce((sum, w) => sum + ((w?.width ?? 0) * (w?.height ?? 0)), 0);
    const hasTrombe =
      Boolean((activeProject as any)?.passiveSystems?.trombeWall?.enabled) ||
      (activeProject?.thermalMass || []).some(
        (tm) => tm?.id?.toLowerCase().includes("trombe") || tm?.name?.toLowerCase().includes("trombe")
      ) ||
      (activeProject?.project?.tags || []).some((t) => typeof t === "string" && t.toLowerCase().includes("trombe"));

    const firstWindow = windows[0];
    const glazingType = firstWindow?.glazingType
      ? String(firstWindow.glazingType).replace(/_/g, " ")
      : "Triple Low-E Argon";

    return {
      hasActiveProject: true,
      pageContext,
      projectName: activeProject?.project?.name || activeProject?.name || "Ladakh Passive Solar Outpost",
      locationName: activeProject?.location?.region || "Leh, Ladakh, India",
      elevationM: activeProject?.location?.elevation ?? 3500,
      winterMinC: activeProject?.location?.designTempWinter ?? -20,
      summerMaxC: activeProject?.location?.designTempSummer ?? 28,
      dimensions: {
        length,
        width,
        height,
        floorAreaM2: floorArea,
        volumeM3: volume,
      },
      envelopeSummary: {
        wallLayers: wallLayers.length > 0 ? wallLayers : ["150mm EPS Insulation", "200mm Stabilized Rammed Earth"],
        roofLayers: roofLayers.length > 0 ? roofLayers : ["150mm Rockwool Insulated Deck"],
        windowAreaM2: totalWindowArea > 0 ? Number(totalWindowArea.toFixed(2)) : 3.6,
        glazingType,
        orientationDeg: activeProject?.geometry?.orientation ?? 0,
        hasTrombeWall: hasTrombe,
      },
      simulationResults: summary
        ? {
          comfortHoursPct: summary.comfortHoursPct,
          indoorMinC: summary.indoorMinC,
          indoorMaxC: summary.indoorMaxC,
          indoorMeanC: summary.indoorMeanC,
          outdoorMinC: summary.outdoorMinC,
          outdoorMaxC: summary.outdoorMaxC,
          heatingDemandKwhM2: summary.heatingDemandKwhM2,
          peakEnvelopeLossW: summary.peakEnvelopeLossW,
          totalSolarGainKwh: summary.totalSolarGainKwh,
          fuelDisplacementLiters: Math.round(
            Math.max(1200, (4800 - summary.heatingDemandKwhM2 * floorArea) / 9.5)
          ),
        }
        : undefined,
    };
  }, [hasActiveProject, activeProject, latestSim, materials, pathname, pageConfig]);

  const {
    messages,
    isLoading,
    apiKey,
    setApiKey,
    sendMessage,
    clearChat,
    activeEngine,
    isLiveLLM,
  } = useAIChat(projectTelemetry);

  const [tempApiKey, setTempApiKey] = useState<string>(apiKey || "");

  useEffect(() => {
    setTempApiKey(apiKey || "");
  }, [apiKey]);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen, isLoading]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  const handleSend = () => {
    if (!inputMessage.trim() || isLoading) return;
    sendMessage(inputMessage);
    setInputMessage("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleCopyMessage = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMsgId(id);
    setTimeout(() => setCopiedMsgId(null), 2000);
  };

  const handleToggleSpeak = (text: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    const cleanText = text
      .replace(/[*_#`$|]/g, " ")
      .replace(/\n+/g, ". ");

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.05;
    utterance.pitch = 1.0;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
    setIsSpeaking(true);
  };

  const handleToggleDictation = () => {
    if (typeof window === "undefined") return;
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser.");
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;

    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInputMessage((prev) => (prev ? `${prev} ${transcript}` : transcript));
      setIsListening(false);
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);

    recognition.start();
  };

  return (
    <>
      {/* Floating Action Button (FAB) - Anchored strictly to bottom-right with Animated Aurora & "Ask AI" Label */}
      {!isOpen && (
        <div
          style={{ position: "fixed", right: "20px", bottom: "20px", left: "auto", top: "auto", zIndex: 9999 }}
          className="flex items-center gap-2 select-none pointer-events-auto"
        >
          {/* Desktop "Ask AI" floating pill */}
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-card/95 backdrop-blur-md border border-border shadow-md text-xs font-semibold text-foreground hover:bg-secondary transition-all cursor-pointer group hover:border-sky-400/40"
          >
            <Sparkles className="size-3 text-amber-500 animate-pulse" />
            <span>Ask AI</span>
          </button>

          {/* Main Orb Button with Animated Aurora Halo */}
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="relative group size-14 sm:size-16 rounded-full flex items-center justify-center cursor-pointer transition-transform duration-300 hover:scale-105 active:scale-95 shrink-0 shadow-lg"
            title="Open ThermoShelter AI Engineer"
            aria-label="Open ThermoShelter AI Engineer"
          >
            {/* Animated Aurora Bloom (Breathes gently behind the orb) */}
            <div
              aria-hidden="true"
              className="absolute -inset-1.5 rounded-full chatbot-aurora-bloom pointer-events-none"
            />

            {/* Animated Aurora Conic Ring (Rotates smoothly) */}
            <div
              aria-hidden="true"
              className="absolute -inset-0.5 rounded-full chatbot-aurora-spin pointer-events-none"
            />

            {/* Inner Video Container (Round avatar - Edge-to-Edge, completely borderless and seamless) */}
            <div className="relative size-full rounded-full overflow-hidden shadow-md">
              <video
                src="/aichatbot.mp4"
                autoPlay
                loop
                muted
                playsInline
                aria-hidden="true"
                className="size-full object-cover pointer-events-none select-none scale-105"
              />
            </div>

            {/* Mobile "Ask AI" Badge */}
            <span className="sm:hidden absolute -top-1 -left-1 px-1.5 py-0.5 rounded-full bg-card/95 text-foreground text-[9px] font-bold shadow-md border border-border flex items-center gap-0.5 z-10 backdrop-blur-xs">
              <Sparkles className="size-2.5 text-amber-500" />
              AI
            </span>
          </button>
        </div>
      )}

      {/* Main Chatbot Floating Window - Minimized, clean & anchored to bottom-right */}
      {isOpen && (
        <div
          style={{ position: "fixed", right: "20px", bottom: "20px", left: "auto", top: "auto", zIndex: 9999 }}
          className={`fixed z-[9999] flex flex-col rounded-3xl bg-card border border-border shadow-2xl overflow-hidden transition-all duration-300 ease-out text-foreground ${isExpanded
            ? "w-[94vw] sm:w-[500px] h-[580px] max-h-[82vh]"
            : "w-[90vw] sm:w-[350px] h-[480px] max-h-[75vh]"
            }`}
        >
          {/* Header - Clean Light Project Theme (No green dot) */}
          <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-border bg-card text-foreground">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="relative size-8 sm:size-9 rounded-full overflow-hidden shrink-0 shadow-sm ring-1.5 ring-sky-400/30">
                <video
                  src="/aichatbot.mp4"
                  autoPlay
                  loop
                  muted
                  playsInline
                  aria-hidden="true"
                  className="size-full object-cover pointer-events-none select-none scale-105"
                />
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h3 className="text-xs sm:text-sm font-bold text-foreground tracking-tight truncate">
                    ThermoShelter AI
                  </h3>
                  <span className="text-[8.5px] px-1.5 py-0.2 rounded-full font-mono font-medium shrink-0 bg-secondary text-muted-foreground border border-border/80">
                    DRDO PS 26051
                  </span>
                </div>
                <p className="text-[9.5px] text-muted-foreground truncate">
                  {hasActiveProject && projectTelemetry.projectName
                    ? `${projectTelemetry.projectName} · ${projectTelemetry.elevationM}m ASL`
                    : pageConfig.subtitle}
                </p>
              </div>
            </div>

            {/* Action Icons */}
            <div className="flex items-center gap-1 shrink-0 text-muted-foreground">
              <button
                type="button"
                onClick={() => setShowSettings(!showSettings)}
                className={`p-1.5 rounded-lg hover:text-foreground hover:bg-secondary transition cursor-pointer ${showSettings ? "text-foreground bg-secondary" : ""
                  }`}
                title="Model & API Key Settings"
              >
                <SettingsIcon className="size-3.5" />
              </button>

              <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-1.5 rounded-lg hover:text-foreground hover:bg-secondary transition cursor-pointer hidden sm:block"
                title={isExpanded ? "Collapse width" : "Expand width"}
              >
                {isExpanded ? <Minimize2 className="size-3.5" /> : <Maximize2 className="size-3.5" />}
              </button>

              <button
                type="button"
                onClick={clearChat}
                className="p-1.5 rounded-lg hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                title="Clear conversation"
              >
                <Trash2 className="size-3.5" />
              </button>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg hover:text-foreground hover:bg-secondary transition cursor-pointer"
                title="Close chat"
              >
                <X className="size-4" />
              </button>
            </div>
          </div>

          {/* Real-time Project Telemetry Strip - Only rendered when an active project is open on a workspace page */}
          {hasActiveProject && projectTelemetry.projectName && (
            <div className="px-3.5 py-1.5 bg-slate-900 text-white text-[10.5px] border-b border-border/40 flex items-center justify-between gap-2 shadow-xs shrink-0 select-none">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="relative flex h-2 w-2 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-500" />
                </span>
                <span className="text-[9.5px] font-mono uppercase tracking-wider text-sky-400 font-bold shrink-0">
                  Live:
                </span>
                <span className="font-semibold text-slate-100 truncate" title={projectTelemetry.projectName}>
                  {projectTelemetry.projectName}
                </span>
              </div>
              <div className="flex items-center gap-1 text-[10px] font-mono text-slate-300 shrink-0">
                <span className="hidden sm:inline">{(projectTelemetry.locationName || "").split(",")[0] || "Leh"} · </span>
                <span>{(projectTelemetry.dimensions?.length ?? 6)}×{(projectTelemetry.dimensions?.width ?? 4)}m</span>
                {projectTelemetry.simulationResults?.comfortHoursPct !== undefined ? (
                  <span className="text-emerald-400 font-bold bg-emerald-500/15 px-1.5 py-0.5 rounded border border-emerald-500/30 text-[9.5px]">
                    {projectTelemetry.simulationResults.comfortHoursPct}% Comfort
                  </span>
                ) : (
                  <span className="text-sky-400 bg-sky-500/10 px-1.5 py-0.5 rounded border border-sky-500/20 text-[9.5px]">
                    {(projectTelemetry.dimensions?.floorAreaM2 ?? 24)}m²
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Collapsible Settings Drawer */}
          {showSettings && (
            <div className="p-3 bg-secondary/30 border-b border-border text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-foreground flex items-center gap-1.5 text-[11px]">
                  <Key className="size-3.5" />
                  Groq or Gemini API Configuration
                </span>
                <span className="text-[10px] text-muted-foreground">Optional</span>
              </div>
              <p className="text-[10.5px] text-[#536772] leading-relaxed">
                Paste your <strong>Groq API key</strong> (<code className="font-mono text-black">gsk_...</code>) for ultra-fast Llama 3.3 70B reasoning. If empty, the built-in <strong>ThermoShelter High-Altitude Thermal Engineering AI Core</strong> operates at 100% capacity!
              </p>
              <div className="flex gap-2">
                <input
                  type="password"
                  placeholder="gsk_... or AIzaSy..."
                  value={tempApiKey}
                  onChange={(e) => setTempApiKey(e.target.value)}
                  className="flex-1 px-3 py-1.5 rounded-full bg-white border border-border text-foreground text-xs font-mono focus:outline-none focus:ring-1 focus:ring-black"
                />
                <button
                  type="button"
                  onClick={() => {
                    setApiKey(tempApiKey);
                    setShowSettings(false);
                  }}
                  className="px-3.5 py-1.5 rounded-full bg-black hover:bg-[#6E818F] text-white font-semibold text-xs transition cursor-pointer"
                >
                  Save
                </button>
              </div>
            </div>
          )}

          {/* Messages Scroll Area */}
          <div className="flex-1 overflow-y-auto p-3.5 space-y-3.5 bg-background">
            {messages.length <= 1 && (
              <div className="pt-1 pb-1 space-y-2">
                <p className="text-[11px] font-semibold text-muted-foreground px-1">
                  {hasActiveProject && projectTelemetry.projectName
                    ? `Suggested inquiries for ${projectTelemetry.projectName}:`
                    : `Suggested topics for ${pageConfig.title}:`}
                </p>
                <div className="flex flex-col gap-1.5">
                  {pageConfig.suggestedQueries.map((item, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => sendMessage(item)}
                      disabled={isLoading}
                      className="text-left px-3 py-2 rounded-xl bg-secondary/40 hover:bg-secondary border border-border/60 text-xs text-foreground transition cursor-pointer hover:border-foreground/20 leading-relaxed"
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg) => {
              const isUser = msg.role === "user";
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}
                >
                  <div className="flex items-start gap-2 max-w-[90%]">
                    {!isUser && (
                      <div className="size-6 sm:size-7 rounded-full overflow-hidden shrink-0 mt-0.5 shadow-xs ring-1 ring-sky-400/25">
                        <video
                          src="/aichatbot.mp4"
                          autoPlay
                          loop
                          muted
                          playsInline
                          aria-hidden="true"
                          className="size-full object-cover pointer-events-none select-none scale-105"
                        />
                      </div>
                    )}
                    <div
                      className={`rounded-2xl px-3 py-2 text-xs leading-relaxed shadow-xs ${isUser
                        ? "bg-foreground text-background font-medium rounded-tr-xs"
                        : "bg-secondary/40 border border-border text-foreground rounded-tl-xs flex-1"
                        }`}
                    >
                      {isUser ? (
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                      ) : (
                        <MarkdownContent content={msg.content} />
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mt-1 px-1 text-[9px] text-[#6E818F]">
                    <span>{msg.timestamp}</span>
                    {!isUser && (
                      <>
                        <span>·</span>
                        <span className="font-mono text-foreground font-semibold">
                          {msg.engine || "thermoshelter-core"}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopyMessage(msg.content, msg.id)}
                          className="hover:text-foreground transition cursor-pointer ml-1"
                          title="Copy message"
                        >
                          {copiedMsgId === msg.id ? (
                            <Check className="size-3 text-emerald-600" />
                          ) : (
                            <Copy className="size-3" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleSpeak(msg.content)}
                          className="hover:text-foreground transition cursor-pointer"
                          title="Read aloud"
                        >
                          {isSpeaking ? (
                            <VolumeX className="size-3 text-amber-600" />
                          ) : (
                            <Volume2 className="size-3" />
                          )}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}

            {isLoading && (
              <div className="flex items-start gap-2">
                <div className="size-6 sm:size-7 rounded-full overflow-hidden shrink-0 mt-0.5 shadow-xs ring-1 ring-sky-400/25">
                  <video
                    src="/aichatbot.mp4"
                    autoPlay
                    loop
                    muted
                    playsInline
                    aria-hidden="true"
                    className="size-full object-cover pointer-events-none select-none scale-105"
                  />
                </div>
                <div className="p-2 rounded-2xl bg-secondary/35 border border-border text-xs text-muted-foreground flex items-center gap-2">
                  <div className="flex gap-1">
                    <span className="size-1.5 rounded-full bg-foreground animate-bounce" />
                    <span className="size-1.5 rounded-full bg-foreground animate-bounce [animation-delay:0.2s]" />
                    <span className="size-1.5 rounded-full bg-foreground animate-bounce [animation-delay:0.4s]" />
                  </div>
                  <span className="text-[10.5px] font-medium text-foreground">
                    Evaluating thermal thermodynamics & envelope resistance...
                  </span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Box Footer - Minimal, clean, no clutter */}
          <div className="p-2 sm:p-2.5 border-t border-border bg-card/80 backdrop-blur-xs">
            <div className="flex items-center gap-1.5 rounded-full border border-border bg-background px-2.5 py-1 focus-within:border-foreground transition shadow-2xs">
              <button
                type="button"
                onClick={handleToggleDictation}
                className={`p-1.5 rounded-full transition cursor-pointer shrink-0 ${isListening
                  ? "bg-rose-500 text-white animate-pulse"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                  }`}
                title={isListening ? "Stop recording" : "Voice dictation"}
              >
                {isListening ? <MicOff className="size-3.5" /> : <Mic className="size-3.5" />}
              </button>

              <textarea
                ref={inputRef}
                rows={1}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask ThermoShelter AI..."
                className="flex-1 bg-transparent px-1 py-1 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none resize-none max-h-24 font-sans leading-relaxed"
              />

              <button
                type="button"
                onClick={handleSend}
                disabled={!inputMessage.trim() || isLoading}
                className="p-1.5 rounded-full bg-foreground text-background disabled:opacity-30 transition cursor-pointer shrink-0 hover:opacity-90"
                title="Send message (Enter)"
              >
                <Send className="size-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
