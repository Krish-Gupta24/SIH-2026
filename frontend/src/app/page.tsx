export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 text-center">
      <div className="max-w-3xl space-y-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-xs font-semibold text-primary">
          SIH 2026 Problem Statement 26051
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
          Area-Specific Shelter Design & Thermal Comfort Platform
        </h1>
        <p className="text-lg text-muted-foreground">
          Scientific building simulation, 3D parametric modeling, and multi-objective optimization for extreme cold and regional shelters.
        </p>
      </div>
    </main>
  );
}
