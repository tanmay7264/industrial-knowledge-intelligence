"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTour } from "@/components/tour-context";
import { useSidebar } from "@/components/sidebar-context";

const TOUR_STEPS = [
  {
    href: "/command",
    title: "1. Command Center",
    text: "Your mission control — plant status, critical alerts and what to investigate next, all in one glance.",
  },
  {
    href: "/copilot",
    title: "2. Ask Memory",
    text: "Search decades of engineering experience conversationally. Answers are grounded in real evidence, not guesses.",
  },
  {
    href: "/assets",
    title: "3. Asset 360",
    text: "The digital identity card for every machine — health, risk and how much organizational knowledge exists for it.",
  },
  {
    href: "/documents",
    title: "4. Document Intelligence",
    text: "Add SOPs, incident reports and manuals here. Every upload makes the AI smarter.",
  },
  {
    href: "/graph",
    title: "5. AI Reasoning",
    text: "See exactly why the AI reached a recommendation — the evidence chain behind every answer.",
  },
  {
    href: "/rca",
    title: "6. Investigate",
    text: "Run a full AI root cause investigation on any machine problem, backed by real evidence.",
  },
  {
    href: "/incidents",
    title: "7. Failure Intelligence",
    text: "Browse every historical failure and how it was solved. Learn from the past instead of repeating it.",
  },
  {
    href: "/alerts",
    title: "8. Operational Intelligence",
    text: "AI-generated alerts and discoveries that need your attention today.",
  },
  {
    href: "/knowledge-risk",
    title: "9. Memory Continuity",
    text: "Track which experts are retiring and how much of their knowledge has been captured before they go.",
  },
  {
    href: "/playbook",
    title: "10. Operational Playbooks",
    text: "Generate step-by-step repair playbooks straight from organizational memory.",
  },
  {
    href: "/how-it-works",
    title: "11. How It Works",
    text: "Come back here anytime for a simple recap of the whole workflow.",
  },
];

type Rect = { top: number; left: number; width: number; height: number };

// Both the desktop sidebar and the mobile drawer render a link for every
// nav item; only one is ever visually present, so pick whichever actually
// has layout (a hidden one reports a zero-size rect).
function findVisibleTarget(href: string): HTMLElement | null {
  const candidates = document.querySelectorAll<HTMLElement>(
    `[data-tour-id="${href}"]`
  );
  for (const el of candidates) {
    if (el.getClientRects().length > 0) return el;
  }
  return null;
}

export function GuidedTour() {
  const { active, stop } = useTour();
  const { mobileOpen, openMobile, closeMobile } = useSidebar();
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const wasMobileOpenRef = useRef(false);

  const measure = useCallback(() => {
    const target = findVisibleTarget(TOUR_STEPS[step].href);
    if (!target) {
      setRect(null);
      return;
    }
    const r = target.getBoundingClientRect();
    setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
  }, [step]);

  useEffect(() => {
    if (!active) return;
    wasMobileOpenRef.current = mobileOpen;
    openMobile();
    setStep(0);
    // Only re-run when a tour starts, not on every mobileOpen/openMobile change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  useEffect(() => {
    if (!active) return;
    const id = requestAnimationFrame(measure);
    window.addEventListener("resize", measure);
    return () => {
      cancelAnimationFrame(id);
      window.removeEventListener("resize", measure);
    };
  }, [active, measure]);

  const end = useCallback(() => {
    stop();
    if (!wasMobileOpenRef.current) closeMobile();
  }, [stop, closeMobile]);

  if (!active) return null;

  const current = TOUR_STEPS[step];
  const isLast = step === TOUR_STEPS.length - 1;

  // Below this width there's no room to place the card beside the target
  // without it overlapping the sidebar, so pin it to the bottom instead.
  const narrow = window.innerWidth < 640;
  const tooltipTop = rect
    ? Math.min(Math.max(rect.top - 8, 16), window.innerHeight - 220)
    : window.innerHeight / 2 - 80;
  const tooltipLeft = rect ? rect.left + rect.width + 16 : 24;

  return (
    <div className="fixed inset-0 z-[70]">
      {/* A single spotlight layer does the dimming: its box-shadow covers the
          whole viewport except the target rect, which is left transparent.
          A separate full-page overlay underneath would just re-dim it. */}
      {rect ? (
        <div
          className="absolute rounded-lg ring-2 ring-primary transition-all duration-200"
          style={{
            top: rect.top - 4,
            left: rect.left - 4,
            width: rect.width + 8,
            height: rect.height + 8,
            boxShadow: "0 0 0 9999px rgba(0,0,0,0.6)",
          }}
        />
      ) : (
        <div className="absolute inset-0 bg-black/60" />
      )}
      <div
        className="absolute w-[calc(100vw-3rem)] max-w-xs rounded-xl border border-border bg-card p-4 shadow-2xl transition-all duration-200"
        style={
          narrow
            ? { bottom: 16, left: 16, right: 16, width: "auto", maxWidth: "none" }
            : { top: tooltipTop, left: Math.min(tooltipLeft, window.innerWidth - 320) }
        }
      >
        <div className="flex items-start justify-between gap-2">
          <p className="font-heading text-sm font-semibold">{current.title}</p>
          <button
            type="button"
            onClick={end}
            aria-label="Close tour"
            className="shrink-0 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
          {current.text}
        </p>
        <div className="mt-3 flex items-center justify-between gap-2">
          <span className="text-[10px] text-muted-foreground">
            Step {step + 1} of {TOUR_STEPS.length}
          </span>
          <div className="flex gap-1.5">
            {step > 0 && (
              <Button size="xs" variant="outline" onClick={() => setStep((s) => s - 1)}>
                Back
              </Button>
            )}
            <Button size="xs" variant="outline" onClick={end}>
              Skip
            </Button>
            <Button
              size="xs"
              onClick={() => (isLast ? end() : setStep((s) => s + 1))}
            >
              {isLast ? "Finish" : "Next"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
