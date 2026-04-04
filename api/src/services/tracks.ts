import type { SponsorTrack } from '../schemas/career.js';

/**
 * Sponsor track registry — single source of truth for all available
 * sponsor tracks. Each track defines a themed career-advising experience
 * with sponsor branding, custom recommendation tags, and (optionally)
 * an integration adapter for sponsor-specific data enrichment.
 */
export const TRACK_REGISTRY: SponsorTrack[] = [
  {
    id: 'general',
    name: 'General Career Advising',
    sponsor: 'PathFinder AI',
    description:
      'Our default 12-dimension career assessment — no sponsor focus, just you.',
    icon: 'compass',
    color: '#6366f1',
    tags: [],
  },
  {
    id: 'tech-career',
    name: 'Tech Career Accelerator',
    sponsor: 'TechCorp',
    description:
      'Focused on software engineering, data science, and tech leadership paths with industry salary benchmarks.',
    icon: 'code',
    color: '#06b6d4',
    tags: ['tech', 'engineering', 'data'],
  },
  {
    id: 'healthcare-pivot',
    name: 'Healthcare Career Pivot',
    sponsor: 'HealthBridge',
    description:
      'For professionals transitioning into or within healthcare — clinical, health-tech, and health administration.',
    icon: 'heart-pulse',
    color: '#10b981',
    tags: ['healthcare', 'health-tech', 'clinical'],
  },
  {
    id: 'creative-industry',
    name: 'Creative Industry Paths',
    sponsor: 'CreativeForge',
    description:
      'Design, media, content, and arts-adjacent careers with portfolio-building guidance.',
    icon: 'palette',
    color: '#f59e0b',
    tags: ['creative', 'design', 'media'],
  },
];

/** Lookup a track by ID. Returns undefined if not found. */
export function getTrack(trackId: string): SponsorTrack | undefined {
  return TRACK_REGISTRY.find((t) => t.id === trackId);
}

/** Validate that a trackId exists. */
export function isValidTrack(trackId: string): boolean {
  return TRACK_REGISTRY.some((t) => t.id === trackId);
}
