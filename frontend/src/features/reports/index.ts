/**
 * Engineering Reports & Provenance Feature Module
 * Responsible for compliance audits, full provenance inspection,
 * printable PDF generation, and executive summary export.
 */

export interface EngineeringReportMetadata {
  reportId: string;
  shelterId: string;
  simulationRunId: string;
  generatedAt: string;
  isCompliant: boolean;
}
