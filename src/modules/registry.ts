/**
 * One line per module (PRD 4.4). The backend decides WHO sees a tile (`/me/modules`);
 * this file only adds frontend copy and build status for modules whose screens are not built yet.
 */
export interface ModuleMeta {
  description: string;
  status: "live" | "planned";
  build?: number;
  planned?: string[];
}

export const MODULE_REGISTRY: Record<string, ModuleMeta> = {
  access: { description: "Invite people, decide what staff can see, approve access requests.", status: "live" },
  patient_registry: { description: "Patient entries, report upload, duplicate checks and the yearly Excel register.", status: "live" },
  insights: { description: "Money, labs and patients at a glance, with a downloadable PDF report. Admin only.", status: "live" },
  bill_generator: {
    description: "Plain PDF bills for Spectrum from an entry, a report or scratch.",
    status: "planned",
    build: 2,
    planned: ["Pick an existing entry and only type amounts", "Upload a Spectrum report to pre-fill", "Download, print or send the bill"],
  },
  reports: {
    description: "Every lab report in one searchable library, with Gmail intake.",
    status: "planned",
    build: 3,
    planned: ["Lab-first upload", "Inbox for reports that need review", "Auto-link to the right patient entry"],
  },
  delivery: {
    description: "Send reports and bills by email or WhatsApp and track delivery.",
    status: "planned",
    build: 4,
    planned: ["Email and WhatsApp sending", "Delivery queue with retry status", "Send an ad-hoc file with a typed recipient"],
  },
  logs: {
    description: "Who did what and when, with filters and CSV export.",
    status: "planned",
    build: 5,
    planned: ["Filter by date, user, role, module, action", "CSV export", "Read-only for engineers"],
  },
  analytics: {
    description: "Entries completed, turnaround, delivery success, revenue and margin.",
    status: "planned",
    build: 6,
    planned: ["Per-staff and admin views", "Backlog and correction rate", "Revenue and margin by lab (admin only)"],
  },
};