/**
 * Rubric definitions and evaluation criteria for InterviewIQ intelligence assessments.
 * Fulfills Owner B requirements: AI-003, AI-004, B07.
 */

export interface RubricDimension {
  name: "correctness" | "reasoning" | "clarity";
  description: string;
  weight: string;
  levels: Record<0 | 1 | 2 | 3 | 4 | 5, string>;
}

export const INTERVIEW_RUBRIC: Record<"correctness" | "reasoning" | "clarity", RubricDimension> = {
  correctness: {
    name: "correctness",
    description: "Factual and technical accuracy of the proposed solution, mechanisms, and trade-offs.",
    weight: "Core technical bar (0-5)",
    levels: {
      0: "Completely inaccurate, irrelevant, or describes an actively harmful antipattern.",
      1: "Major conceptual flaws; misunderstands core platform primitives or fundamental mechanics.",
      2: "Partially correct for trivial cases, but misses essential failure modes or critical components.",
      3: "Technically sound for standard scenarios; covers the primary happy path and common errors correctly.",
      4: "Accurate and robust; addresses edge cases, concurrency, failure modes, and platform realities.",
      5: "Deeply accurate and comprehensive; accounts for distributed failure modes, performance, and subtle edge cases.",
    },
  },
  reasoning: {
    name: "reasoning",
    description: "Quality of logical deduction, justification of design choices, and trade-off analysis.",
    weight: "Engineering judgment (0-5)",
    levels: {
      0: "No explanation or justification provided; arbitrary assertions without rationale.",
      1: "Superficial claims ('it is faster/better') without technical justification or mechanism explanation.",
      2: "Basic rationale given, but fails to evaluate trade-offs or alternative approaches.",
      3: "Clear, structured reasoning explaining why this approach was chosen and acknowledging key trade-offs.",
      4: "Strong comparative trade-off analysis (e.g. consistency vs latency, memory vs CPU, complexity vs safety).",
      5: "Exceptional systems thinking; analyzes second-order effects, blast radius, operational burden, and failure cascades.",
    },
  },
  clarity: {
    name: "clarity",
    description: "Structure, conciseness, precision of terminology, and ease of understanding.",
    weight: "Communication quality (0-5)",
    levels: {
      0: "Incoherent, self-contradictory, or unreadable.",
      1: "Disorganized, uses incorrect terminology, or requires significant effort to decipher.",
      2: "Somewhat understandable but vague, rambles, or relies on hand-waving.",
      3: "Clear, well-structured explanation using standard industry terminology appropriately.",
      4: "Crisp, concise, and structured logically (e.g., problem -> approach -> trade-offs -> verification).",
      5: "Exemplary technical communication; conveys complex architectural concepts with maximum signal-to-noise ratio.",
    },
  },
};

/**
 * Prompt instruction summary used by model adapters to ensure calibrated scoring.
 */
export const RUBRIC_PROMPT_GUIDANCE = `
Scoring Rubric (0 to 5 for each dimension):
- correctness:
  * 0: Harmful or completely wrong
  * 1: Major technical inaccuracies or critical misconceptions
  * 2: Partially correct, misses key components or failure handling
  * 3: Sound and correct for standard usage and primary error cases
  * 4: Comprehensive, covers edge cases, concurrency, and reliability
  * 5: Production-grade depth, distributed nuance, and subtle edge cases
- reasoning:
  * 0: No reasoning or justification
  * 1: Superficial buzzwords without explanation
  * 2: Basic 'why' given without trade-off evaluation
  * 3: Step-by-step logic explaining choices and trade-offs
  * 4: Strong comparative analysis of alternatives and constraints
  * 5: Deep systems thinking, blast radius, and failure domain analysis
- clarity:
  * 0: Incoherent or contradictory
  * 1: Disorganized, confusing terminology
  * 2: Understandable but rambling or imprecise
  * 3: Professional, structured, standard terminology
  * 4: Concise, high-density, logical progression
  * 5: Masterful architectural articulation
`.trim();
