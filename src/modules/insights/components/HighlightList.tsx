import { Lightbulb } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/card";

export function HighlightList({ items }: { items: string[] }) {
  return (
    <Card>
      <CardHeader title="Highlights" description="Plain sentences built from the numbers on this screen." />
      <CardBody>
        {items.length === 0 ? (
          <p className="text-sm text-ink-muted">Nothing notable to report for this period.</p>
        ) : (
          <ul className="space-y-2.5">
            {items.map((t, i) => (
              <li key={i} className="flex gap-2.5 text-[15px] leading-relaxed text-ink">
                <Lightbulb className="mt-1 size-4 shrink-0 text-ink-muted" aria-hidden />
                <span>{t}</span>
              </li>
            ))}
          </ul>
        )}
      </CardBody>
    </Card>
  );
}