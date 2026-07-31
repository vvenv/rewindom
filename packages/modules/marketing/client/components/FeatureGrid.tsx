import {
  Blocks,
  Gauge,
  Layers,
  Plug,
  Server,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import { useTranslation } from "react-i18next";

import { FEATURES, type FeatureIconName } from "../../shared/index.js";

/** shared 层只存图标名（不引 React），映射放在这里。 */
const ICONS: Record<FeatureIconName, LucideIcon> = {
  blocks: Blocks,
  shield: ShieldCheck,
  gauge: Gauge,
  layers: Layers,
  plug: Plug,
  server: Server,
};

export function FeatureGrid() {
  const { t } = useTranslation("marketing");

  return (
    <ul className="grid gap-px overflow-hidden rounded-2xl border border-border/60 bg-border/60 sm:grid-cols-2 lg:grid-cols-3">
      {FEATURES.map((feature) => {
        const Icon = ICONS[feature.icon];
        return (
          <li key={feature.icon} className="bg-background p-6">
            <Icon className="size-5 text-primary" aria-hidden />
            <h3 className="mt-3 font-medium">
              {t(`features.${feature.icon}.title`)}
            </h3>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
              {t(`features.${feature.icon}.description`)}
            </p>
          </li>
        );
      })}
    </ul>
  );
}
