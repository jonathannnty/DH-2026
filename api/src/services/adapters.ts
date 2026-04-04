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

// Register demo adapters for all built-in tracks
registerAdapter(new DemoAdapter('general'));
registerAdapter(new DemoAdapter('tech-career'));
registerAdapter(new DemoAdapter('healthcare-pivot'));
registerAdapter(new DemoAdapter('creative-industry'));
