import { Card, CardContent, CardHeader, CardTitle } from "@be-water/ui/card";
import { cn } from "@be-water/ui/utils";

export type MetricColor = "blue" | "amber" | "orange" | "red";

const METRIC_ACCENT: Record<MetricColor, { bg: string; text: string }> = {
  blue: {
    bg: "bg-info/10",
    text: "text-info",
  },
  amber: {
    bg: "bg-warning/10",
    text: "text-warning",
  },
  orange: {
    bg: "bg-warning/20",
    text: "text-warning",
  },
  red: {
    bg: "bg-destructive/10",
    text: "text-destructive",
  },
};

export function MetricCard({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string;
  sub?: string;
  color: MetricColor;
}) {
  const accent = METRIC_ACCENT[color];

  return (
    <Card className={cn("transition-shadow hover:shadow-md", accent.bg)}>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className={cn("text-2xl font-bold tabular-nums", accent.text)}>
          {value}
        </div>
        {sub && <p className="text-xs text-muted-foreground/80">{sub}</p>}
      </CardContent>
    </Card>
  );
}
