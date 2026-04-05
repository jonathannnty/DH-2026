import type { SponsorTrack, SessionResponse, CareerRecommendation } from '@/schemas/career';

export const TRACK_TECH: SponsorTrack = {
  id: 'tech-career',
  name: 'Tech Career Accelerator',
  sponsor: 'TechCorp',
  description: 'Focused on software engineering and data science paths.',
  icon: 'code',
  color: '#06b6d4',
  tags: ['tech', 'engineering'],
};

export const TRACK_GENERAL: SponsorTrack = {
  id: 'general',
  name: 'General Career Advising',
  sponsor: 'PathFinder AI',
  description: 'Default 12-dimension career assessment.',
  icon: 'compass',
  color: '#6366f1',
  tags: [],
};

export const SESSION_INTAKE: SessionResponse = {
  id: 'test-session-001',
  status: 'intake',
  trackId: 'tech-career',
  intakeComplete: false,
  profile: {},
  messages: [
    {
      id: 'msg-1',
      role: 'assistant',
      content: "Hi! Let's discover your ideal career path. What are your main interests or passions?",
      timestamp: '2026-04-04T00:00:00.000Z',
    },
  ],
  createdAt: '2026-04-04T00:00:00.000Z',
  updatedAt: '2026-04-04T00:00:00.000Z',
};

export const SESSION_INTAKE_COMPLETE: SessionResponse = {
  ...SESSION_INTAKE,
  intakeComplete: true,
};

export const SESSION_COMPLETE: SessionResponse = {
  id: 'test-session-002',
  status: 'complete',
  trackId: 'tech-career',
  intakeComplete: true,
  profile: {
    interests: ['technology', 'AI'],
    hardSkills: ['Python', 'TypeScript'],
  },
  messages: SESSION_INTAKE.messages,
  createdAt: '2026-04-04T00:00:00.000Z',
  updatedAt: '2026-04-04T00:00:10.000Z',
};

export const SESSION_ANALYZING: SessionResponse = {
  ...SESSION_COMPLETE,
  id: 'test-session-003',
  status: 'analyzing',
};

export const RECOMMENDATIONS: CareerRecommendation[] = [
  {
    title: 'AI/ML Engineer — EdTech',
    summary: 'Build intelligent tutoring systems using ML expertise.',
    fitScore: 92,
    reasons: ['Direct ML skills match', 'Remote-friendly'],
    concerns: ['Startup instability'],
    nextSteps: ['Build a portfolio project', 'Target Duolingo or Khan Academy'],
    salaryRange: { low: 130000, high: 195000, currency: 'USD' },
  },
  {
    title: 'Developer Advocate',
    summary: 'Teach developers through tutorials and talks.',
    fitScore: 82,
    reasons: ['Combines tech and communication'],
    concerns: ['Requires travel'],
    nextSteps: ['Start a technical blog'],
    salaryRange: { low: 110000, high: 160000, currency: 'USD' },
  },
];
