// The mandatory-attendance cohort split: each cohort section (G–L) is split into two halves
// for group-level admin actions (e.g. bulk manual booking). Distinct from `studyGroup`, which
// has ~13 finer-grained subgroups per section — same "letter+number" style, different meaning.

export const COHORT_SPLITS = [
  "G1", "G2",
  "H1", "H2",
  "I1", "I2",
  "J1", "J2",
  "K1", "K2",
  "L1", "L2",
] as const;

export type CohortSplitValue = (typeof COHORT_SPLITS)[number];

export function isCohortSplitValue(value: string): value is CohortSplitValue {
  return (COHORT_SPLITS as readonly string[]).includes(value);
}
