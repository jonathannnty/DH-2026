import type { CareerProfile, CareerRecommendation } from '../schemas/career.js';

/**
 * Demo script: deterministic user inputs that walk through all 12 intake
 * steps with realistic answers. Used by integration tests and the live
 * demo so the happy path is fully predictable.
 */
export const DEMO_INPUTS: string[] = [
  'technology, artificial intelligence, music production, education',
  'autonomy, innovation, social impact',
  'independent deep-focus with occasional collaboration',
  'Python, TypeScript, machine learning, data analysis, audio engineering',
  'communication, problem-solving, mentoring, creativity',
  'medium — open to moderate risk',
  'minimum salary $75,000, target salary $120,000, no debt',
  'remote — work from anywhere',
  "bachelor's in Computer Science",
  'short — within 6 months',
  'helping people learn, building things that matter, creative expression',
  'open-plan offices, constant meetings, micromanagement',
];

/**
 * The exact profile the demo inputs produce through the intake engine.
 * Tests assert against this to catch extraction regressions.
 */
export const DEMO_EXPECTED_PROFILE: CareerProfile = {
  interests: ['technology', 'artificial intelligence', 'music production', 'education'],
  values: ['autonomy', 'innovation', 'social impact'],
  workingStyle: 'independent deep-focus with occasional collaboration',
  hardSkills: ['Python', 'TypeScript', 'machine learning', 'data analysis', 'audio engineering'],
  softSkills: ['communication', 'problem-solving', 'mentoring', 'creativity'],
  riskTolerance: 'medium',
  financialNeeds: {
    minimumSalary: 75000,
    targetSalary: 120000,
    hasDebt: false,
  },
  geographicFlexibility: 'remote',
  educationLevel: "bachelor's in Computer Science",
  timelineUrgency: 'short',
  purposePriorities: ['helping people learn', 'building things that matter', 'creative expression'],
  burnoutConcerns: ['open-plan offices', 'constant meetings', 'micromanagement'],
};

/**
 * Canned recommendations returned by demo mode when analysis "completes".
 * These are the default (general track) recommendations.
 */
export const DEMO_RECOMMENDATIONS: CareerRecommendation[] = [
  {
    title: 'AI/ML Engineer — EdTech',
    summary:
      'Build intelligent tutoring systems and adaptive learning platforms. ' +
      'Combines your ML expertise with your passion for education and helping people learn.',
    fitScore: 92,
    reasons: [
      'Direct application of Python and ML skills',
      'Aligns with education interest and social impact values',
      'Remote-friendly roles widely available',
      'Strong demand pushes salaries well above your target',
    ],
    concerns: [
      'EdTech companies can have startup-level instability',
      'May require some collaborative meetings despite preference for deep-focus',
    ],
    nextSteps: [
      'Build a portfolio project: an adaptive quiz engine using spaced repetition + ML',
      'Target companies: Duolingo, Khan Academy, Coursera, Age of Learning',
      'Obtain AWS ML Specialty or Google ML Engineer certification',
    ],
    salaryRange: { low: 130000, high: 195000, currency: 'USD' },
  },
  {
    title: 'Creative Technologist — Audio/Music AI',
    summary:
      'Work at the intersection of audio engineering, AI, and creative tools. ' +
      'Design ML models for music generation, audio processing, or sound design.',
    fitScore: 88,
    reasons: [
      'Unique blend of audio engineering + ML skills',
      'High autonomy roles in small creative-tech teams',
      'Directly serves creative expression purpose priority',
      'Growing market with moderate-risk profile matching your tolerance',
    ],
    concerns: [
      'Niche field — fewer open positions',
      'Some roles skew toward research, which may not ship product',
    ],
    nextSteps: [
      'Contribute to open-source audio ML projects (e.g. Magenta, Audiocraft)',
      'Target companies: Spotify, Adobe, Splice, Native Instruments, Stability AI',
      'Publish a blog post or demo showing music + ML work',
    ],
    salaryRange: { low: 120000, high: 175000, currency: 'USD' },
  },
  {
    title: 'Developer Advocate — AI Platform',
    summary:
      'Teach developers how to use AI/ML platforms through tutorials, talks, and sample code. ' +
      'Leverages your communication and mentoring skills alongside technical depth.',
    fitScore: 82,
    reasons: [
      'Combines technical skills with communication and mentoring strengths',
      'High autonomy — self-directed content creation',
      'Remote-first roles are the norm',
      'Helps people learn (core purpose priority)',
    ],
    concerns: [
      'Requires public speaking and travel for conferences',
      'Can feel performative if you prefer heads-down work',
      'Salary ceiling lower than pure engineering',
    ],
    nextSteps: [
      'Start a technical blog or YouTube channel on AI topics',
      'Give a talk at a local meetup or virtual conference',
      'Target companies: Anthropic, OpenAI, Hugging Face, Vercel',
    ],
    salaryRange: { low: 110000, high: 160000, currency: 'USD' },
  },
];

/**
 * Track-specific canned recommendations keyed by trackId.
 * Falls back to DEMO_RECOMMENDATIONS for unknown or general tracks.
 */
export const TRACK_RECOMMENDATIONS: Record<string, CareerRecommendation[]> = {
  general: DEMO_RECOMMENDATIONS,

  'tech-career': [
    {
      title: 'Staff ML Engineer — Foundation Models',
      summary:
        'Lead the design and productionization of large-scale ML systems at a frontier AI lab or ' +
        'hyperscaler. Your Python depth, systems instinct, and remote work style are direct fits.',
      fitScore: 94,
      reasons: [
        'Python and ML skills are the exact requirement',
        'Staff-level roles offer near-total technical autonomy',
        'Top-of-market compensation — well above your $120K target',
        'Fully remote-first at most frontier labs',
        'High social impact: model quality affects millions of users',
      ],
      concerns: [
        'Extremely competitive hiring bar; portfolio project essential',
        'Fast-paced roadmaps may cut into deep-focus work',
      ],
      nextSteps: [
        'Publish or contribute to an open-source ML framework (e.g. JAX, Triton)',
        'Solve ≥5 hard LeetCode problems; review system-design ML interview questions',
        'Target: Anthropic, DeepMind, OpenAI, Mistral, Cohere, Google Brain',
      ],
      salaryRange: { low: 250000, high: 500000, currency: 'USD' },
    },
    {
      title: 'Senior Software Engineer — AI Infrastructure',
      summary:
        'Build the distributed training and serving infra that makes AI products work at scale. ' +
        'Your TypeScript and Python breadth maps to full-stack ML platform roles.',
      fitScore: 89,
      reasons: [
        'Combines software engineering with ML at the infrastructure layer',
        'High-autonomy, remote-friendly positions common at infra-focused teams',
        'Shorter hiring cycle than research roles',
        'Strong salary growth as AI infra becomes mission-critical',
      ],
      concerns: [
        'Requires knowledge of distributed systems (Kubernetes, Ray, gRPC)',
        'Less direct "help people learn" mission alignment',
      ],
      nextSteps: [
        'Complete the Ray or Kubernetes "Certified" paths (free self-paced)',
        'Build a side project deploying a fine-tuned model as a scalable API',
        'Target: Databricks, Anyscale, Modal, Replicate, Scale AI',
      ],
      salaryRange: { low: 180000, high: 310000, currency: 'USD' },
    },
    {
      title: 'Technical Product Manager — AI/ML Products',
      summary:
        'Shape the roadmap of AI-powered products using your engineering credibility and ' +
        'communication strengths. Ideal if you want broader impact without writing production code full-time.',
      fitScore: 81,
      reasons: [
        'Leverages mentoring, communication, and systems-thinking skills',
        'Remote-first roles widely available at AI-first companies',
        'High autonomy in setting product direction',
        'Growing demand as every company adds AI features',
      ],
      concerns: [
        'Less hands-on coding — may feel disconnected from technical work',
        'Harder to transition back to IC engineering after PM experience',
        'Salary upside lower than Staff IC at top companies',
      ],
      nextSteps: [
        'Take a free PM course (Reforge, Exponent) to learn structured frameworks',
        'Write one product spec for a feature you\'d add to an AI tool you use',
        'Target: Microsoft Copilot, Notion AI, Linear, Figma, Retool product teams',
      ],
      salaryRange: { low: 150000, high: 250000, currency: 'USD' },
    },
  ],

  'healthcare-pivot': [
    {
      title: 'Clinical Informatics Engineer',
      summary:
        'Design and maintain the data systems that clinicians use to make decisions — ' +
        'EHR integrations, HL7/FHIR pipelines, and clinical decision support tools.',
      fitScore: 90,
      reasons: [
        'Direct match for engineering skills in a healthcare context',
        'Strong social impact — patient safety and care quality',
        'Remote-friendly roles increasingly common post-COVID',
        'High demand as health systems modernize aging infrastructure',
      ],
      concerns: [
        'Regulatory burden (HIPAA, ONC certification) adds compliance overhead',
        'Long sales cycles at health systems slow feedback loops',
      ],
      nextSteps: [
        'Complete the HL7 FHIR Fundamentals free online course',
        'Target: Epic, Cerner (Oracle Health), Veradigm, Redox, Health Gorilla',
        'Obtain CHDA or CPHIMS certification for credibility boost',
      ],
      salaryRange: { low: 110000, high: 165000, currency: 'USD' },
    },
    {
      title: 'Health AI Product Engineer',
      summary:
        'Build AI products for diagnostics, clinical documentation, or patient engagement. ' +
        'Combines your ML skills with healthcare domain expertise.',
      fitScore: 86,
      reasons: [
        'Fastest-growing segment in health-tech investment',
        'ML skills translate directly to diagnostic AI, NLP, and predictive models',
        'Mission-driven teams with direct patient impact',
      ],
      concerns: [
        'FDA clearance process for clinical AI can delay product launches',
        'Requires healthcare literacy — plan 3–6 months to build domain knowledge',
      ],
      nextSteps: [
        'Read the FDA AI/ML action plan and Stanford\'s "AI in Health" free course',
        'Target: Viz.ai, Aidoc, Suki AI, Nabla, Amboss, Tempus',
        'Build a portfolio project using a public clinical dataset (MIMIC-III)',
      ],
      salaryRange: { low: 130000, high: 210000, currency: 'USD' },
    },
    {
      title: 'Healthcare Data Scientist',
      summary:
        'Turn clinical and operational data into insights that improve care and reduce cost. ' +
        'A strong bridge role for engineers transitioning into health systems or payers.',
      fitScore: 79,
      reasons: [
        'Python and data analysis skills map directly',
        'Urgent demand at large health systems and payers',
        'Highly stable employment — recession-resistant sector',
      ],
      concerns: [
        'Research-heavy culture may slow shipping cadence',
        'Salary ceiling lower than engineering roles at tech-first health companies',
      ],
      nextSteps: [
        'Complete Coursera\'s "Healthcare Data Quality and Governance" course',
        'Target: Kaiser Permanente, UnitedHealth Group, Mayo Clinic, CVS Health',
        'Build a capstone project using CMS public claims data',
      ],
      salaryRange: { low: 100000, high: 155000, currency: 'USD' },
    },
  ],

  'creative-industry': [
    {
      title: 'AI Creative Director — Generative Media',
      summary:
        'Lead creative teams that produce AI-generated content, visual effects, or interactive ' +
        'experiences. Merges your technical fluency with your creative expression priorities.',
      fitScore: 91,
      reasons: [
        'High autonomy — directs both creative vision and technical execution',
        'Directly serves creative expression as core purpose priority',
        'Rapidly expanding field with few experienced practitioners',
        'Remote-friendly at digital-native studios',
      ],
      concerns: [
        'Field is nascent — role definitions are still fluid',
        'Requires a strong portfolio; past "traditional" work may not transfer directly',
      ],
      nextSteps: [
        'Build 3 showcase pieces using Runway, Kling, or Sora workflows',
        'Target: A24 (emerging tech division), Lionsgate, ILM, Jam City, Epic Games',
        'Publish a process breakdown on Medium or Twitter to establish voice',
      ],
      salaryRange: { low: 120000, high: 200000, currency: 'USD' },
    },
    {
      title: 'UX Engineer — Creative Tools',
      summary:
        'Build the interfaces that creative professionals use daily — in Figma, Adobe, Canva, or ' +
        'emerging AI design tools. Sits at the exact edge of engineering and design craft.',
      fitScore: 85,
      reasons: [
        'TypeScript skills apply directly to plugin and editor development',
        'High empathy for creative workflows bridges engineering and design teams',
        'Strong remote culture at SaaS-based creative tool companies',
      ],
      concerns: [
        'Can feel more support-oriented than inventive if the product roadmap is slow',
        'Salary ceiling lower than core product engineering',
      ],
      nextSteps: [
        'Ship one Figma or Adobe plugin and publish it publicly',
        'Target: Figma, Canva, Adobe, Framer, Penpot, Pitch',
        'Complete the Figma plugin API docs end to end as a weekend project',
      ],
      salaryRange: { low: 115000, high: 175000, currency: 'USD' },
    },
    {
      title: 'Founder — AI Creative Studio',
      summary:
        'Start a small studio producing AI-assisted creative services or tools for other creators. ' +
        'High risk, but directly aligns with autonomy, creative expression, and social impact priorities.',
      fitScore: 78,
      reasons: [
        'Maximum autonomy — you define the mission and the work',
        'Creative expression is the product, not a side effect',
        'Low startup capital required for software-first studios',
      ],
      concerns: [
        'Medium risk tolerance may be stretched by early-stage volatility',
        'No salary floor until revenue-positive — financial needs need a runway plan',
        'Requires business development skills alongside technical work',
      ],
      nextSteps: [
        'Define one specific client type and one service offer (narrow the niche)',
        'Land 2 paid pilot clients within 60 days using your existing network',
        'Read "The $100 Startup" or "Company of One" to scope the initial offering',
      ],
      salaryRange: { low: 60000, high: 300000, currency: 'USD' },
    },
  ],
};

/**
 * Returns the appropriate recommendations for a given track.
 * Falls back to the general DEMO_RECOMMENDATIONS for unknown tracks.
 */
export function getRecommendationsForTrack(trackId: string | null | undefined): CareerRecommendation[] {
  if (!trackId || !(trackId in TRACK_RECOMMENDATIONS)) return DEMO_RECOMMENDATIONS;
  return TRACK_RECOMMENDATIONS[trackId];
}
