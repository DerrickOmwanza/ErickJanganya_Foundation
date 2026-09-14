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

const promises = [
  {
    title: 'Rehabilitate the Imara Daima footbridge',
    category: 'Infrastructure',
    status: 'In progress',
    dateMade: new Date('2026-01-15'),
    targetDate: new Date('2026-08-31'),
    description: '[Placeholder] Commitment made during the Imara Daima community forum to repair the footbridge within the year.',
    evidenceNote: 'Linked to the active Development Tracker project.',
  },
  {
    title: 'Open a youth skills hub in Kwa Njenga',
    category: 'Youth & Employment',
    status: 'In progress',
    dateMade: new Date('2026-02-01'),
    targetDate: new Date('2026-12-31'),
    description: '[Placeholder] Promise made at the 2026 youth roundtable to establish a dedicated training space.',
    evidenceNote: 'Construction and program design underway.',
  },
  {
    title: 'Deliver quarterly free medical camps across all five wards',
    category: 'Health',
    status: 'In progress',
    dateMade: new Date('2025-12-01'),
    targetDate: null,
    description: '[Placeholder] Standing commitment to rotate free health outreach camps through Imara Daima, Kwa Njenga, Kwa Reuben, Pipeline, and Kware.',
    evidenceNote: 'Kware camp series currently active; other wards to follow.',
  },
  {
    title: 'Expand public water access in Kwa Reuben',
    category: 'Water & Sanitation',
    status: 'Not started',
    dateMade: new Date('2026-03-10'),
    targetDate: new Date('2027-01-31'),
    description: '[Placeholder] Commitment to add public water points in underserved sections of Kwa Reuben.',
    evidenceNote: 'Site surveys not yet scheduled.',
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

  const findProjectId = (wardName) => createdProjects.find((p) => p.ward === wardName)?.id ?? null;

  await prisma.promisePledge.create({
    data: { ...promises[0], linkedProjectId: findProjectId('Imara Daima') },
  });
  await prisma.promisePledge.create({
    data: { ...promises[1], linkedProjectId: findProjectId('Kwa Njenga') },
  });
  await prisma.promisePledge.create({ data: promises[2] });
  await prisma.promisePledge.create({
    data: { ...promises[3], linkedProjectId: findProjectId('Kwa Reuben') },
  });

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
