import type { CareerProfile, CareerRecommendation } from '../schemas/career.js';

/**
 * Sponsor integration adapter interface.
 * Each sponsor track can optionally provide an adapter that enriches
 * recommendations with sponsor-specific data (salary benchmarks,
 * job listings, certifications, etc.).
 */
export interface SponsorAdapter {
  /** Unique track ID this adapter serves */
  trackId: string;

  /**
   * Enrich recommendations with sponsor-specific data.
   * Called after the base recommendation engine produces results.
   * Returns the enriched recommendations (may modify in place).
   */
  enrich(
    profile: CareerProfile,
    recommendations: CareerRecommendation[],
  ): Promise<CareerRecommendation[]>;

  /** Check if the adapter's external dependencies are reachable. */
  healthCheck(): Promise<boolean>;
}

// ─── Shared helpers ────────────────────────────────────────────────

function appendStep(rec: CareerRecommendation, step: string): CareerRecommendation {
  return { ...rec, nextSteps: [...rec.nextSteps, step] };
}

function clampSalary(
  rec: CareerRecommendation,
  marketLow: number,
  marketHigh: number,
): CareerRecommendation {
  if (!rec.salaryRange) return rec;
  return {
    ...rec,
    salaryRange: {
      low: Math.max(rec.salaryRange.low, marketLow),
      high: Math.max(rec.salaryRange.high, marketHigh),
      currency: 'USD',
    },
  };
}

// ─── Tech Career adapter ───────────────────────────────────────────

/**
 * Tech Career track enrichment.
 * Ensures salary ranges reflect current engineering market rates,
 * injects tech-specific certifications, and appends curated company
 * lists derived from the profile's skill stack.
 */
export class TechCareerAdapter implements SponsorAdapter {
  trackId = 'tech-career';

  async enrich(
    profile: CareerProfile,
    recs: CareerRecommendation[],
  ): Promise<CareerRecommendation[]> {
    return recs.map((rec, i) => {
      let enriched = rec;

      // Apply tech market salary floor: engineering roles skew high
      enriched = clampSalary(enriched, 160_000, 280_000);

      // Top recommendation gets a targeted company + cert step
      if (i === 0) {
        const hasML = profile.hardSkills?.some((s) =>
          /ml|machine|pytorch|torch|tensor|python/i.test(s),
        );
        const cert = hasML
          ? 'AWS Certified Machine Learning – Specialty or Google Professional ML Engineer cert'
          : 'AWS Solutions Architect Associate or CKAD (Kubernetes for Developers)';

        enriched = appendStep(
          enriched,
          `TechCorp Track — obtain ${cert} within 90 days to signal cloud-native depth to hiring managers`,
        );
        enriched = appendStep(
          enriched,
          `Top companies actively hiring for this profile: Anthropic, Stripe, Figma, Databricks, Vercel`,
        );
      }

      // Second rec: add a relevant open-source contribution nudge
      if (i === 1) {
        enriched = appendStep(
          enriched,
          `TechCorp Track — contribute a meaningful PR to an open-source project in your primary stack to accelerate referrals`,
        );
      }

      return enriched;
    });
  }

  async healthCheck(): Promise<boolean> {
    return true; // No external dependencies
  }
}

// ─── Healthcare Pivot adapter ──────────────────────────────────────

/**
 * Healthcare Pivot track enrichment.
 * Adds healthcare-specific certifications, regulatory context,
 * and curated health-tech company lists based on the user's background.
 */
export class HealthcarePivotAdapter implements SponsorAdapter {
  trackId = 'healthcare-pivot';

  async enrich(
    profile: CareerProfile,
    recs: CareerRecommendation[],
  ): Promise<CareerRecommendation[]> {
    return recs.map((rec, i) => {
      let enriched = rec;

      // Healthcare engineering roles have lower salary floors than pure tech
      // but still well above general market — clamp to realistic band
      enriched = clampSalary(enriched, 110_000, 180_000);

      if (i === 0) {
        const hasData = profile.hardSkills?.some((s) =>
          /data|python|sql|analytics/i.test(s),
        );
        const cert = hasData
          ? 'CHDA (Certified Health Data Analyst)'
          : 'CPHIMS (Certified Professional in Health Informatics)';

        enriched = appendStep(
          enriched,
          `HealthBridge Track — obtain ${cert} within 6 months; it\'s the single fastest credibility signal for health system hiring managers`,
        );
        enriched = appendStep(
          enriched,
          `Top health-tech companies actively hiring: Epic, Cerner (Oracle Health), Viz.ai, Tempus, Aidoc, Suki AI`,
        );
      }

      if (i === 1) {
        enriched = appendStep(
          enriched,
          `HealthBridge Track — complete the free HL7 FHIR Fundamentals course to demonstrate healthcare data interoperability knowledge`,
        );
      }

      return enriched;
    });
  }

  async healthCheck(): Promise<boolean> {
    return true;
  }
}

// ─── Creative Industry adapter ─────────────────────────────────────

/**
 * Creative Industry track enrichment.
 * Injects portfolio-building steps, AI creative tool certifications,
 * and studio / agency company targets from the creative-tech market.
 */
export class CreativeIndustryAdapter implements SponsorAdapter {
  trackId = 'creative-industry';

  async enrich(
    profile: CareerProfile,
    recs: CareerRecommendation[],
  ): Promise<CareerRecommendation[]> {
    return recs.map((rec, i) => {
      let enriched = rec;

      // Creative roles have wide salary variance — ensure floor is realistic
      enriched = clampSalary(enriched, 90_000, 180_000);

      if (i === 0) {
        const hasCode = profile.hardSkills?.some((s) =>
          /python|typescript|javascript|react|swift/i.test(s),
        );
        const portfolioStep = hasCode
          ? 'Build a coded generative art or interactive experience project and publish it publicly'
          : 'Build 5 portfolio pieces using AI creative tools (Runway, Midjourney, Sora) and publish a process breakdown';

        enriched = appendStep(
          enriched,
          `CreativeForge Track — ${portfolioStep}`,
        );
        enriched = appendStep(
          enriched,
          `Top creative studios / companies actively hiring: Adobe, Figma, Spotify, ILM, A24, Epic Games, Canva`,
        );
      }

      if (i === 1) {
        enriched = appendStep(
          enriched,
          `CreativeForge Track — complete the Adobe Creative Cloud certification path or Figma\'s official design education program to validate creative tool depth`,
        );
      }

      return enriched;
    });
  }

  async healthCheck(): Promise<boolean> {
    return true;
  }
}

// ─── Demo adapter (no external calls) ─────────────────────────────

/**
 * Passthrough adapter for tracks without a real integration.
 * Returns recommendations unmodified. Always healthy.
 */
export class DemoAdapter implements SponsorAdapter {
  trackId: string;

  constructor(trackId: string) {
    this.trackId = trackId;
  }

  async enrich(
    _profile: CareerProfile,
    recommendations: CareerRecommendation[],
  ): Promise<CareerRecommendation[]> {
    return recommendations;
  }

  async healthCheck(): Promise<boolean> {
    return true;
  }
}

// ─── Adapter registry ─────────────────────────────────────────────

const adapters = new Map<string, SponsorAdapter>();

/** Register an adapter for a given track. */
export function registerAdapter(adapter: SponsorAdapter): void {
  adapters.set(adapter.trackId, adapter);
}

/** Get the adapter for a track. Falls back to DemoAdapter. */
export function getAdapter(trackId: string): SponsorAdapter {
  return adapters.get(trackId) ?? new DemoAdapter(trackId);
}

// Register all track adapters
registerAdapter(new TechCareerAdapter());
registerAdapter(new HealthcarePivotAdapter());
registerAdapter(new CreativeIndustryAdapter());
registerAdapter(new DemoAdapter('general'));
