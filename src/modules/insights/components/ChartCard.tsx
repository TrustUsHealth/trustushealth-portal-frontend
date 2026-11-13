"use client";

import { useState, type ReactNode } from "react";
import { BarChart3, Table2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/** Title, chart, data note and a "View as table" toggle: every chart has a table twin (PRD 10.7). */
export function ChartCard({
  id, title, description, note, table, children, className,
}: {
  id?: string;
  title: string;
  description?: string;
  note?: ReactNode;
  table: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const [asTable, setAsTable] = useState(false);
  return (
    <Card className={cn("scroll-mt-24", className)}>
      <section id={id} aria-label={title}>
        <CardHeader
          title={title}
          description={description}
          action={
            <Button variant="ghost" size="sm" aria-pressed={asTable} onClick={() => setAsTable((v) => !v)}>
              {asTable ? <BarChart3 className="size-4" aria-hidden /> : <Table2 className="size-4" aria-hidden />}
              {asTable ? "View as chart" : "View as table"}
            </Button>
          }
        />
        <CardBody>
          {asTable ? table : children}
          {note && <p className="mt-3 text-xs text-ink-muted">{note}</p>}
        </CardBody>
      </section>
    </Card>
  );
}