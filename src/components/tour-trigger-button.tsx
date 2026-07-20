"use client";

import { Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTour } from "@/components/tour-context";

export function TourTriggerButton({
  label = "Take the Guided Tour",
}: {
  label?: string;
}) {
  const { start } = useTour();
  return (
    <Button onClick={start}>
      <Compass />
      {label}
    </Button>
  );
}
