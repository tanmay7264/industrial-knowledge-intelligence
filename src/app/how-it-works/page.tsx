import {
  Search,
  BrainCircuit,
  FileSearch,
  Lightbulb,
  ClipboardCheck,
  ShieldCheck,
  Database,
  TrendingUp,
} from "lucide-react";
import { PageShell, ContentCard } from "@/components/page-shell";
import { TourTriggerButton } from "@/components/tour-trigger-button";

const STEPS = [
  {
    icon: Search,
    title: "1. Describe the problem",
    text: "Search a machine, symptom or incident from anywhere in the app — that's how every investigation starts.",
  },
  {
    icon: Database,
    title: "2. AI checks organizational memory",
    text: "It looks through past incidents, SOPs, maintenance logs, vendor manuals and expert notes for anything relevant.",
  },
  {
    icon: FileSearch,
    title: "3. Evidence is gathered",
    text: "Matching documents and similar historical incidents are pulled together as supporting evidence.",
  },
  {
    icon: BrainCircuit,
    title: "4. Root cause is identified",
    text: "The AI ranks the most likely causes and explains its confidence based on the evidence found.",
  },
  {
    icon: Lightbulb,
    title: "5. A recommendation is generated",
    text: "You get a step-by-step action plan — inspection order, repair steps, safety precautions, tools needed.",
  },
  {
    icon: ClipboardCheck,
    title: "6. You resolve the issue",
    text: "Follow the plan, or generate an Operational Playbook and Reasoning Graph if you want to go deeper.",
  },
  {
    icon: ShieldCheck,
    title: "7. Knowledge is captured",
    text: "Confirm whether it worked. Approved feedback becomes new Organizational Memory for the next engineer.",
  },
  {
    icon: TrendingUp,
    title: "8. Knowledge Risk updates",
    text: "Every captured resolution reduces knowledge risk and makes future AI recommendations stronger.",
  },
];

export default function HowItWorksPage() {
  return (
    <PageShell
      title="How Industrial Brain Works"
      subtitle="The simple version — one investigation, start to finish."
      maxWidth="md"
      actions={<TourTriggerButton />}
    >
      <ContentCard>
        <div className="space-y-5">
          {STEPS.map((step) => (
            <div key={step.title} className="flex gap-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <step.icon className="h-4 w-4" />
              </div>
              <div>
                <p className="font-medium">{step.title}</p>
                <p className="mt-0.5 text-sm text-muted-foreground">{step.text}</p>
              </div>
            </div>
          ))}
        </div>
      </ContentCard>

      <ContentCard>
        <p className="text-sm text-muted-foreground">
          Experts retire. Knowledge shouldn&apos;t — every investigation makes the next one faster.
        </p>
      </ContentCard>
    </PageShell>
  );
}
