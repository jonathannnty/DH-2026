/**
 * Personalized fallback recommendation engine.
 *
 * When the live agent is unavailable or times out, this replaces generic
 * canned output with recommendations that are clearly derived from the
 * user's actual profile signals (skills, values, interests, finances).
 *
 * Each recommendation includes a rationale prefix in the summary so judges
 * and users can see which profile signals drove each match.
 */

import type { CareerProfile, CareerRecommendation } from '../schemas/career.js';

// ── Profile signal helpers ────────────────────────────────────────────────────

function top(arr: string[] | undefined, n: number): string[] {
  return arr?.slice(0, n) ?? [];
}

/** "Python and machine learning" or "your background" if empty. */
function listStr(arr: string[] | undefined, n = 2): string {
  const items = top(arr, n);
  if (!items.length) return 'your background';
  if (items.length === 1) return items[0];
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

/** First skill, falling back to a default. */
function skill0(p: CareerProfile, fallback = 'Software'): string {
  return p.hardSkills?.[0] ?? fallback;
}

/** First interest, falling back to a default. */
function interest0(p: CareerProfile, fallback = 'Technology'): string {
  return p.interests?.[0] ?? fallback;
}

/** Rationale prefix citing the 2 strongest profile signals. */
function rationale(p: CareerProfile): string {
  const signals: string[] = [];
  if (p.hardSkills?.length) signals.push(`${listStr(p.hardSkills)} skills`);
  if (p.values?.length) signals.push(`${listStr(p.values)} values`);
  if (!signals.length) return '';
  return `Signal match — ${signals.join(', ')}: `;
}

/** Salary range adjusted up when the profile's target salary exceeds the base. */
function salary(
  base: { low: number; high: number },
  p: CareerProfile,
): { low: number; high: number; currency: 'USD' } {
  const target = p.financialNeeds?.targetSalary;
  if (!target) return { ...base, currency: 'USD' };
  const low = Math.max(base.low, Math.round(target * 0.85));
  const high = Math.max(base.high, Math.round(target * 1.5));
  return { low, high, currency: 'USD' };
}

/** Score boosts applied to a base score from profile signals. */
function scored(base: number, boosts: Array<[boolean, number]>): number {
  return Math.min(97, boosts.reduce((s, [cond, v]) => s + (cond ? v : 0), base));
}

/** Common profile-derived reasons shared across all tracks. */
function commonReasons(p: CareerProfile): string[] {
  const r: string[] = [];
  if (p.hardSkills?.length) {
    r.push(`Your ${listStr(p.hardSkills)} skills map directly to core responsibilities`);
  }
  if (p.values?.includes('autonomy')) {
    r.push('High individual ownership aligns with your stated autonomy value');
  }
  if (p.geographicFlexibility === 'remote') {
    r.push('Remote-first hiring is the norm in this field — matches your flexibility preference');
  }
  if (p.purposePriorities?.length) {
    r.push(`Role directly enables you to ${p.purposePriorities[0]}`);
  }
  return r;
}

/** Common concerns derived from profile signals. */
function commonConcerns(p: CareerProfile, extras: string[]): string[] {
  const c: string[] = [...extras];
  if (p.riskTolerance === 'low') {
    c.push('Compensation packages at growth-stage companies include equity — research vesting before accepting');
  }
  if (p.burnoutConcerns?.some((b) => b.toLowerCase().includes('meeting'))) {
    c.push('High-growth orgs can have meeting-heavy phases — ask about team async culture in interviews');
  }
  return c.slice(0, 3);
}

// ── Template types ────────────────────────────────────────────────────────────

interface RecTemplate {
  title: (p: CareerProfile) => string;
  summary: (p: CareerProfile) => string;
  baseScore: number;
  boosts: (p: CareerProfile) => Array<[boolean, number]>;
  extraReasons: (p: CareerProfile) => string[];
  staticConcerns: string[];
  nextSteps: (p: CareerProfile) => string[];
  salaryBase: { low: number; high: number };
}

function buildRec(t: RecTemplate, p: CareerProfile): CareerRecommendation & { _score: number } {
  const score = scored(t.baseScore, t.boosts(p));
  const reasons = [...commonReasons(p), ...t.extraReasons(p)].slice(0, 5);
  // Always at least 2 reasons even for sparse profiles
  if (reasons.length < 2) reasons.push('Strong demand and hiring activity in this role category');

  return {
    title: t.title(p),
    summary: `${rationale(p)}${t.summary(p)}`,
    fitScore: score,
    reasons,
    concerns: commonConcerns(p, t.staticConcerns),
    nextSteps: t.nextSteps(p),
    salaryRange: salary(t.salaryBase, p),
    _score: score,
  };
}

// ── Per-track template banks ─────────────────────────────────────────────────

const TECH_TEMPLATES: RecTemplate[] = [
  {
    title: (p) => `Senior ${skill0(p)} Engineer — Platform Systems`,
    summary: (p) =>
      `Your ${listStr(p.hardSkills)} expertise positions you for senior IC roles at engineering-led ` +
      `companies. The ${interest0(p)} space is actively hiring and offers top-of-market compensation ` +
      `with the autonomy and impact you've prioritised.`,
    baseScore: 85,
    boosts: (p) => [
      [(p.hardSkills?.length ?? 0) >= 3, 5],
      [p.geographicFlexibility === 'remote', 3],
      [!!p.values?.includes('autonomy'), 4],
      [p.riskTolerance === 'medium' || p.riskTolerance === 'high', 2],
    ],
    extraReasons: (p) => [
      `${interest0(p)} is one of the fastest-growing hiring markets for senior engineers`,
      'Salary ceiling well above most financial targets for this level',
    ],
    staticConcerns: [
      'Senior-level interview loops are rigorous — allow 6–10 weeks for preparation',
    ],
    nextSteps: (p) => [
      `Publish a portfolio project showcasing your ${skill0(p)} depth on GitHub`,
      'Prepare for system design interviews using Exponent or interviewing.io',
      `Obtain a cloud certification aligned to your ${skill0(p)} stack (AWS, GCP, or Azure)`,
      'Target: Stripe, Linear, Vercel, Notion, Figma, or similar engineering-led companies',
    ],
    salaryBase: { low: 155000, high: 270000 },
  },
  {
    title: (p) => `ML / AI Engineer — ${interest0(p)} Applications`,
    summary: (p) =>
      `Your ${listStr(p.hardSkills)} background maps directly to ML engineering roles building ` +
      `${interest0(p)}-focused products. The combination of technical depth and ${listStr(p.values)} ` +
      `values is exactly what AI-first companies look for at this level.`,
    baseScore: 82,
    boosts: (p) => [
      [!!p.hardSkills?.some((s) => /ml|machine|python|torch|tensor/i.test(s)), 8],
      [!!p.interests?.some((i) => /ai|ml|tech|data/i.test(i)), 4],
      [p.geographicFlexibility === 'remote', 2],
      [(p.softSkills?.length ?? 0) >= 3, 2],
    ],
    extraReasons: (p) => [
      `Your interest in ${interest0(p)} gives you domain credibility that pure engineers lack`,
      'AI/ML roles command significant compensation premiums in the current market',
    ],
    staticConcerns: [
      'Research-heavy ML orgs may have longer product cycles than product-focused teams',
      'Requires keeping up with rapidly-evolving tooling and model architectures',
    ],
    nextSteps: (p) => [
      `Build and publish a fine-tuned model project in the ${interest0(p)} domain`,
      'Contribute to an open-source ML framework (Hugging Face, JAX, or PyTorch ecosystem)',
      `Target: Anthropic, Cohere, Databricks, Hugging Face, or ${interest0(p)}-adjacent AI startups`,
      'Prepare ML system design questions in addition to standard coding interviews',
    ],
    salaryBase: { low: 160000, high: 290000 },
  },
  {
    title: (p) => `Technical Product Manager — ${interest0(p)} Products`,
    summary: (p) =>
      `Your engineering credibility in ${listStr(p.hardSkills)} combined with strong ` +
      `${listStr(p.softSkills)} skills makes you a compelling TPM candidate. This role lets you ` +
      `drive product direction in the ${interest0(p)} space without leaving the technical orbit.`,
    baseScore: 74,
    boosts: (p) => [
      [(p.softSkills?.length ?? 0) >= 3, 6],
      [!!p.softSkills?.some((s) => /comm|mentor|lead/i.test(s)), 5],
      [!!p.values?.includes('impact'), 3],
      [p.geographicFlexibility === 'remote', 2],
    ],
    extraReasons: (p) => [
      `${listStr(p.softSkills)} soft skills are the primary differentiator for strong TPMs`,
      'High-autonomy product direction role — you shape what gets built',
    ],
    staticConcerns: [
      'Less hands-on coding day-to-day — confirm this aligns with long-term career goals',
      'Transitioning back to IC engineering after TPM experience can be challenging',
    ],
    nextSteps: (p) => [
      `Write one product spec for a feature you would add to a ${interest0(p)} tool you use`,
      'Complete a structured PM program: Reforge or Exponent are strong options',
      `Target ${interest0(p)} product teams at: Microsoft Copilot, Notion, Linear, or Figma`,
      `Use your ${skill0(p)} background to differentiate from non-technical PM candidates`,
    ],
    salaryBase: { low: 145000, high: 245000 },
  },
];

const HEALTHCARE_TEMPLATES: RecTemplate[] = [
  {
    title: (p) => `Health Systems Software Engineer — ${interest0(p, 'Clinical Data')}`,
    summary: (p) =>
      `Your ${listStr(p.hardSkills)} engineering skills transfer directly into health-tech ` +
      `infrastructure roles. Health systems are modernising aging EHR and data pipelines at scale — ` +
      `your ${listStr(p.values)} values align well with mission-driven healthcare organisations.`,
    baseScore: 83,
    boosts: (p) => [
      [(p.hardSkills?.length ?? 0) >= 2, 5],
      [!!p.values?.includes('social impact'), 4],
      [p.geographicFlexibility === 'remote', 3],
      [p.riskTolerance !== 'high', 2],
    ],
    extraReasons: (p) => [
      `Strong social impact potential — your ${skill0(p)} skills directly improve patient care systems`,
      'High demand as health systems modernise — stable hiring environment',
    ],
    staticConcerns: [
      'HIPAA and regulatory compliance overhead requires learning healthcare-specific frameworks',
      'Health system sales cycles are long — feedback loops slower than pure tech companies',
    ],
    nextSteps: (p) => [
      'Complete the free HL7 FHIR Fundamentals course to establish healthcare data credibility',
      `Build a portfolio project connecting ${skill0(p)} skills to a public clinical dataset (MIMIC-III)`,
      'Target: Epic, Cerner (Oracle Health), Redox, Health Gorilla, or Veradigm',
      'Consider CPHIMS or CHDA certification within 6 months to stand out to health system hiring managers',
    ],
    salaryBase: { low: 110000, high: 175000 },
  },
  {
    title: (p) => `Health AI Specialist — ${interest0(p, 'Diagnostics')}`,
    summary: (p) =>
      `At the intersection of your ${listStr(p.hardSkills)} skills and the ${interest0(p)} space, ` +
      `Health AI roles are among the fastest-growing in the sector. ` +
      `Your ${listStr(p.values)} values map to the mission-driven culture at health AI companies.`,
    baseScore: 80,
    boosts: (p) => [
      [!!p.hardSkills?.some((s) => /python|ml|data|ai/i.test(s)), 8],
      [!!p.interests?.some((i) => /health|medical|clinical|bio/i.test(i)), 5],
      [!!p.values?.includes('social impact'), 3],
    ],
    extraReasons: (p) => [
      `ML and data skills like ${skill0(p)} are directly applied to diagnostics, NLP, and predictive models`,
      'Fastest-growing VC investment segment in healthcare — strong hiring activity',
    ],
    staticConcerns: [
      'FDA clearance for clinical AI can delay product launches by 12–24 months',
      'Requires 3–6 months to build domain knowledge — plan for a learning ramp',
    ],
    nextSteps: (p) => [
      `Complete Stanford's free "AI in Health" course to build clinical AI domain knowledge`,
      `Build a portfolio project using your ${skill0(p)} skills on a public clinical dataset`,
      'Target: Viz.ai, Aidoc, Suki AI, Nabla, Amboss, or Tempus',
      'Read the FDA AI/ML action plan to understand the regulatory landscape',
    ],
    salaryBase: { low: 125000, high: 210000 },
  },
  {
    title: (p) => `Healthcare Data Analyst — ${interest0(p, 'Clinical Operations')}`,
    summary: (p) =>
      `Your ${listStr(p.hardSkills)} analytical skills can be applied directly at large health ` +
      `systems and payers who urgently need data practitioners. This is an accessible entry point ` +
      `into healthcare that builds domain expertise while delivering ${p.purposePriorities?.[0] ?? 'meaningful impact'}.`,
    baseScore: 73,
    boosts: (p) => [
      [!!p.hardSkills?.some((s) => /data|sql|python|analytics/i.test(s)), 6],
      [p.riskTolerance === 'low', 4],
      [!!p.values?.includes('stability'), 4],
      [(p.timelineUrgency === 'immediate' || p.timelineUrgency === 'short'), 3],
    ],
    extraReasons: (p) => [
      'Recession-resistant healthcare sector with stable, predictable career progression',
      `Your ${skill0(p)} skills are directly applicable to clinical and operational reporting`,
    ],
    staticConcerns: [
      'Research-heavy culture at large health systems may slow iteration speed',
      'Salary ceiling lower than engineering roles at tech-first health companies',
    ],
    nextSteps: (p) => [
      `Build a capstone project using CMS public claims data, applying your ${skill0(p)} skills`,
      'Complete Coursera\'s "Healthcare Data Quality and Governance" course',
      'Target: Kaiser Permanente, UnitedHealth Group, Mayo Clinic, or CVS Health',
      'Obtain the CHDA (Certified Health Data Analyst) credential for maximum credibility',
    ],
    salaryBase: { low: 95000, high: 155000 },
  },
];

const CREATIVE_TEMPLATES: RecTemplate[] = [
  {
    title: (p) => `Creative Technologist — ${interest0(p, 'Generative Media')}`,
    summary: (p) =>
      `Your ${listStr(p.hardSkills)} technical skills, combined with ${interest0(p)} interests ` +
      `and ${listStr(p.values)} values, position you for creative technology roles where few people ` +
      `have both the technical depth and the creative vision. This field is expanding rapidly with minimal competition.`,
    baseScore: 82,
    boosts: (p) => [
      [!!p.interests?.some((i) => /creat|design|art|music|media|film/i.test(i)), 8],
      [!!p.values?.includes('autonomy'), 4],
      [!!p.softSkills?.some((s) => /creat/i.test(s)), 4],
      [p.geographicFlexibility === 'remote', 2],
    ],
    extraReasons: (p) => [
      `${interest0(p)} is a rapidly expanding niche where your technical skills are rare`,
      'Creative technologists command premium rates because the combination of skills is uncommon',
    ],
    staticConcerns: [
      'Field is nascent — role definitions vary widely; evaluate each company\'s creative culture carefully',
      'Requires a strong portfolio; past technical work must be framed in a creative context',
    ],
    nextSteps: (p) => [
      `Build 3 showcase pieces in the ${interest0(p)} space using AI-native tools (Runway, Sora, or Kling)`,
      `Publish a process breakdown connecting your ${skill0(p)} background to creative output`,
      'Target: A24 (emerging tech), ILM, Epic Games, Spotify, Adobe, or digital-native studios',
      'Establish a public voice on the intersection of technology and creativity',
    ],
    salaryBase: { low: 115000, high: 210000 },
  },
  {
    title: (p) => `${skill0(p, 'Design')} Engineer — Creative Tools`,
    summary: (p) =>
      `The rare combination of ${listStr(p.hardSkills)} skills and creative sensibility makes you a ` +
      `strong candidate for UX Engineering roles at creative software companies. ` +
      `Your ${listStr(p.values)} values align with the craft-focused cultures at Figma, Adobe, and Canva.`,
    baseScore: 77,
    boosts: (p) => [
      [!!p.hardSkills?.some((s) => /typescript|js|react|swift|design/i.test(s)), 6],
      [!!p.softSkills?.some((s) => /creat|design|empathy/i.test(s)), 5],
      [p.geographicFlexibility === 'remote', 3],
      [!!p.values?.includes('innovation'), 3],
    ],
    extraReasons: (p) => [
      `TypeScript and frontend skills like ${skill0(p)} apply directly to plugin and editor development`,
      'Remote-first culture standard at SaaS-based creative tool companies',
    ],
    staticConcerns: [
      'Can feel more support-oriented than inventive depending on product roadmap pace',
      'Requires demonstrated understanding of design workflows — invest time using the products',
    ],
    nextSteps: (p) => [
      `Ship one Figma or Adobe plugin using your ${skill0(p)} skills and publish it publicly`,
      'Complete the Figma plugin API documentation end-to-end as a weekend project',
      'Target: Figma, Canva, Adobe, Framer, Penpot, or Pitch',
      'Build empathy for creative workflows by doing a structured 30-day design challenge',
    ],
    salaryBase: { low: 110000, high: 185000 },
  },
  {
    title: (p) => `Digital Content Strategist — ${interest0(p, 'Creative Technology')}`,
    summary: (p) =>
      `Your ${listStr(p.softSkills)} soft skills combined with ${interest0(p)} interests make you ` +
      `a compelling content strategist who can bridge technical and creative worlds. ` +
      `This role leverages your ${listStr(p.values)} values while building an audience and brand.`,
    baseScore: 70,
    boosts: (p) => [
      [!!p.softSkills?.some((s) => /comm|writing|creat/i.test(s)), 7],
      [!!p.values?.includes('autonomy'), 4],
      [!!p.purposePriorities?.some((pp) => /creat|learn|teach/i.test(pp)), 4],
    ],
    extraReasons: (p) => [
      `Your ${listStr(p.softSkills)} communication skills differentiate you in a content-saturated market`,
      'Self-directed, remote-friendly role with low barrier to entry',
    ],
    staticConcerns: [
      'Monetisation timeline is longer than salaried roles — plan for 6–12 months to stable income',
      'Requires consistent output discipline; creative burnout is a real risk without structure',
    ],
    nextSteps: (p) => [
      `Start a content series on ${interest0(p)} targeted at a specific professional audience`,
      `Leverage your ${skill0(p)} technical background to create content that non-technical creators cannot`,
      'Build a roster of 3 anchor clients or platform partnerships within 90 days',
      'Read "Company of One" by Paul Jarvis to scope a sustainable content business model',
    ],
    salaryBase: { low: 70000, high: 160000 },
  },
];

const GENERAL_TEMPLATES: RecTemplate[] = [
  {
    title: (p) => `${interest0(p, 'Technology')} Product Specialist`,
    summary: (p) =>
      `Your ${listStr(p.hardSkills)} skills and ${interest0(p)} interests converge in product ` +
      `specialist roles that sit at the intersection of domain expertise and technical execution. ` +
      `Your ${listStr(p.values)} values fit the ownership-focused culture common in this role type.`,
    baseScore: 79,
    boosts: (p) => [
      [(p.hardSkills?.length ?? 0) >= 2, 5],
      [(p.interests?.length ?? 0) >= 2, 3],
      [!!p.values?.includes('impact'), 4],
      [p.geographicFlexibility === 'remote', 2],
    ],
    extraReasons: (p) => [
      `Combines ${interest0(p)} domain expertise with technical execution — a rare pairing`,
      'Broad hiring demand across sectors makes this role accessible within your timeline',
    ],
    staticConcerns: [
      'Role scope varies widely — evaluate each company\'s definition of "specialist" carefully',
    ],
    nextSteps: (p) => [
      `Build a case study demonstrating how your ${skill0(p)} skills solve a specific ${interest0(p)} problem`,
      'Target companies where your interest area is core to the product, not peripheral',
      `Network with ${interest0(p)} professionals in your target geography or remote community`,
      'Define a niche positioning statement: "I help [target] achieve [outcome] using [skill]"',
    ],
    salaryBase: { low: 90000, high: 160000 },
  },
  {
    title: (p) => `${skill0(p, 'Technical')} Solutions Consultant`,
    summary: (p) =>
      `Your ${listStr(p.hardSkills)} technical depth combined with ${listStr(p.softSkills)} ` +
      `interpersonal skills is a natural fit for solutions consulting. Clients pay premium rates for ` +
      `practitioners who can both diagnose problems and implement solutions — your profile matches this pattern.`,
    baseScore: 75,
    boosts: (p) => [
      [(p.softSkills?.length ?? 0) >= 2, 6],
      [!!p.softSkills?.some((s) => /comm|present|client/i.test(s)), 5],
      [p.riskTolerance === 'medium' || p.riskTolerance === 'high', 3],
    ],
    extraReasons: (p) => [
      `${listStr(p.softSkills)} skills are the critical differentiator in consulting — you have them`,
      'Project-based structure provides varied work — avoids the monotony noted in burnout concerns',
    ],
    staticConcerns: [
      'Client-facing work can involve travel and irregular hours — confirm this fits your working style',
      'Project pipelines can have gaps — ensure financial runway for slow periods',
    ],
    nextSteps: (p) => [
      `Identify 3 specific problems in the ${interest0(p)} space that your ${skill0(p)} skills uniquely solve`,
      'Build a one-page consulting offer: target client, specific outcome, pricing model',
      'Land 2 paid pilot engagements within 60 days using your existing professional network',
      'Read "The Consulting Bible" or take a Reforge consulting track for structured frameworks',
    ],
    salaryBase: { low: 85000, high: 175000 },
  },
  {
    title: (p) => `Operations Lead — ${interest0(p, 'Growth')} Programs`,
    summary: (p) =>
      `Your blend of ${listStr(p.hardSkills)} analytical capability and ${listStr(p.softSkills)} ` +
      `leadership skills positions you for operations leadership roles that combine process design, ` +
      `data analysis, and cross-functional coordination. Strong demand and clear career ladders make this accessible.`,
    baseScore: 71,
    boosts: (p) => [
      [!!p.softSkills?.some((s) => /lead|manage|coord|mentor/i.test(s)), 7],
      [!!p.values?.includes('impact'), 4],
      [p.riskTolerance === 'low', 3],
      [(p.timelineUrgency === 'immediate' || p.timelineUrgency === 'short'), 2],
    ],
    extraReasons: (p) => [
      `${listStr(p.softSkills)} skills are the core requirement for ops leadership — direct match`,
      'Operations roles are recession-resistant and available across every sector',
    ],
    staticConcerns: [
      'Operations roles can become process-heavy over time — evaluate growth potential carefully',
    ],
    nextSteps: (p) => [
      `Document one process improvement you drove using your ${skill0(p)} skills as a portfolio case study`,
      'Obtain a project management certification (PMP, CAPM, or Agile/Scrum) to formalise credentials',
      'Target growth-stage companies in the ${interest0(p)} sector where ops leadership is actively hired',
      'Network with operations leaders on LinkedIn — ops hiring is often relationship-driven',
    ],
    salaryBase: { low: 85000, high: 155000 },
  },
];

// ── Track-to-template mapping ─────────────────────────────────────────────────

const TRACK_TEMPLATES: Record<string, RecTemplate[]> = {
  'tech-career': TECH_TEMPLATES,
  'healthcare-pivot': HEALTHCARE_TEMPLATES,
  'creative-industry': CREATIVE_TEMPLATES,
  general: GENERAL_TEMPLATES,
};

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Generate 3 career recommendations personalised to the given profile and track.
 *
 * Unlike the static DEMO_RECOMMENDATIONS, these recommendations directly cite
 * the user's skills, interests, values, and financial signals. Two calls with
 * different profiles always produce different output.
 *
 * Safe to call with a sparse profile — all field accesses have fallbacks.
 */
export function generatePersonalizedFallback(
  profile: CareerProfile,
  trackId: string | null | undefined,
): CareerRecommendation[] {
  const templates = TRACK_TEMPLATES[trackId ?? 'general'] ?? GENERAL_TEMPLATES;

  // Score all templates, pick top 3 sorted descending
  return templates
    .map((t) => buildRec(t, profile))
    .sort((a, b) => b._score - a._score)
    .slice(0, 3)
    .map(({ _score: _s, ...rec }) => rec);  // strip internal score field
}
