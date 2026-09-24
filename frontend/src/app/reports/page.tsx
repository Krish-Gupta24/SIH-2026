import { AppShell } from "@/components/layout/AppShell";
import { ReportsView } from "@/features/reports/ReportsView";

export const metadata = {
  title: "Engineering Reports & Certification | ThemoShelter",
  description: "Official thermal compliance reports compliant with SIH 26051 and ECBC Cold Zone standards.",
};

export default function ReportsPage() {
  return (
    <AppShell>
      <ReportsView />
    </AppShell>
  );
}
