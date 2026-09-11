"use client";

import { useState } from "react";
import Image from "next/image";
import { ArrowDown, ArrowRight, Layers3, Menu, Thermometer, Wind, X } from "lucide-react";
import type { SimulationJobItem } from "@/lib/store/use-shelter-store";
import { ActionButton, BrandMark, ClimateProfile, DataPair, PerformanceBars, SolarDiagram } from "@/components/v0/platform-components";

interface LandingProps {
  onOpen: () => void;
  onContinue: () => void;
  hasProject: boolean;
  summary?: NonNullable<SimulationJobItem["results"]>["summary"];
}

const capabilities = [
  { icon: Thermometer, label: "Predict indoor temperature" },
  { icon: Wind, label: "Analyze heat flow" },
  { icon: Layers3, label: "Find optimal designs" },
];

const method = ["Location", "Climate data", "Shelter parameters", "Area-specific design"];
const decisions = ["Geometry", "Orientation", "Materials", "Openings", "Thermal mass"];

export function PremiumLanding({ onOpen, onContinue, hasProject, summary }: LandingProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const landingLinks = [
    ["home", "Home"],
    ["platform", "Platform"],
    ["method", "How it works"],
    ["context", "About"],
  ];
  const scroll = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  const scrollToPlatform = () => scroll("platform");

  return (
    <div className="overflow-hidden bg-background text-foreground">
      <header className="landing-header absolute inset-x-0 top-0 z-50 bg-transparent text-white">
        <div className="landing-header-row mx-auto flex h-[68px] max-w-[1500px] items-start justify-between px-7 sm:px-10 lg:px-14">
          <button onClick={() => scroll("home")} aria-label="Go to ThermoShelter home">
            <BrandMark inverse={true} />
          </button>
          <nav className="landing-nav-curve hidden items-center justify-center gap-8 px-11 text-black md:flex" aria-label="Global navigation">
            {landingLinks.map(([id, label]) => (
              <button
                key={id}
                onClick={() => scroll(id)}
                className="landing-nav-link text-[10px] font-semibold text-black/65 transition-colors hover:text-black"
              >
                {label}
              </button>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <ActionButton
              onClick={onOpen}
              tone="secondary"
              className="landing-header-cta hidden rounded-full border-white bg-white pl-6 pr-2 text-black sm:inline-flex"
            >
              Get started <span className="flex size-8 items-center justify-center rounded-full bg-black text-white"><ArrowRight aria-hidden="true" /></span>
            </ActionButton>
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="flex size-10 items-center justify-center md:hidden"
              aria-label="Toggle navigation"
            >
              {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>
        </div>
        {mobileOpen && (
          <nav className="mx-5 mt-2 rounded-[1.5rem] border border-white/20 bg-black/90 px-5 py-4 text-white shadow-xl backdrop-blur-xl md:hidden">
            {landingLinks.map(([id, label]) => (
              <button
                key={id}
                onClick={() => {
                  scroll(id);
                  setMobileOpen(false);
                }}
                className="block w-full border-b border-white/15 py-3 text-left text-sm font-medium"
              >
                {label}
              </button>
            ))}
            <button
              onClick={() => {
                onOpen();
                setMobileOpen(false);
              }}
              className="block w-full py-3 text-left text-sm font-medium text-[#CBDCE6]"
            >
              Get started →
            </button>
          </nav>
        )}
      </header>

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
            <div className="max-w-[46rem]">
              <p className="micro-label text-white/70">Ladakh tested · climate specific</p>
              <h1 className="hero-title text-balance">
                Designed for
                <span className="block font-editorial font-normal italic">harsh climates.</span>
              </h1>
              <p className="mt-5 max-w-lg text-sm leading-6 text-white/75 sm:mt-6 sm:text-base sm:leading-7">
                Area-specific shelter design and physics-based thermal simulation for severe environments—built to improve comfort while reducing energy demand.
              </p>
              <div className="mt-7 flex flex-wrap gap-3 sm:mt-8">
                <ActionButton onClick={onOpen} tone="secondary" className="rounded-full border-white bg-white pl-6 pr-2 text-black">
                  Design your shelter
                  <span className="flex size-8 items-center justify-center rounded-full bg-black text-white"><ArrowRight aria-hidden="true" /></span>
                </ActionButton>
                <button onClick={scrollToPlatform} className="hero-outline-button">
                  Explore the platform <ArrowDown aria-hidden="true" />
                </button>
              </div>
              <div className="capability-strip" aria-label="Platform capabilities">
                {capabilities.map(({ icon: Icon, label }) => (
                  <span key={label} className="flex items-center gap-2"><Icon className="size-3.5" aria-hidden="true" />{label}</span>
                ))}
              </div>
            </div>

            <div className="hero-bottom">
              <div className="hero-metrics">
                {[
                  [summary?.comfortHoursPct ? `${summary.comfortHoursPct}%` : "84%", "Comfort hours"],
                  [summary?.heatingDemandKwhM2 ? `${summary.heatingDemandKwhM2}` : "31", "kWh/m² heating"],
                  ["13", "Design parameters"],
                ].map(([value, label]) => (
                  <div key={label} className="px-4 first:pl-0 sm:px-6">
                    <p className="text-2xl font-medium tracking-[-0.06em] sm:text-3xl">{value}</p>
                    <p className="mt-1 text-[8px] font-semibold uppercase tracking-[0.12em] text-white/55">{label}</p>
                  </div>
                ))}
              </div>
              <div className="story-index">
                <p>01 <span /> 02 <span /> 03</p>
                <p>Area-specific shelter design</p>
              </div>
            </div>
          </div>

          <div className="climate-reading">
            <p>Outside · Leh, Ladakh</p>
            <div className="flex items-end justify-between gap-5"><strong>−18°C</strong><span>3,500 m</span></div>
          </div>

          <div className="shelter-note shelter-note-roof"><span>Insulated envelope</span><i /></div>
          <div className="shelter-note shelter-note-comfort"><span>Inside · 20°C</span><i /></div>
          <div className="shelter-note shelter-note-solar"><span>Solar gain · high</span><i /></div>

          <aside className="thermal-card">
            <div className="relative h-32 overflow-hidden rounded-[0.9rem] sm:h-36">
              <Image src="/images/area-specific-shelter-hero.png" alt="Close view of the shelter envelope" fill sizes="290px" className="object-cover object-[69%_68%] scale-[1.35]" />
            </div>
            <div className="flex items-end justify-between gap-4 pt-4">
              <div><p className="micro-label text-white/45">Thermal performance</p><h2 className="mt-2 text-base font-medium">Envelope response</h2></div>
              <strong className="text-3xl font-medium tracking-[-0.06em]">84%</strong>
            </div>
            <p className="mt-3 text-[10px] leading-4 text-white/55">Compact form, insulated shell and controlled southern aperture.</p>
            <div className="mt-4 flex gap-1.5" aria-hidden="true"><span className="h-1 w-8 rounded-full bg-white" /><span className="size-1 rounded-full bg-white/35" /><span className="size-1 rounded-full bg-white/35" /></div>
          </aside>

          {hasProject ? <button onClick={onContinue} className="continue-link">Continue active project <ArrowRight aria-hidden="true" /></button> : null}
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

      <section className="bg-foreground text-background"><div className="editorial-section"><div className="grid gap-16 lg:grid-cols-[.78fr_1.22fr]"><div><p className="micro-label text-white/45">06–07 · Compare and optimize</p><h2 className="section-title mt-6">Find the best answer, not just an answer.</h2></div><div className="grid grid-cols-2 gap-px bg-white/20 sm:grid-cols-4">{[["Baseline","71%"],["Insulated","84%"],["Solar-led","81%"],["Optimized","91%"]].map(([name,value],index)=><div key={name} className={`min-h-48 p-5 ${index===3?"bg-secondary text-foreground":"bg-foreground"}`}><p className="micro-label opacity-60">0{index+1}</p><p className="mt-16 text-sm font-medium">{name}</p><p className="mt-2 text-4xl font-semibold tracking-[-0.06em]">{value}</p></div>)}</div></div><div className="mt-14 flex flex-wrap items-center justify-between gap-8 border-t border-white/20 pt-8"><p className="max-w-xl text-sm leading-6 text-white/55">Design space → simulate → rank → optimal configuration. Every candidate remains inspectable.</p><span className="micro-label text-white/70">Overall recommended · Variant 04</span></div></div></section>

      <section className="bg-secondary"><div className="editorial-section grid gap-16 lg:grid-cols-[1.15fr_.85fr]"><div><p className="micro-label">08 · Engineering recommendation</p><h2 className="section-title mt-6 max-w-3xl">Reduce the air path before adding another layer.</h2></div><div className="flex flex-col justify-end"><p className="leading-8 text-muted-foreground">Evidence points to infiltration control first, followed by roof insulation and a controlled solar aperture. The recommendation becomes a validation sequence—not a chatbot answer.</p><dl className="mt-10 grid grid-cols-2 gap-8 border-t border-border pt-7"><DataPair label="First priority" value="Air sealing" /><DataPair label="Target" value="≤ 0.25 ACH" /><DataPair label="Next" value="Roof R-6.0" /><DataPair label="Validate" value="Controlled rerun" /></dl></div></div></section>

      <section id="proof" className="editorial-section"><div className="grid gap-14 lg:grid-cols-[.72fr_1.28fr]"><div><p className="micro-label">09 · Results</p><h2 className="section-title mt-6">Performance, immediately legible.</h2></div><div><div className="flex items-end justify-between border-b border-foreground pb-7"><span className="text-sm font-medium">Thermal performance</span><span className="text-7xl font-semibold tracking-[-0.08em] sm:text-9xl">84%</span></div><div className="grid grid-cols-3 gap-6 pt-7"><DataPair large label="Average indoor" value="18.6°C" /><DataPair large label="Heating" value="31 kWh" /><DataPair large label="Solar gain" value="142 kWh" /></div></div></div></section>

      <section id="context" className="border-t border-border"><div className="editorial-section grid gap-12 py-20 lg:grid-cols-[.55fr_1.45fr] lg:py-28"><div><p className="micro-label">10 · National innovation context</p><p className="mt-5 text-sm leading-6 text-muted-foreground">Smart India Hackathon 2026<br />DRDO · Problem Statement 26051</p></div><h2 className="section-title max-w-5xl">Engineering credibility comes from what the record can prove.</h2></div></section>

      <section className="bg-foreground text-background"><div className="editorial-section flex flex-col gap-12 py-20 lg:flex-row lg:items-end lg:justify-between lg:py-28"><div><p className="micro-label text-white/45">11 · Begin</p><h2 className="section-title mt-6 max-w-4xl">Design the right shelter for the right climate.</h2></div><ActionButton onClick={onOpen} tone="signal" className="shrink-0 rounded-full px-8">Start designing <ArrowRight aria-hidden="true" /></ActionButton></div><footer className="mx-auto flex max-w-[1500px] flex-col gap-4 border-t border-white/20 px-5 py-8 text-[9px] font-semibold uppercase tracking-[0.14em] text-white/50 sm:px-10 md:flex-row md:items-center md:justify-between lg:px-14"><span className="text-sm normal-case tracking-[-0.02em] text-white">ThermoShelter</span><span>SIH 2026 · DRDO PS 26051 · Built for severe climates</span></footer></section>
    </div>
  );
}
