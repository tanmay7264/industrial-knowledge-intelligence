import { z } from "zod";
import requirementsData from "./requirements.json";

export const RequirementSchema = z.object({
  id: z.string().min(1),
  requirementText: z.string().min(1),
  source: z.string().min(1),
  category: z.string().min(1),
});

export type Requirement = z.infer<typeof RequirementSchema>;

const RequirementsArraySchema = z.array(RequirementSchema);

let cache: Requirement[] | null = null;

export function loadRequirements(): Requirement[] {
  if (cache) return cache;
  cache = RequirementsArraySchema.parse(requirementsData);
  return cache;
}

export function requirementCategories(): string[] {
  return [...new Set(loadRequirements().map((r) => r.category))].sort();
}
