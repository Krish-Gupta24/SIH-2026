"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowDown,
  ArrowRight,
  Box,
  Cpu,
  Database,
  FileCheck2,
  GitCompare,
  Layers3,
  Menu,
  ShieldCheck,
  Sparkles,
  Sun,
  Thermometer,
  Wind,
  X,
} from "lucide-react";
import type { SimulationJobItem } from "@/lib/store/use-shelter-store";
import {
  ActionButton,
  BrandMark,
  ClimateProfile,
  DataPair,
  PerformanceBars,
  SolarDiagram,
} from "@/components/v0/platform-components";

interface LandingProps {
  onOpen: () => void;
  onContinue: () => void;
  hasProject: boolean;
  summary?: NonNullable<SimulationJobItem["results"]>["summary"];
}

const method = ["Location", "Climate data", "Shelter parameters", "Area-specific design"];
const decisions = ["Geometry", "Orientation", "Materials", "Openings", "Thermal mass"];

export function PremiumLanding({ onOpen, onContinue, hasProject, summary }: LandingProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const scroll = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });

  return (
    <div className="overflow-hidden bg-background text-foreground">
      {/* 1. Aligned Project Navigation Bar */}
      <header className="landing-header absolute inset-x-0 top-0 z-50 bg-transparent text-white">
        <div className="landing-header-row mx-auto flex h-[72px] max-w-[1500px] items-start justify-between px-6 sm:px-10 lg:px-14">
          <button onClick={() => scroll("home")} aria-label="Go to ThermoShelter home" className="flex items-center gap-3">
            <BrandMark inverse={true} />
            <span className="hidden lg:inline-flex rounded-full border border-white/20 bg-white/10 px-2.5 py-0.5 text-[10px] font-medium text-white/80 tracking-wide">
              SIH 2026 · PS 26051
            </span>
          </button>

          {/* Centered Curvature Nav - Aligned with Project Navigation */}
          <nav className="landing-nav-curve hidden items-center justify-center gap-7 px-8 text-black md:flex" aria-label="Global navigation">
            <Link
              href="/designer/3d"
              className="landing-nav-link text-[11px] font-semibold text-black/75 transition-colors hover:text-black"
            >
              3D CAD
            </Link>
            <Link
              href="/weather"
              className="landing-nav-link text-[11px] font-semibold text-black/75 transition-colors hover:text-black"
            >
              Climate
            </Link>
            <Link
              href="/simulations"
              className="landing-nav-link text-[11px] font-semibold text-black/75 transition-colors hover:text-black"
            >
              Simulate
            </Link>
            <Link
              href="/optimization"
              className="landing-nav-link text-[11px] font-semibold text-black/75 transition-colors hover:text-black"
            >
              Optimize
            </Link>
            <Link
              href="/reports"
              className="landing-nav-link text-[11px] font-semibold text-black/75 transition-colors hover:text-black"
            >
              Reports
            </Link>
          </nav>

          {/* Right Action CTAs */}
          <div className="flex items-center gap-3">
            {hasProject && (
              <button
                onClick={onContinue}
                className="hidden rounded-full border border-white/25 bg-black/40 px-4 py-2 text-xs font-semibold text-white backdrop-blur-md transition-all hover:bg-white hover:text-black sm:inline-flex items-center gap-1.5"
              >
                <span>Resume Project</span>
                <ArrowRight className="size-3" />
              </button>
            )}

            <ActionButton
              onClick={onOpen}
              tone="secondary"
              className="landing-header-cta hidden rounded-full border-white bg-white pl-5 pr-2 text-black sm:inline-flex font-semibold text-xs"
            >
              Workspace
              <span className="flex size-7 items-center justify-center rounded-full bg-black text-white">
                <ArrowRight className="size-3" aria-hidden="true" />
              </span>
            </ActionButton>

            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="flex size-10 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-md md:hidden"
              aria-label="Toggle navigation"
            >
              {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileOpen && (
          <nav className="mx-5 mt-2 rounded-[2rem] border border-white/20 bg-black/95 p-6 text-white shadow-2xl backdrop-blur-2xl md:hidden space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-white/60">Platform Modules</span>
              <span className="text-[10px] text-emerald-400 font-mono">EnergyPlus v26.1.0</span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs font-medium">
              <Link
                href="/designer/3d"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2 rounded-xl bg-white/10 p-3 hover:bg-white/20"
              >
                <Box className="size-4 text-sky-400" />
                <span>3D CAD</span>
              </Link>
              <Link
                href="/weather"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2 rounded-xl bg-white/10 p-3 hover:bg-white/20"
              >
                <Sun className="size-4 text-amber-400" />
                <span>Climate</span>
              </Link>
              <Link
                href="/simulations"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2 rounded-xl bg-white/10 p-3 hover:bg-white/20"
              >
                <Cpu className="size-4 text-purple-400" />
                <span>Simulate</span>
              </Link>
              <Link
                href="/results"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2 rounded-xl bg-white/10 p-3 hover:bg-white/20"
              >
                <Thermometer className="size-4 text-emerald-400" />
                <span>Results</span>
              </Link>
              <Link
                href="/comparison"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2 rounded-xl bg-white/10 p-3 hover:bg-white/20"
              >
                <GitCompare className="size-4 text-indigo-400" />
                <span>Compare</span>
              </Link>
              <Link
                href="/optimization"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2 rounded-xl bg-white/10 p-3 hover:bg-white/20"
              >
                <Sparkles className="size-4 text-purple-400" />
                <span>Optimize</span>
              </Link>
              <Link
                href="/reports"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2 rounded-xl bg-white/10 p-3 hover:bg-white/20"
              >
                <FileCheck2 className="size-4 text-rose-400" />
                <span>Reports</span>
              </Link>
              <Link
                href="/materials"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2 rounded-xl bg-white/10 p-3 hover:bg-white/20"
              >
                <Database className="size-4 text-cyan-400" />
                <span>Materials</span>
              </Link>
            </div>

            <div className="pt-2 border-t border-white/10 flex flex-col gap-2">
              {hasProject && (
                <button
                  onClick={() => {
                    onContinue();
                    setMobileOpen(false);
                  }}
                  className="w-full rounded-xl bg-[#CBDCE6] py-3 text-center text-xs font-bold text-black"
                >
                  Resume Active Project →
                </button>
              )}
              <button
                onClick={() => {
                  onOpen();
                  setMobileOpen(false);
                }}
                className="w-full rounded-xl bg-white py-3 text-center text-xs font-bold text-black"
              >
                Open Projects Workspace →
              </button>
            </div>
          </nav>
        )}
      </header>

      {/* 2. Decluttered, High-Impact Hero Canvas */}
      <section id="home" className="hero-shell">
        <div className="hero-canvas">
          <Image
            src="/images/area-specific-shelter-hero.png"
            alt="Engineered modular shelter in the snow-covered Ladakh Himalayas"
            fill
            priority
            sizes="100vw"
            className="object-cover object-[52%_center]"
          />
          <div className="hero-grade" />

          <div className="hero-content">
            {/* Hero Main: Left Pitch & Action + Right Live HUD */}
            <div className="grid lg:grid-cols-[1.12fr_.88fr] items-center gap-10 xl:gap-14 w-full">
              {/* Left Column: Eyebrow + Catchy Headline + Subtitle + CTAs */}
              <div className="max-w-[44rem]">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-black/40 px-3.5 py-1 text-[11px] font-medium text-white/90 backdrop-blur-md">
                  <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="font-semibold uppercase tracking-wider">SIH 2026 · DRDO PS 26051</span>
                  <span className="text-white/30">•</span>
                  <span className="font-mono text-emerald-300">EnergyPlus 26.1.0</span>
                </div>

                <h1 className="hero-title text-balance mt-4">
                  Zero heat lost.
                  <span className="block font-editorial font-normal italic text-white/90">
                    Even at −20°C.
                  </span>
                </h1>

                <p className="mt-5 max-w-xl text-sm leading-relaxed text-white/80 sm:text-base sm:leading-7">
                  Physics-based autonomous shelter architecture for extreme high-altitude frontiers.
                  Harnessing Ladakh&apos;s solar radiation and local thermal mass to deliver
                  84% passive indoor comfort — with zero fuel dependence.
                </p>

                <div className="mt-7 flex flex-wrap items-center gap-3.5 sm:mt-8">
                  <ActionButton
                    onClick={onOpen}
                    tone="secondary"
                    className="rounded-full border-white bg-white pl-6 pr-2 text-black shadow-xl hover:scale-[1.02] transition-transform"
                  >
                    Launch 3D Studio
                    <span className="flex size-8 items-center justify-center rounded-full bg-black text-white">
                      <ArrowRight className="size-3.5" aria-hidden="true" />
                    </span>
                  </ActionButton>

                  <Link href="/simulations">
                    <button className="hero-outline-button flex items-center gap-2 hover:scale-[1.02] transition-transform">
                      <Cpu className="size-4 text-emerald-300" />
                      <span>Run Simulation</span>
                    </button>
                  </Link>

                  <button
                    onClick={() => scroll("method")}
                    className="hidden xl:inline-flex items-center gap-1.5 text-xs font-semibold text-white/60 hover:text-white transition-colors ml-2"
                  >
                    <span>Explore Method</span>
                    <ArrowDown className="size-3.5" />
                  </button>
                </div>
              </div>

              {/* Right Column: Sleek Glassmorphic Live Telemetry HUD */}
              <aside className="hidden md:block w-full max-w-[380px] justify-self-end rounded-[1.75rem] border border-white/20 bg-black/55 p-5 backdrop-blur-2xl shadow-[0_25px_70px_rgba(0,0,0,0.5)]">
                {/* Station Status Header */}
                <div className="flex items-center justify-between border-b border-white/10 pb-3.5">
                  <div className="flex items-center gap-2">
                    <span className="relative flex size-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
                    </span>
                    <div>
                      <p className="text-[9px] font-mono uppercase tracking-wider text-white/50">Leh Airport · WMO 427053</p>
                      <p className="text-xs font-semibold text-white">Alpine Design Telemetry</p>
                    </div>
                  </div>
                  <span className="rounded-full border border-white/15 bg-white/10 px-2 py-0.5 text-[9px] font-mono text-white/80">
                    3,500m · 67.5 kPa
                  </span>
                </div>

                {/* Temperature Comparison Gauge */}
                <div className="mt-4 grid grid-cols-2 gap-2.5">
                  <div className="rounded-xl border border-sky-500/20 bg-sky-950/30 p-3">
                    <p className="text-[9px] font-semibold uppercase tracking-wider text-sky-300">Exterior Freeze</p>
                    <p className="mt-1 text-2xl font-bold tracking-tight text-white">−20.5°C</p>
                    <p className="text-[9px] text-sky-200/60">Ladakh Winter Night</p>
                  </div>
                  <div className="rounded-xl border border-emerald-500/20 bg-emerald-950/30 p-3">
                    <p className="text-[9px] font-semibold uppercase tracking-wider text-emerald-300">Living Zone</p>
                    <p className="mt-1 text-2xl font-bold tracking-tight text-emerald-400">+18.6°C</p>
                    <p className="text-[9px] text-emerald-200/60">Passive ASHRAE 55</p>
                  </div>
                </div>

                {/* Net Passive Lift Progress Bar */}
                <div className="mt-3.5 rounded-xl border border-white/10 bg-white/5 p-2.5">
                  <div className="flex items-center justify-between text-[10px] font-semibold">
                    <span className="text-white/70">Passive Thermal Lift</span>
                    <span className="font-mono text-emerald-300">+39.1°C ΔT</span>
                  </div>
                  <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                    <div className="h-full w-[88%] rounded-full bg-gradient-to-r from-sky-400 via-amber-300 to-emerald-400" />
                  </div>
                </div>

                {/* Physical Specifications */}
                <div className="mt-3.5 space-y-1.5 text-[10px] text-white/80">
                  <div className="flex items-center justify-between border-b border-white/5 py-1">
                    <span className="text-white/50">Envelope Spec</span>
                    <span className="font-medium text-white">R-5.8 EPS + 300mm Mass</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-white/5 py-1">
                    <span className="text-white/50">Solar Aperture</span>
                    <span className="font-medium text-white">180° South · 142 kWh Gain</span>
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <span className="text-white/50">Aux Fuel Reliance</span>
                    <span className="font-mono font-bold text-emerald-400">0 Watts / Peak Solar</span>
                  </div>
                </div>

                {/* Footer Verification Badge */}
                <div className="mt-3.5 flex items-center justify-between border-t border-white/10 pt-2.5 text-[9px] text-white/60">
                  <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
                    <ShieldCheck className="size-3" />
                    <span>EnergyPlus Solved</span>
                  </span>
                  <Link href="/results" className="hover:text-white transition-colors flex items-center gap-1">
                    <span>View Results</span>
                    <ArrowRight className="size-2.5" />
                  </Link>
                </div>
              </aside>
            </div>

            {/* Bottom Telemetry Bar: Uncluttered 3-metric strip */}
            <div className="hero-bottom mt-auto pt-8">
              <div className="hero-metrics">
                {[
                  ["+39.1°C", "Passive thermal lift"],
                  [summary?.comfortHoursPct ? `${summary.comfortHoursPct}%` : "84%", "Comfort hours (18–24°C)"],
                  ["0 Liters", "Peak fuel reliance"],
                ].map(([value, label]) => (
                  <div key={label} className="px-4 first:pl-0 sm:px-6">
                    <p className="text-2xl font-medium tracking-[-0.06em] sm:text-3xl text-white">{value}</p>
                    <p className="mt-1 text-[8px] font-semibold uppercase tracking-[0.12em] text-white/60">{label}</p>
                  </div>
                ))}
              </div>

              <div className="story-index">
                <p>01 <span /> 02 <span /> 03</p>
                <p>Leh, Ladakh Alpine Benchmark</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="hero-bridge" aria-label="ThermoShelter design workflow">
        <div className="hero-bridge-inner">
          <div className="hero-bridge-intro">
            <p className="micro-label">From climate to construction</p>
            <p className="text-pretty">A single evidence trail connects the place you choose to the shelter you can defend.</p>
          </div>
          <ol className="hero-bridge-steps">
            {[
              ["01", "Locate", "Ground the model in altitude, weather and exposure."],
              ["02", "Design", "Shape geometry, envelope and openings as one system."],
              ["03", "Validate", "Compare comfort and demand before committing."],
            ].map(([number, title, description]) => (
              <li key={number}>
                <span>{number}</span>
                <div><strong>{title}</strong><p>{description}</p></div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="method" className="editorial-section flow-section grid gap-14 lg:grid-cols-[.8fr_1.2fr] lg:gap-20">
        <div><p className="micro-label">01 · The problem</p><h2 className="section-title mt-6">One shelter cannot answer every climate.</h2></div>
        <div className="flex flex-col justify-end"><p className="max-w-2xl text-lg leading-8 text-muted-foreground sm:text-xl">Generic assemblies ignore the forces that define comfort at altitude: dry-bulb extremes, solar exposure, wind-driven infiltration and severe diurnal swing.</p><dl className="mt-10 grid grid-cols-3 border-y border-border py-7"><DataPair large label="Winter design" value="−20.5°C" /><DataPair large label="Elevation" value="3,500 m" /><DataPair large label="HDD18" value="4,850" /></dl></div>
      </section>

      <section id="platform" className="bg-foreground text-background">
        <div className="editorial-section grid gap-16 lg:grid-cols-[.7fr_1.3fr]">
          <div><p className="micro-label text-white/45">02 · Area-specific design</p><h2 className="section-title mt-6">Place becomes a design input.</h2></div>
          <ol className="border-t border-white/20">{method.map((step, index) => <li key={step} className="grid grid-cols-[48px_1fr_auto] items-center border-b border-white/20 py-7"><span className="text-[10px] text-white/40">0{index + 1}</span><span className="text-xl font-medium sm:text-2xl">{step}</span><ArrowDown className={index === method.length - 1 ? "rotate-[-90deg]" : ""} aria-hidden="true" /></li>)}</ol>
        </div>
      </section>

      <section className="editorial-section grid p-0 lg:grid-cols-[1.08fr_.92fr]">
        <div className="shelter-study"><div className="study-frame"><div className="study-shelter"><span /><i /></div><p>Canonical envelope · Version 07</p><p>South aperture · 180°</p></div></div>
        <div className="flex flex-col justify-center bg-background p-8 sm:p-14 lg:p-16"><p className="micro-label">03 · Shelter designer</p><h2 className="section-title mt-6">The model is the decision surface.</h2><p className="mt-7 max-w-lg leading-7 text-muted-foreground">Control geometry, orientation, envelope systems, openings and thermal mass through a focused 13-step engineering sequence.</p><div className="mt-10 flex flex-wrap gap-x-6 gap-y-3 border-t border-border pt-6">{decisions.map((decision) => <span key={decision} className="micro-label text-foreground">{decision}</span>)}</div><ActionButton onClick={onOpen} className="mt-10 self-start">Open designer <ArrowRight aria-hidden="true" /></ActionButton></div>
      </section>

      <section className="border-y border-border bg-secondary"><div className="editorial-section grid gap-14 lg:grid-cols-[.72fr_1.28fr]"><div><p className="micro-label">04 · Weather intelligence</p><h2 className="section-title mt-6">Real weather. Attached to every run.</h2><p className="mt-7 max-w-md leading-7 text-muted-foreground">Location, coordinates, source and time period stay visible alongside temperature, solar radiation, wind and humidity.</p></div><ClimateProfile winter={-20.5} summer={28} hdd={4850} /></div></section>

      <section className="editorial-section"><div className="grid gap-14 lg:grid-cols-2"><div><SolarDiagram /><p className="mt-5 text-xs leading-5 text-muted-foreground">Physics-based solar aperture study · south elevation · winter design day</p></div><div className="flex flex-col justify-center lg:pl-10"><p className="micro-label">05 · Thermal simulation</p><h2 className="section-title mt-6">See what the climate does inside.</h2><p className="mt-7 max-w-xl leading-7 text-muted-foreground">Follow indoor and outdoor temperature, solar gain, fabric losses, air exchange and comfort—then retain every assumption with the result.</p><div className="mt-10"><PerformanceBars demand={summary?.heatingDemandKwhM2 ?? 31} comfort={summary?.comfortHoursPct ?? 84} /></div></div></div></section>

      <section className="bg-foreground text-background"><div className="editorial-section"><div className="grid gap-16 lg:grid-cols-[.78fr_1.22fr]"><div><p className="micro-label text-white/45">06–07 · Compare and optimize</p><h2 className="section-title mt-6">Find the best answer, not just an answer.</h2></div><div className="grid grid-cols-2 gap-px bg-white/20 sm:grid-cols-4">{[["Baseline", "71%"], ["Insulated", "84%"], ["Solar-led", "81%"], ["Optimized", "91%"]].map(([name, value], index) => <div key={name} className={`min-h-48 p-5 ${index === 3 ? "bg-secondary text-foreground" : "bg-foreground"}`}><p className="micro-label opacity-60">0{index + 1}</p><p className="mt-16 text-sm font-medium">{name}</p><p className="mt-2 text-4xl font-semibold tracking-[-0.06em]">{value}</p></div>)}</div></div><div className="mt-14 flex flex-wrap items-center justify-between gap-8 border-t border-white/20 pt-8"><p className="max-w-xl text-sm leading-6 text-white/55">Design space → simulate → rank → optimal configuration. Every candidate remains inspectable.</p><span className="micro-label text-white/70">Overall recommended · Variant 04</span></div></div></section>

      <section className="bg-secondary"><div className="editorial-section grid gap-16 lg:grid-cols-[1.15fr_.85fr]"><div><p className="micro-label">08 · Engineering recommendation</p><h2 className="section-title mt-6 max-w-3xl">Reduce the air path before adding another layer.</h2></div><div className="flex flex-col justify-end"><p className="leading-8 text-muted-foreground">Evidence points to infiltration control first, followed by roof insulation and a controlled solar aperture. The recommendation becomes a validation sequence—not a chatbot answer.</p><dl className="mt-10 grid grid-cols-2 gap-8 border-t border-border pt-7"><DataPair label="First priority" value="Air sealing" /><DataPair label="Target" value="≤ 0.25 ACH" /><DataPair label="Next" value="Roof R-6.0" /><DataPair label="Validate" value="Controlled rerun" /></dl></div></div></section>

      <section id="proof" className="editorial-section"><div className="grid gap-14 lg:grid-cols-[.72fr_1.28fr]"><div><p className="micro-label">09 · Results</p><h2 className="section-title mt-6">Performance, immediately legible.</h2></div><div><div className="flex items-end justify-between border-b border-foreground pb-7"><span className="text-sm font-medium">Thermal performance</span><span className="text-7xl font-semibold tracking-[-0.08em] sm:text-9xl">84%</span></div><div className="grid grid-cols-3 gap-6 pt-7"><DataPair large label="Average indoor" value="18.6°C" /><DataPair large label="Heating" value="31 kWh" /><DataPair large label="Solar gain" value="142 kWh" /></div></div></div></section>

      <section id="context" className="border-t border-border"><div className="editorial-section grid gap-12 py-20 lg:grid-cols-[.55fr_1.45fr] lg:py-28"><div><p className="micro-label">10 · National innovation context</p><p className="mt-5 text-sm leading-6 text-muted-foreground">Smart India Hackathon 2026<br />DRDO · Problem Statement 26051</p></div><h2 className="section-title max-w-5xl">Engineering credibility comes from what the record can prove.</h2></div></section>

      <section className="bg-foreground text-background"><div className="editorial-section flex flex-col gap-12 py-20 lg:flex-row lg:items-end lg:justify-between lg:py-28"><div><p className="micro-label text-white/45">11 · Begin</p><h2 className="section-title mt-6 max-w-4xl">Design the right shelter for the right climate.</h2></div><ActionButton onClick={onOpen} tone="signal" className="shrink-0 rounded-full px-8">Start designing <ArrowRight aria-hidden="true" /></ActionButton></div><footer className="mx-auto flex max-w-[1500px] flex-col gap-4 border-t border-white/20 px-5 py-8 text-[9px] font-semibold uppercase tracking-[0.14em] text-white/50 sm:px-10 md:flex-row md:items-center md:justify-between lg:px-14"><span className="text-sm normal-case tracking-[-0.02em] text-white">ThermoShelter</span><span>SIH 2026 · DRDO PS 26051 · Built for severe climates</span></footer></section>
    </div>
  );
}
