import {
  BarChart3, ClipboardList, FileText, LayoutDashboard, LogIn, Receipt, ScrollText, Send, ShieldCheck, Boxes,
  type LucideIcon,
} from "lucide-react";

/** `icon` strings come from modules.yaml; unknown names fall back to a generic icon. */
const MAP: Record<string, LucideIcon> = {
  "clipboard-list": ClipboardList,
  receipt: Receipt,
  "file-text": FileText,
  send: Send,
  "scroll-text": ScrollText,
  "bar-chart-3": BarChart3,
  "shield-check": ShieldCheck,
  "log-in": LogIn,
  dashboard: LayoutDashboard,
};
export const moduleIcon = (name?: string): LucideIcon => (name && MAP[name]) || Boxes;
