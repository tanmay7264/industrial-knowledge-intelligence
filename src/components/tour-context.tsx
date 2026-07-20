"use client";

import { createContext, useContext, useState, useCallback, useEffect } from "react";

type TourContextValue = {
  active: boolean;
  start: () => void;
  stop: () => void;
};

const TourContext = createContext<TourContextValue | null>(null);
const SEEN_KEY = "iki_tour_seen";

export function TourProvider({ children }: { children: React.ReactNode }) {
  const [active, setActive] = useState(false);

  const start = useCallback(() => setActive(true), []);
  const stop = useCallback(() => setActive(false), []);

  // First-time visitors get the tour automatically; everyone else only
  // sees it if they trigger it themselves. The "seen" flag is written only
  // when the timeout actually fires, not when it's scheduled — writing it
  // eagerly would make React Strict Mode's mount→cleanup→mount dev replay
  // mark the tour "seen" before the real (second) mount ever runs.
  useEffect(() => {
    if (localStorage.getItem(SEEN_KEY)) return;
    const id = setTimeout(() => {
      localStorage.setItem(SEEN_KEY, "1");
      setActive(true);
    }, 700);
    return () => clearTimeout(id);
  }, []);

  return (
    <TourContext.Provider value={{ active, start, stop }}>
      {children}
    </TourContext.Provider>
  );
}

export function useTour() {
  const ctx = useContext(TourContext);
  if (!ctx) {
    throw new Error("useTour must be used within TourProvider");
  }
  return ctx;
}
