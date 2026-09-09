import { AppShell } from "@/components/layout/AppShell";
import { WeatherView } from "@/features/weather/WeatherView";

export const metadata = {
  title: "Weather & Climate | ShelterThermal",
  description: "High-altitude meteorological datasets and design-day diurnal temperature profiles.",
};

export default function WeatherPage() {
  return (
    <AppShell>
      <WeatherView />
    </AppShell>
  );
}
