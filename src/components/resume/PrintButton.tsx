"use client";

import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/icons/Icon";

/**
 * "Print / save as PDF". The page's print stylesheet (globals.css) is the
 * whole export pipeline: the island, the footer, the glow and the grain
 * stay off the paper, the tokens go to ink on white, and the browser's own
 * print dialog offers the PDF. No generated file to keep in step with the
 * page — what is printed is the page.
 */
export function PrintButton({ label, ariaLabel }: { label: string; ariaLabel: string }) {
  return (
    <Button
      type="button"
      onClick={() => window.print()}
      aria-label={ariaLabel}
      className="print:hidden"
    >
      <Icon name="print" className="size-4" />
      {label}
    </Button>
  );
}
