// Seed script — fills the database with clearly-placeholder mock data so the
// frontend has something real to render while genuine foundation records are
// collected. Nothing here should be presented to site visitors as verified
// fact until it is replaced with real, confirmed information.
//
// Run with: npm run seed

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// The five wards that make up Embakasi South constituency.
const WARDS = ['Imara Daima', 'Kwa Njenga', 'Kwa Reuben', 'Pipeline', 'Kware'];

const trackerProjects = [
  {
    title: 'Imara Daima Footbridge Rehabilitation',
    ward: 'Imara Daima',
    category: 'Infrastructure',
    status: 'Ongoing',
    progressPercent: 60,
    budgetKes: 4_200_000,
    fundingSource: 'Foundation-funded',
    summary: '[Placeholder] Repair and lighting upgrade for the pedestrian footbridge linking Imara Daima estate to the main road.',
    location: 'Imara Daima, near the railway crossing',
    startedOn: new Date('2026-02-10'),
  },
  {
    title: 'Kwa Njenga Youth Skills Hub',
    ward: 'Kwa Njenga',
    category: 'Youth & Employment',
    status: 'Ongoing',
    progressPercent: 35,
    budgetKes: 3_500_000,
    fundingSource: 'Partner-funded',
    summary: '[Placeholder] A shared workspace offering vocational training and small-business incubation for local youth.',
    location: 'Kwa Njenga trading center',
    startedOn: new Date('2026-04-01'),
  },
  {
    title: 'Pipeline Estate Drainage Upgrade',
    ward: 'Pipeline',
    category: 'Infrastructure',
    status: 'Completed',
    progressPercent: 100,
    budgetKes: 6_800_000,
    fundingSource: 'Government (NG-CDF)',
    summary: '[Placeholder] Storm drainage renovation to reduce flooding along the main estate access roads.',
    location: 'Pipeline Estate, Phase 2',
    startedOn: new Date('2025-09-15'),
  },
  {
    title: 'Kware Community Health Outreach',
    ward: 'Kware',
    category: 'Health',
    status: 'Ongoing',
    progressPercent: 50,
    budgetKes: 1_900_000,
    fundingSource: 'Foundation-funded',
    summary: '[Placeholder] Monthly free medical camps offering basic screening, maternal health checks, and referrals.',
    location: 'Kware Social Hall',
    startedOn: new Date('2026-01-20'),
  },
  {
    title: 'Kwa Reuben Water Access Points',
    ward: 'Kwa Reuben',
    category: 'Water & Sanitation',
    status: 'Planned',
    progressPercent: 0,
    budgetKes: 2_600_000,
    fundingSource: 'Partner-funded',
    summary: '[Placeholder] Installation of three additional public water points to reduce walking distance for households.',
    location: 'Kwa Reuben, sections A and C',
    startedOn: null,
  },
];

// Promises: Erick's 2022 campaign platform (#KaziKwaMpango). These are REAL data, confirmed by Erick on
// 2026-10-04 (he will review the whole app before public launch and any wording changes are made then). None
// can show progress until he holds the seat, so every status is "Not started"; dateMade and targetDate stay
// empty because the exact dates are unconfirmed.
const promises = [
  {
    title: "Build decent ECDE classrooms",
    category: "Education",
    status: 'Not started',
    dateMade: null,
    targetDate: null,
    description: "Construct decent Early Childhood Development Education (ECDE) classrooms in Embakasi South.",
    evidenceNote: "Source: the 2022 campaign platform (#KaziKwaMpango). A pledge made as a candidate, not yet delivered.",
  },
  {
    title: "Employ trained ECDE teachers on permanent terms, paid on time",
    category: "Education",
    status: 'Not started',
    dateMade: null,
    targetDate: null,
    description: "Employ trained ECDE teachers on permanent terms, with timely pay.",
    evidenceNote: "Source: the 2022 campaign platform (#KaziKwaMpango). A pledge made as a candidate, not yet delivered.",
  },
  {
    title: "Provide the learning resources ECDE classes need",
    category: "Education",
    status: 'Not started',
    dateMade: null,
    targetDate: null,
    description: "Make sure ECDE classes have the learning resources they need.",
    evidenceNote: "Source: the 2022 campaign platform (#KaziKwaMpango). A pledge made as a candidate, not yet delivered.",
  },
  {
    title: "Allocate bursaries fairly to underprivileged students",
    category: "Education",
    status: 'Not started',
    dateMade: null,
    targetDate: null,
    description: "Ensure the fair allocation of bursaries so underprivileged students are supported.",
    evidenceNote: "Source: the 2022 campaign platform (#KaziKwaMpango). A pledge made as a candidate, not yet delivered.",
  },
  {
    title: "Fully equip every hospital in Embakasi South with medication",
    category: "Health",
    status: 'Not started',
    dateMade: null,
    targetDate: null,
    description: "Fully equip all hospitals within Embakasi South with medication.",
    evidenceNote: "Source: the 2022 campaign platform (#KaziKwaMpango). A pledge made as a candidate, not yet delivered.",
  },
  {
    title: "Upgrade and promote sub-county hospitals",
    category: "Health",
    status: 'Not started',
    dateMade: null,
    targetDate: null,
    description: "Upgrade and promote the sub-county hospitals serving Embakasi South.",
    evidenceNote: "Source: the 2022 campaign platform (#KaziKwaMpango). A pledge made as a candidate, not yet delivered.",
  },
  {
    title: "Acquire ambulances to expand emergency response",
    category: "Health",
    status: 'Not started',
    dateMade: null,
    targetDate: null,
    description: "Expand emergency capability by acquiring ambulances.",
    evidenceNote: "Source: the 2022 campaign platform (#KaziKwaMpango). A pledge made as a candidate, not yet delivered.",
  },
  {
    title: "Compensate Community Health Workers reasonably",
    category: "Health",
    status: 'Not started',
    dateMade: null,
    targetDate: null,
    description: "Pay Community Health Workers reasonable compensation for their work.",
    evidenceNote: "Source: the 2022 campaign platform (#KaziKwaMpango). A pledge made as a candidate, not yet delivered.",
  },
  {
    title: "Build modern public hygiene facilities",
    category: "Water & Sanitation",
    status: 'Not started',
    dateMade: null,
    targetDate: null,
    description: "Build modern public hygiene facilities to improve sanitation across the constituency.",
    evidenceNote: "Source: the 2022 campaign platform (#KaziKwaMpango). A pledge made as a candidate, not yet delivered.",
  },
  {
    title: "Improve the local road network",
    category: "Infrastructure",
    status: 'Not started',
    dateMade: null,
    targetDate: null,
    description: "Improve the road network within Embakasi South.",
    evidenceNote: "Source: the 2022 campaign platform (#KaziKwaMpango). A pledge made as a candidate, not yet delivered.",
  },
  {
    title: "Build additional police posts",
    category: "Infrastructure",
    status: 'Not started',
    dateMade: null,
    targetDate: null,
    description: "Strengthen security infrastructure by building additional police posts.",
    evidenceNote: "Source: the 2022 campaign platform (#KaziKwaMpango). A pledge made as a candidate, not yet delivered.",
  },
  {
    title: "Install street lights to improve public safety",
    category: "Infrastructure",
    status: 'Not started',
    dateMade: null,
    targetDate: null,
    description: "Install street lights to boost public safety.",
    evidenceNote: "Source: the 2022 campaign platform (#KaziKwaMpango). A pledge made as a candidate, not yet delivered.",
  },
  {
    title: "Provide reliable access to clean, safe drinking water",
    category: "Water & Sanitation",
    status: 'Not started',
    dateMade: null,
    targetDate: null,
    description: "Provide residents with reliable access to clean, safe drinking water.",
    evidenceNote: "Source: the 2022 campaign platform (#KaziKwaMpango). A pledge made as a candidate, not yet delivered.",
  },
  {
    title: "Launch empowerment programmes for women and youth",
    category: "Youth & Employment",
    status: 'Not started',
    dateMade: null,
    targetDate: null,
    description: "Start dedicated programmes for women and youth built on financial inclusion, access to information technology, and community programmes.",
    evidenceNote: "Source: the 2022 campaign platform (#KaziKwaMpango). A pledge made as a candidate, not yet delivered.",
  },
];

const newsPosts = [
  {
    title: 'Foundation launches community forum series across Embakasi South',
    summary: '[Placeholder] A first round of town-hall style forums kicks off to gather resident priorities ahead of the 2027 race.',
    body: '[Placeholder body copy — replace with the real statement/article text once available.]',
    publishedOn: new Date('2026-06-05'),
    sourceType: 'Foundation',
  },
  {
    title: 'Pipeline drainage project completed ahead of the rainy season',
    summary: '[Placeholder] The Pipeline Estate drainage upgrade wraps up, aiming to reduce seasonal flooding.',
    body: '[Placeholder body copy.]',
    publishedOn: new Date('2026-04-20'),
    sourceType: 'Press',
  },
  {
    title: 'Statement on the Kware health outreach program',
    summary: '[Placeholder] A statement outlining the goals and early results of the Kware community health camps.',
    body: '[Placeholder body copy.]',
    publishedOn: new Date('2026-03-02'),
    sourceType: 'Statement',
  },
];

const events = [
  {
    title: 'Imara Daima Community Forum',
    description: '[Placeholder] Open town-hall to discuss the footbridge project and hear resident concerns.',
    eventDate: new Date('2026-09-05'),
    eventTime: '10:00 AM',
    location: 'Imara Daima Primary School grounds',
    ward: 'Imara Daima',
  },
  {
    title: 'Kwa Njenga Youth Skills Hub — Open Day',
    description: '[Placeholder] Public walkthrough of the new training space and enrollment sign-ups.',
    eventDate: new Date('2026-10-12'),
    eventTime: '9:00 AM',
    location: 'Kwa Njenga trading center',
    ward: 'Kwa Njenga',
  },
  {
    title: 'Kware Free Medical Camp',
    description: '[Placeholder] Monthly outreach offering screenings, maternal checks, and referrals.',
    eventDate: new Date('2026-09-20'),
    eventTime: '8:00 AM',
    location: 'Kware Social Hall',
    ward: 'Kware',
  },
];

async function main() {
  console.log('Seeding placeholder data...');

  await prisma.event.deleteMany();
  await prisma.newsPost.deleteMany();
  await prisma.promisePledge.deleteMany();
  await prisma.trackerProject.deleteMany();

  const createdProjects = [];
  for (const project of trackerProjects) {
    const created = await prisma.trackerProject.create({ data: project });
    createdProjects.push(created);
  }


  for (const promise of promises) {
    await prisma.promisePledge.create({ data: promise });
  }

  for (const post of newsPosts) {
    await prisma.newsPost.create({ data: post });
  }

  for (const event of events) {
    await prisma.event.create({ data: event });
  }

  console.log(`Done. Wards seeded: ${WARDS.join(', ')}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
