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
import { useShelterStore } from "@/lib/store/use-shelter-store";
import { useAIChat, ChatMessageItem } from "./use-ai-chat";
import { QUICK_SUGGESTIONS } from "./chatbot-knowledge";
import { ProjectContextTelemetry } from "./thermal-ai-engine";

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

  const { projects, activeProjectId, simulations, materials } = useShelterStore();
  const activeProject = projects.find((p) => p.id === activeProjectId) || projects[0];

  const latestSim = simulations.find(
    (s) => s.projectId === activeProject?.id && s.status === "completed" && s.results
  );

  const projectTelemetry: ProjectContextTelemetry = useMemo(() => {
    const geom = activeProject?.geometry;
    const length = geom?.length ?? 6;
    const width = geom?.width ?? 4;
    const height = geom?.height ?? 2.8;
    const floorArea = length * width;
    const volume = floorArea * height;
    const summary = latestSim?.results?.summary;

    const getMaterialName = (matId: string) => {
      const found = materials.find((m) => m.id === matId);
      return found ? found.name : matId.replace(/^mat-/, "").replace(/-/g, " ");
    };

    const wallLayers = (activeProject?.envelope?.walls?.south?.layers || []).map(
      (l) => `${Math.round(l.thickness * 1000)}mm ${l.name || getMaterialName(l.materialId)}`
    );
    const roofLayers = (activeProject?.envelope?.roof?.layers || []).map(
      (l) => `${Math.round(l.thickness * 1000)}mm ${l.name || getMaterialName(l.materialId)}`
    );
    const windows = activeProject?.windows || activeProject?.openings?.windows || [];
    const totalWindowArea = windows.reduce((sum, w) => sum + (w.width * w.height), 0);
    const hasTrombe =
      Boolean((activeProject as any)?.passiveSystems?.trombeWall?.enabled) ||
      (activeProject?.thermalMass || []).some(
        (tm) => tm.id.toLowerCase().includes("trombe") || tm.name.toLowerCase().includes("trombe")
      ) ||
      (activeProject?.project?.tags || []).some((t) => t.toLowerCase().includes("trombe"));

    const firstWindow = windows[0];
    const glazingType = firstWindow?.glazingType
      ? firstWindow.glazingType.replace(/_/g, " ")
      : "Triple Low-E Argon";

    return {
      projectName: activeProject?.project?.name || "Ladakh Passive Solar Outpost",
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
  }, [activeProject, latestSim, materials]);

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
      {/* Floating Action Button (FAB) - Aligned with ActionButton tone="secondary" */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-[200] group inline-flex items-center gap-2.5 rounded-full bg-white text-foreground px-5 py-3 text-xs font-semibold shadow-xl transition-all duration-300 border border-border hover:bg-[#CBDCE6] hover:scale-105 active:scale-95 cursor-pointer"
          title="Open ThermoShelter AI Engineer"
        >
          <div className="relative flex items-center justify-center">
            <Bot className="size-4 text-foreground group-hover:rotate-12 transition-transform" />
            <span className="absolute -top-1 -right-1 size-2 rounded-full bg-emerald-500 animate-ping" />
          </div>
          <span className="tracking-tight font-semibold">ThermoShelter AI</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-foreground font-mono border border-border">
            DRDO PS 26051
          </span>
        </button>
      )}

      {/* Main Chatbot Floating Window */}
      {isOpen && (
        <div
          className={`fixed bottom-6 right-6 z-[200] flex flex-col rounded-[2rem] bg-card border border-border shadow-2xl overflow-hidden transition-all duration-300 ease-out text-foreground ${
            isExpanded
              ? "w-[94vw] sm:w-[620px] h-[86vh] max-h-[760px]"
              : "w-[92vw] sm:w-[420px] h-[80vh] max-h-[620px]"
          }`}
        >
          {/* Header - Clean Light Project Theme */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-card text-foreground">
            <div className="flex items-center gap-3 min-w-0">
              <div className="relative p-2 rounded-2xl bg-secondary text-foreground shrink-0 border border-border">
                <Bot className="size-4" />
                <span
                  className={`absolute -bottom-0.5 -right-0.5 size-2 rounded-full ring-1 ring-white ${
                    activeEngine.toLowerCase().includes("groq")
                      ? "bg-amber-500 animate-pulse"
                      : isLiveLLM
                      ? "bg-cyan-500 animate-pulse"
                      : "bg-emerald-500"
                  }`}
                  title={
                    activeEngine.toLowerCase().includes("groq")
                      ? "Groq (Llama 3.3 70B) Connected"
                      : isLiveLLM
                      ? "Gemini 1.5 Flash Connected"
                      : "ThermoShelter Core Intelligence"
                  }
                />
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-foreground tracking-tight truncate">
                    ThermoShelter AI Engineer
                  </h3>
                  <span className="text-[9px] px-2 py-0.5 rounded-full font-mono font-semibold shrink-0 bg-secondary text-foreground border border-border">
                    {activeEngine.toLowerCase().includes("groq")
                      ? "⚡ Groq (Llama 3.3)"
                      : isLiveLLM
                      ? "Gemini 1.5"
                      : "Core Engine"}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                  {projectTelemetry.projectName} · {projectTelemetry.elevationM}m ASL
                </p>
              </div>
            </div>

            {/* Action Icons */}
            <div className="flex items-center gap-1 shrink-0 text-muted-foreground">
              <button
                type="button"
                onClick={() => setShowSettings(!showSettings)}
                className={`p-1.5 rounded-lg hover:text-foreground hover:bg-secondary transition cursor-pointer ${
                  showSettings ? "text-foreground bg-secondary" : ""
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

          {/* Collapsible Settings Drawer */}
          {showSettings && (
            <div className="p-4 bg-secondary/30 border-b border-border text-xs space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-foreground flex items-center gap-1.5">
                  <Key className="size-3.5" />
                  Groq or Gemini API Configuration
                </span>
                <span className="text-[10px] text-muted-foreground">Optional</span>
              </div>
              <p className="text-[11px] text-[#536772] leading-relaxed">
                Paste your <strong>Groq API key</strong> (<code className="font-mono text-black">gsk_...</code>) for ultra-fast Llama 3.3 70B reasoning (or Google Gemini key). If left empty, the built-in <strong>ThermoShelter High-Altitude Thermal Engineering AI Core</strong> operates at 100% capacity!
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
                  className="px-4 py-1.5 rounded-full bg-black hover:bg-[#6E818F] text-white font-semibold text-xs transition cursor-pointer"
                >
                  Save Key
                </button>
              </div>
            </div>
          )}

          {/* Project Telemetry Context Banner */}
          <div className="px-4 py-2 bg-secondary/30 border-b border-border flex items-center justify-between text-[11px] text-[#536772]">
            <span className="flex items-center gap-1.5 truncate">
              <ShieldCheck className="size-3.5 text-black" />
              <span>Project: <strong className="text-foreground">{projectTelemetry.projectName}</strong></span>
            </span>
            <span className="font-mono font-semibold text-black shrink-0">
              {projectTelemetry.simulationResults?.comfortHoursPct !== undefined
                ? `${projectTelemetry.simulationResults.comfortHoursPct}% Comfort`
                : "Active"}
            </span>
          </div>

          {/* Quick Suggestions Chips */}
          <div className="px-4 py-2.5 border-b border-border overflow-x-auto flex gap-2 scrollbar-none bg-card">
            {QUICK_SUGGESTIONS.map((item, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => sendMessage(item)}
                disabled={isLoading}
                className="px-3.5 py-1.5 rounded-full bg-secondary/50 hover:bg-black hover:text-white border border-border text-[11px] font-semibold text-foreground whitespace-nowrap transition cursor-pointer shrink-0 disabled:opacity-50"
              >
                {item}
              </button>
            ))}
          </div>

          {/* Messages Scroll Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-background">
            {messages.map((msg) => {
              const isUser = msg.role === "user";
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}
                >
                  <div
                    className={`max-w-[88%] rounded-2xl px-4 py-3 text-xs leading-relaxed shadow-sm ${
                      isUser
                        ? "bg-black text-white font-medium rounded-tr-sm"
                        : "bg-secondary/35 border border-border text-foreground rounded-tl-sm"
                    }`}
                  >
                    {isUser ? (
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    ) : (
                      <MarkdownContent content={msg.content} />
                    )}
                  </div>

                  <div className="flex items-center gap-2 mt-1 px-1 text-[9px] text-[#6E818F]">
                    <span>{msg.timestamp}</span>
                    {!isUser && (
                      <>
                        <span>·</span>
                        <span className="font-mono text-black font-semibold">
                          {msg.engine || "thermoshelter-core"}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopyMessage(msg.content, msg.id)}
                          className="hover:text-black transition cursor-pointer ml-1"
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
                          className="hover:text-black transition cursor-pointer"
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
                <div className="p-2 rounded-full bg-secondary text-black shrink-0">
                  <Bot className="size-3.5" />
                </div>
                <div className="p-3 rounded-2xl bg-secondary/35 border border-border text-xs text-muted-foreground flex items-center gap-2">
                  <div className="flex gap-1">
                    <span className="size-1.5 rounded-full bg-black animate-bounce" />
                    <span className="size-1.5 rounded-full bg-black animate-bounce [animation-delay:0.2s]" />
                    <span className="size-1.5 rounded-full bg-black animate-bounce [animation-delay:0.4s]" />
                  </div>
                  <span className="text-[11px] font-medium text-foreground">
                    Evaluating thermal thermodynamics & envelope resistance...
                  </span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Box Footer */}
          <div className="p-3.5 border-t border-border bg-card">
            <div className="flex items-center gap-2 rounded-full border border-border bg-white px-3 py-1.5 focus-within:border-black transition">
              <button
                type="button"
                onClick={handleToggleDictation}
                className={`p-2 rounded-full transition cursor-pointer shrink-0 ${
                  isListening
                    ? "bg-rose-500 text-white animate-pulse"
                    : "text-[#6E818F] hover:text-black hover:bg-secondary/40"
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
                placeholder="Ask about materials, Trombe lag, U-value, or project results..."
                className="flex-1 bg-transparent px-1 py-1 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none resize-none max-h-24 font-sans leading-relaxed"
              />

              <button
                type="button"
                onClick={handleSend}
                disabled={!inputMessage.trim() || isLoading}
                className="p-2 rounded-full bg-black hover:bg-[#6E818F] disabled:opacity-30 disabled:hover:bg-black text-white font-semibold transition cursor-pointer shrink-0"
                title="Send message (Enter)"
              >
                <Send className="size-3.5" />
              </button>
            </div>
            <div className="flex items-center justify-between mt-1.5 px-2 text-[9px] text-[#6E818F]">
              <span>Press <strong>Enter</strong> to send, <strong>Shift+Enter</strong> for newline</span>
              <span className="font-mono">DRDO PS 26051 AI</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
