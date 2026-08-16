export type EligibilityTarget =
  | "allStudents"
  | "hscBatch"
  | "academic"
  | "admission";

export type EligibilityRule =
  | { target: "allStudents" }
  | { target: "hscBatch"; batch: string }
  | { target: "academic" }
  | { target: "admission" };

export type Eligibility = {
  mode: "any" | "all";
  rules: EligibilityRule[];
};

export const eligibilityTargetLabels: Record<EligibilityTarget, string> = {
  allStudents: "All Registered Students",
  hscBatch: "Specific HSC Batch",
  academic: "Academic Students",
  admission: "Admission Students",
};

export function describeEligibility(eligibility: Eligibility): string {
  if (eligibility.rules.length === 0) {
    return "Not set";
  }

  const parts = eligibility.rules.map((rule) => {
    if (rule.target === "hscBatch") {
      return `${rule.batch} Students`;
    }
    return eligibilityTargetLabels[rule.target];
  });

  const joiner = eligibility.mode === "all" ? " + " : " or ";
  return parts.join(joiner);
}