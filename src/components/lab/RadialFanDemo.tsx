"use client";

import { RadialFab } from "@/components/fx/RadialFab";
import { useLocale, useTranslations } from "use-intl";
import { StudyPanel } from "./StudyPanel";

type Props = {
  accent: string;
  label: string;
  body: string;
  shareTitle: string;
};

/**
 * The phone's radial fan, fixed to the viewport the way the layout mounts it
 * on an article: four buttons burst along a 90° arc on elastic, and closing
 * reverses the same timeline at 2.2×. On the site it exists only on phones —
 * on a wide screen the island covers the same ground — but a study that
 * shows nothing on a desk is no study, so here it is mounted at every width.
 */
export function RadialFanDemo({ accent, label, body, shareTitle }: Props) {
  const locale = useLocale();
  const t = useTranslations("lab");
  return (
    <StudyPanel accent={accent} label={label}>
      <p className="spn-body">{body}</p>
      <RadialFab
        share={{ path: `/${locale}/lab/radial-fan`, category: t("kicker"), title: shareTitle }}
        always
      />
    </StudyPanel>
  );
}
