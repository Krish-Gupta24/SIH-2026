import { AppShell } from "@/components/layout/AppShell";
import { SettingsView } from "@/features/settings/SettingsView";

export const metadata = {
  title: "Engineering Settings | ThemoShelter",
  description: "Configure unit systems (SI/IP), runtime engine flags, and API connection endpoints.",
};

export default function SettingsPage() {
  return (
    <AppShell>
      <SettingsView />
    </AppShell>
  );
}
