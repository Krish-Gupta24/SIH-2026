"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Canvas } from "@react-three/fiber";
import { Environment, OrbitControls } from "@react-three/drei";
import { ArrowRight, Compass, Rotate3D } from "lucide-react";
import type { ShelterModel } from "@/types/shelter";
import type { SimulationJobItem } from "@/lib/store/use-shelter-store";

export function BrandMark({ inverse = false }: { inverse?: boolean }) {
  return (
    <span className="flex items-center gap-3">
      <span className="relative block h-8 w-10" aria-hidden="true">
        <span className={`absolute bottom-1 left-0 h-6 w-[3px] origin-bottom rotate-[34deg] ${inverse ? "bg-white" : "bg-black"}`} />
        <span className={`absolute bottom-1 left-[14px] h-7 w-[3px] origin-bottom -rotate-[34deg] ${inverse ? "bg-white" : "bg-black"}`} />
        <span className={`absolute bottom-1 right-0 h-5 w-[3px] origin-bottom -rotate-[34deg] ${inverse ? "bg-white" : "bg-black"}`} />
      </span>
      <span className="text-[17px] font-semibold tracking-[-0.045em]">ThermoShelter</span>
    </span>
  );
}

export function ActionButton({
  children,
  tone = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  tone?: "primary" | "secondary" | "quiet" | "signal";
}) {
  const tones = {
    primary: "bg-black text-white hover:bg-[#6E818F]",
    secondary:
      "border border-black/20 bg-white text-black hover:bg-[#CBDCE6]",
    quiet: "text-[#6E818F] hover:text-black",
    signal: "bg-[#CBDCE6] text-black hover:bg-white",
  };
  return (
    <button
      {...props}
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-5 text-[12px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-45 ${tones[tone]} ${className}`}
    >
      {children}
    </button>
  );
}

export function PageIntro({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <header className="workspace-intro flex flex-col gap-7 md:flex-row md:items-end md:justify-between">
      <div className="max-w-3xl">
        {eyebrow ? (
          <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.18em] text-[#6b7c86]">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="font-editorial text-balance text-[clamp(2.7rem,5vw,4.6rem)] font-medium leading-[.96] tracking-[-0.055em]">
          {title}
        </h1>
        {description ? (
          <p className="mt-5 max-w-2xl text-sm leading-6 text-[#536772]">
            {description}
          </p>
        ) : null}
      </div>
      {action}
    </header>
  );
}

export function DataPair({
  label,
  value,
  large = false,
}: {
  label: string;
  value: ReactNode;
  large?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <dt className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#71818a]">
        {label}
      </dt>
      <dd
        className={
          large
            ? "text-2xl font-medium tracking-[-0.04em]"
            : "text-sm font-medium"
        }
      >
        {value}
      </dd>
    </div>
  );
}

export function Status({
  children,
  strong = false,
}: {
  children: ReactNode;
  strong?: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.09em] ${strong ? "border-black/10 bg-white/85 text-[#101820]" : "border-black/10 bg-white/50 text-[#657783]"}`}
    >
      <span
        className={`size-1.5 rounded-full ${strong ? "bg-[#101820]" : "bg-[#7d8d95]"}`}
        aria-hidden="true"
      />
      {children}
    </span>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex min-h-80 flex-col items-center justify-center rounded-[1.75rem] border border-border bg-card px-6 text-center shadow-[0_20px_55px_rgba(0,0,0,.06)]">
      <div className="mb-7 flex size-14 items-center justify-center rounded-2xl bg-secondary" aria-hidden="true"><span className="size-2 rounded-full bg-foreground" /></div>
      <h2 className="text-xl font-medium tracking-tight">{title}</h2>
      <p className="mt-3 max-w-md text-sm leading-6 text-[#6b7c86]">
        {description}
      </p>
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}

export function IndoorTemperatureChart({
  run,
  compact = false,
}: {
  run?: SimulationJobItem;
  compact?: boolean;
}) {
  const data = run?.results?.hourlyTimeseries || [];
  if (!data.length)
    return (
      <div
        className={`${compact ? "h-56" : "h-80"} flex items-center justify-center rounded-2xl border border-border bg-white/50 text-xs text-[#6b7c86]`}
      >
        No completed time-series
      </div>
    );
  const temperatures = data.flatMap((point) => [
    point.indoorTempC,
    point.outdoorTempC,
  ]);
  const min = Math.floor(Math.min(...temperatures) - 2);
  const max = Math.ceil(Math.max(...temperatures) + 2);
  const range = Math.max(1, max - min);
  const toPoints = (key: "indoorTempC" | "outdoorTempC") =>
    data
      .map(
        (point, index) =>
          `${4 + (index / Math.max(1, data.length - 1)) * 92},${92 - ((point[key] - min) / range) * 82}`,
      )
      .join(" ");
  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#657783]">
        <div className="flex gap-5">
          <span className="flex items-center gap-2">
            <span className="h-px w-5 bg-[#101820]" />
            Indoor
          </span>
          <span className="flex items-center gap-2">
            <span className="h-px w-5 bg-[#81929b]" />
            Outdoor
          </span>
        </div>
        <span>
          {data.length} samples · {min} to {max} °C
        </span>
      </div>
      <svg
        viewBox="0 0 100 100"
        className={compact ? "h-52 w-full" : "h-72 w-full"}
        preserveAspectRatio="none"
        role="img"
        aria-label="Indoor and outdoor temperature time-series"
      >
        {[10, 37, 64, 91].map((y) => (
          <line
            key={y}
            x1="4"
            y1={y}
            x2="96"
            y2={y}
            stroke="rgba(16,24,32,.12)"
            strokeWidth=".35"
          />
        ))}
        <polyline
          points={toPoints("outdoorTempC")}
          fill="none"
          stroke="#81929b"
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
        />
        <polyline
          points={toPoints("indoorTempC")}
          fill="none"
          stroke="#101820"
          strokeWidth="1.7"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </div>
  );
}

export function ClimateProfile({
  winter,
  summer,
  hdd,
}: {
  winter: number;
  summer: number;
  hdd: number;
}) {
  const months = [-17, -13, -6, 2, 8, 13, 16, 15, 10, 3, -6, -13];
  const points = months
    .map(
      (value, index) => `${5 + index * 8.2},${78 - ((value + 20) / 40) * 62}`,
    )
    .join(" ");
  return (
    <div className="overflow-hidden rounded-[1.75rem] bg-secondary p-6 sm:p-8">
      <div className="flex items-start justify-between gap-6">
        <div>
          <p className="micro-label">Annual temperature profile</p>
          <p className="mt-2 text-sm text-[#536772]">
            Monthly dry-bulb design context
          </p>
        </div>
        <p className="text-right text-xs font-semibold">
          HDD18
          <br />
          <span className="text-2xl tracking-[-0.04em]">
            {hdd.toLocaleString()}
          </span>
        </p>
      </div>
      <svg
        viewBox="0 0 100 88"
        className="mt-8 h-48 w-full"
        preserveAspectRatio="none"
        role="img"
        aria-label={`Climate profile from ${winter} to ${summer} degrees Celsius`}
      >
        {[16, 47, 78].map((y) => (
          <line
            key={y}
            x1="5"
            y1={y}
            x2="95"
            y2={y}
            stroke="rgba(16,24,32,.13)"
            strokeWidth=".35"
          />
        ))}
        <polyline
          points={points}
          fill="none"
          stroke="#101820"
          strokeWidth="1.8"
          vectorEffect="non-scaling-stroke"
        />
        {months.map((value, index) => (
          <circle
            key={index}
            cx={5 + index * 8.2}
            cy={78 - ((value + 20) / 40) * 62}
            r="1"
            fill="#101820"
          />
        ))}
      </svg>
      <div className="flex justify-between border-t border-black/15 pt-4 text-[10px] font-semibold uppercase tracking-[0.08em]">
        <span>Winter {winter} °C</span>
        <span>Summer {summer} °C</span>
      </div>
    </div>
  );
}

export function SolarDiagram() {
  return (
    <div className="relative min-h-72 overflow-hidden rounded-[1.75rem] bg-foreground p-7 text-background">
      <p className="micro-label text-white/50">Passive gain study</p>
      <div className="absolute inset-x-[8%] bottom-12 h-44 rounded-[50%] border-t border-dashed border-white/35" />
      <div className="absolute bottom-12 left-1/2 h-24 w-48 -translate-x-1/2 bg-[#edf2f4]">
        <div className="absolute -top-10 left-0 h-10 w-full bg-[#b6c9d1] [clip-path:polygon(0_100%,50%_0,100%_100%)]" />
        <div className="absolute bottom-4 left-10 h-9 w-16 bg-[#6E818F]" />
      </div>
      <div className="absolute bottom-6 left-7 text-[10px] text-white/55">
        09:00
      </div>
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-[10px] text-white/55">
        12:00
      </div>
      <div className="absolute bottom-6 right-7 text-[10px] text-white/55">
        15:00
      </div>
    </div>
  );
}

export function PerformanceBars({
  demand,
  comfort,
}: {
  demand: number;
  comfort: number;
}) {
  const demandScore = Math.max(12, Math.min(100, 100 - demand));
  return (
    <div className="flex flex-col gap-6">
      <MetricBar
        label="Heating demand"
        value={`${demand} kWh/m²`}
        width={demandScore}
      />
      <MetricBar label="Comfort hours" value={`${comfort}%`} width={comfort} />
      <MetricBar label="Envelope resilience" value="High" width={84} />
    </div>
  );
}

function MetricBar({
  label,
  value,
  width,
}: {
  label: string;
  value: string;
  width: number;
}) {
  return (
    <div>
      <div className="mb-2 flex justify-between text-xs">
        <span className="text-[#657783]">{label}</span>
        <span className="font-semibold">{value}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-black/10">
        <div className="h-full rounded-full bg-[#101820] transition-[width] duration-700" style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

export function ShelterScene({
  project,
  wireframe,
}: {
  project: ShelterModel;
  wireframe: boolean;
}) {
  const length = Math.min(project.geometry.length, 12);
  const width = Math.min(project.geometry.width, 9);
  const height = Math.min(project.geometry.height, 5);
  return (
    <div
      className="absolute inset-0"
      role="img"
      aria-label="Interactive three-dimensional shelter model"
    >
      <Canvas camera={{ position: [10, 6.4, 10], fov: 34 }} shadows>
        <color attach="background" args={["#CBDCE6"]} />
        <fog attach="fog" args={["#CBDCE6", 18, 38]} />
        <ambientLight intensity={1.25} />
        <directionalLight position={[7, 10, 5]} intensity={2.4} castShadow />
        <group
          rotation={[0, (project.geometry.orientation * Math.PI) / 180, 0]}
        >
          <mesh position={[0, height / 2 + 0.15, 0]} castShadow receiveShadow>
            <boxGeometry args={[length, height, width]} />
            <meshStandardMaterial
              color="#f2f4f1"
              wireframe={wireframe}
              roughness={0.75}
            />
          </mesh>
          {project.geometry.roofType === "Flat" ? (
            <mesh position={[0, height + 0.34, 0]} castShadow>
              <boxGeometry args={[length + 0.55, 0.35, width + 0.55]} />
              <meshStandardMaterial
                color="#26343d"
                wireframe={wireframe}
                roughness={0.82}
              />
            </mesh>
          ) : (
            <mesh
              position={[0, height + 0.9, 0]}
              rotation={[0, 0, Math.PI / 4]}
              castShadow
            >
              <boxGeometry args={[1.55, 1.55, width + 0.6]} />
              <meshStandardMaterial
                color="#26343d"
                wireframe={wireframe}
                roughness={0.82}
              />
            </mesh>
          )}
          <mesh
            position={[length / 2 + 0.01, 1.65, 0]}
            rotation={[0, Math.PI / 2, 0]}
          >
            <planeGeometry args={[2.3, 1.5]} />
            <meshStandardMaterial color="#6E818F" />
          </mesh>
        </group>
        <gridHelper args={[34, 34, "#80939d", "#bac9cf"]} />
        <Environment preset="studio" />
        <OrbitControls
          makeDefault
          minDistance={6}
          maxDistance={26}
          maxPolarAngle={Math.PI / 2.05}
        />
      </Canvas>
    </div>
  );
}

export function OrientationDial({ degrees }: { degrees: number }) {
  return (
    <div className="relative flex size-20 items-center justify-center rounded-full border border-black/20 bg-white/90">
      <Compass className="size-4 text-[#657783]" />
      <span
        className="absolute left-1/2 top-1 h-8 w-px origin-bottom bg-[#101820]"
        style={{ transform: `translateX(-50%) rotate(${degrees}deg)` }}
      />
      <span className="absolute -top-5 text-[9px] font-bold">N</span>
      <span className="absolute -bottom-5 text-[9px] font-semibold">
        {degrees}°
      </span>
    </div>
  );
}

export function NextStep({
  label,
  detail,
  onClick,
}: {
  label: string;
  detail: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="group flex w-full items-center justify-between rounded-2xl border border-border bg-white/75 p-5 text-left shadow-[0_12px_35px_rgba(0,0,0,.05)] transition-all hover:-translate-y-0.5 hover:border-[#6E818F] hover:shadow-[0_18px_42px_rgba(0,0,0,.08)]"
    >
      <span>
        <span className="micro-label">Next step</span>
        <span className="mt-1 block text-base font-semibold">{label}</span>
        <span className="mt-1 block text-xs text-[#6b7c86]">{detail}</span>
      </span>
      <ArrowRight
        className="size-5 transition-transform group-hover:translate-x-1"
        aria-hidden="true"
      />
    </button>
  );
}

export function SceneHint() {
  return (
    <span className="flex items-center gap-2 text-[10px] font-semibold text-[#536772]">
      <Rotate3D className="size-4" aria-hidden="true" />
      Drag to orbit · scroll to zoom
    </span>
  );
}
