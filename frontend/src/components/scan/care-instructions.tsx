import { AlertTriangle, Check, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export type CareInstructions = {
  intro: string;
  do: string[];
  dont: string[];
  urgent: string[];
  labels: {
    heading: string;
    do: string;
    dont: string;
    urgent: string;
    footnote: string;
  };
};

/**
 * Aftercare / prevention guidance for a completed scan. The content itself comes
 * from the backend (`backend/config/care_instructions.php`) so the on-screen text
 * and the PDF report can never drift apart.
 */
export function CareInstructionsCard({ care }: { care: CareInstructions }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{care.labels.heading}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <p className="text-foreground/75">{care.intro}</p>

        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <h3 className="mb-2 flex items-center gap-2 font-semibold text-emerald-700 dark:text-emerald-400">
              <Check className="h-4 w-4" />
              {care.labels.do}
            </h3>
            <ul className="space-y-2 text-sm">
              {care.do.map((item) => (
                <li key={item} className="flex gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-600 dark:bg-emerald-400" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="mb-2 flex items-center gap-2 font-semibold text-rose-700 dark:text-rose-400">
              <X className="h-4 w-4" />
              {care.labels.dont}
            </h3>
            <ul className="space-y-2 text-sm">
              {care.dont.map((item) => (
                <li key={item} className="flex gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-rose-600 dark:bg-rose-400" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {care.urgent.length > 0 && (
          <div className="rounded-2xl border-2 border-red-500/60 bg-red-50 p-4 text-red-900 dark:border-red-400/40 dark:bg-red-950/40 dark:text-red-100">
            <h3 className="mb-2 flex items-center gap-2 font-bold">
              <AlertTriangle className="h-5 w-5 shrink-0" />
              {care.labels.urgent}
            </h3>
            <ul className="space-y-1.5 text-sm">
              {care.urgent.map((item) => (
                <li key={item} className="flex gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-red-600 dark:bg-red-400" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <p className="text-xs text-foreground/60">{care.labels.footnote}</p>
      </CardContent>
    </Card>
  );
}
