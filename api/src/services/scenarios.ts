import type { CareerProfile, CareerRecommendation } from '../schemas/career.js';

/**
 * Backup demo scenarios — pre-built profiles + recommendations for
 * different user personas. Used when the live intake flow fails or
 * for showcasing variety during a presentation.
 */

export interface DemoScenario {
  id: string;
  name: string;
  description: string;
  inputs: string[];
  expectedProfile: CareerProfile;
  recommendations: CareerRecommendation[];
}

export const SCENARIOS: DemoScenario[] = [
  // ── Scenario A: Career changer — nurse → health-tech ──
  {
    id: 'nurse-to-healthtech',
    name: 'Career Changer: Nurse to Health-Tech',
    description: 'Experienced nurse pivoting to health technology. Strong people skills, moderate tech skills, values stability.',
    inputs: [
      'healthcare, patient care, public health, health technology',
      'stability, helping others, work-life balance',
      'collaborative team-based with clear structure',
      'patient assessment, medical records, basic data entry, Excel',
      'empathy, communication, teamwork, attention to detail, crisis management',
      'low — prefer stability',
      'minimum salary $65,000, target salary $90,000, student loans',
      'local — stay where I am',
      "bachelor's in Nursing (BSN)",
      'short — within 6 months',
      'making a direct impact on patient outcomes, improving healthcare systems',
      'overnight shifts, emotional burnout, understaffing',
    ],
    expectedProfile: {
      interests: ['healthcare', 'patient care', 'public health', 'health technology'],
      values: ['stability', 'helping others', 'work-life balance'],
      workingStyle: 'collaborative team-based with clear structure',
      hardSkills: ['patient assessment', 'medical records', 'basic data entry', 'Excel'],
      softSkills: ['empathy', 'communication', 'teamwork', 'attention to detail', 'crisis management'],
      riskTolerance: 'low',
      financialNeeds: { minimumSalary: 65000, targetSalary: 90000, hasDebt: true },
      geographicFlexibility: 'local',
      educationLevel: "bachelor's in Nursing (BSN)",
      timelineUrgency: 'short',
      purposePriorities: ['making a direct impact on patient outcomes', 'improving healthcare systems'],
      burnoutConcerns: ['overnight shifts', 'emotional burnout', 'understaffing'],
    },
    recommendations: [
      {
        title: 'Clinical Informatics Specialist',
        summary: 'Bridge nursing expertise with health IT systems. Design and optimize electronic health record workflows that directly improve patient care quality.',
        fitScore: 94,
        reasons: [
          'Directly leverages nursing clinical knowledge',
          'Stable roles in hospital systems and health IT vendors',
          'No overnight shifts — standard business hours',
          'Clear career ladder with informatics certifications',
        ],
        concerns: [
          'Requires learning health IT systems (Epic, Cerner)',
          'Less direct patient interaction than bedside nursing',
        ],
        nextSteps: [
          'Obtain AMIA Health Informatics certification',
          'Target hospital IT departments and companies like Epic, Oracle Health',
          'Shadow your hospital\'s informatics team for 2 weeks',
        ],
        salaryRange: { low: 75000, high: 105000, currency: 'USD' },
      },
      {
        title: 'Healthcare Product Manager',
        summary: 'Guide development of health-tech products using clinical insight. Your patient care experience makes you the voice of the end user.',
        fitScore: 85,
        reasons: [
          'Clinical background is rare and highly valued in product teams',
          'Collaborative team role matching your working style',
          'Meaningful impact on healthcare delivery at scale',
        ],
        concerns: [
          'Steeper learning curve for product management methodology',
          'May need to relocate for top health-tech hubs',
        ],
        nextSteps: [
          'Complete a Product Management fundamentals course (Reforge or Product School)',
          'Target companies: Teladoc, Athenahealth, Veracyte, Tempus',
          'Write case studies from your nursing experience that show systems thinking',
        ],
        salaryRange: { low: 85000, high: 130000, currency: 'USD' },
      },
      {
        title: 'Patient Success Manager — Digital Health',
        summary: 'Onboard and support patients using digital health platforms. Combines your empathy and clinical communication with tech-adjacent work.',
        fitScore: 80,
        reasons: [
          'Directly uses empathy and communication strengths',
          'Low risk transition — similar skill set to nursing',
          'Growing field with strong job security',
        ],
        concerns: [
          'Salary ceiling lower than informatics or PM tracks',
          'Some roles still involve irregular hours',
        ],
        nextSteps: [
          'Target digital health startups: Livongo, Omada Health, Noom',
          'Highlight patient education experience on your resume',
          'Join Health 2.0 or HIMSS communities',
        ],
        salaryRange: { low: 60000, high: 85000, currency: 'USD' },
      },
    ],
  },

  // ── Scenario B: Recent grad — undecided generalist ──
  {
    id: 'recent-grad-generalist',
    name: 'Recent Grad: Exploring All Options',
    description: 'Recent liberal arts graduate with broad interests, no clear direction, high flexibility, limited financial runway.',
    inputs: [
      'writing, sustainability, design, languages, travel',
      'creativity, flexibility, growth, diversity of experience',
      'flexible/varied — different tasks every day',
      'writing, research, Adobe Creative Suite, Spanish fluency, social media',
      'adaptability, storytelling, cross-cultural communication, quick learner',
      'high — comfortable with uncertainty',
      'minimum salary $40,000, target salary $55,000, student loans',
      'flexible — open to all',
      "bachelor's in Liberal Arts",
      'immediate — ASAP',
      'creative expression, connecting with diverse people, environmental impact',
      'repetitive routine work, rigid corporate hierarchy, isolation',
    ],
    expectedProfile: {
      interests: ['writing', 'sustainability', 'design', 'languages', 'travel'],
      values: ['creativity', 'flexibility', 'growth', 'diversity of experience'],
      workingStyle: 'flexible/varied — different tasks every day',
      hardSkills: ['writing', 'research', 'Adobe Creative Suite', 'Spanish fluency', 'social media'],
      softSkills: ['adaptability', 'storytelling', 'cross-cultural communication', 'quick learner'],
      riskTolerance: 'high',
      financialNeeds: { minimumSalary: 40000, targetSalary: 55000, hasDebt: true },
      geographicFlexibility: 'flexible',
      educationLevel: "bachelor's in Liberal Arts",
      timelineUrgency: 'immediate',
      purposePriorities: ['creative expression', 'connecting with diverse people', 'environmental impact'],
      burnoutConcerns: ['repetitive routine work', 'rigid corporate hierarchy', 'isolation'],
    },
    recommendations: [
      {
        title: 'Content Strategist — Sustainability Brand',
        summary: 'Create compelling narratives for brands in the sustainability space. Combines your writing talent with environmental values and creative variety.',
        fitScore: 90,
        reasons: [
          'Direct use of writing and storytelling skills',
          'Sustainability sector aligns with environmental values',
          'High variety — different campaigns, channels, topics daily',
          'Spanish fluency opens international brand work',
        ],
        concerns: [
          'Entry-level pay may be tight against loan obligations',
          'Startup sustainability brands can be volatile',
        ],
        nextSteps: [
          'Build a portfolio of 3-5 sustainability-themed writing samples',
          'Target: Patagonia, Allbirds, tentree, or sustainability-focused agencies',
          'Start a bilingual sustainability blog to showcase range',
        ],
        salaryRange: { low: 42000, high: 62000, currency: 'USD' },
      },
      {
        title: 'UX Writer / Content Designer',
        summary: 'Design the words people see in apps and websites. A creative role that values clear communication and diverse user perspectives.',
        fitScore: 86,
        reasons: [
          'Writing-centered role with creative latitude',
          'Remote-friendly with flexible work culture',
          'Growing demand — many companies building UX writing teams',
          'Cross-cultural communication skill is highly valued',
        ],
        concerns: [
          'Requires learning UX design principles and tools (Figma)',
          'Some companies expect UX writing as a side duty, not a dedicated role',
        ],
        nextSteps: [
          'Complete Google UX Design Certificate (Coursera)',
          'Redesign 2-3 real app screens with improved microcopy as portfolio pieces',
          'Join UX Writing Hub community for mentorship',
        ],
        salaryRange: { low: 50000, high: 75000, currency: 'USD' },
      },
      {
        title: 'Program Coordinator — International NGO',
        summary: 'Coordinate programs at an NGO working on environmental or cultural initiatives. Uses your language skills, adaptability, and desire for global impact.',
        fitScore: 78,
        reasons: [
          'Spanish fluency immediately applicable',
          'Travel and cross-cultural work built into the role',
          'Directly serves environmental and social impact values',
          'High variety — no two days are the same',
        ],
        concerns: [
          'NGO pay typically below market rate',
          'Grant-funded positions may lack long-term stability',
          'Occasional demanding travel schedules',
        ],
        nextSteps: [
          'Check Idealist.org and DevEx for open coordinator positions',
          'Target orgs: IUCN, WWF, Ashoka, Peace Corps Response',
          'Get a TEFL certificate as a fallback that pairs with travel goals',
        ],
        salaryRange: { low: 38000, high: 52000, currency: 'USD' },
      },
    ],
  },
];
