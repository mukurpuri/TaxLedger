import { PrismaClient, TaxRegime } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

type SlabSeed = {
  regime: TaxRegime;
  assessmentYear: string;
  incomeFrom: number;
  incomeTo: number | null;
  ratePercent: number;
};

const AY = '2025-26';

const slabs: SlabSeed[] = [
  { regime: 'new', assessmentYear: AY, incomeFrom: 0, incomeTo: 300_000, ratePercent: 0 },
  { regime: 'new', assessmentYear: AY, incomeFrom: 300_000, incomeTo: 700_000, ratePercent: 5 },
  { regime: 'new', assessmentYear: AY, incomeFrom: 700_000, incomeTo: 1_000_000, ratePercent: 10 },
  { regime: 'new', assessmentYear: AY, incomeFrom: 1_000_000, incomeTo: 1_200_000, ratePercent: 15 },
  { regime: 'new', assessmentYear: AY, incomeFrom: 1_200_000, incomeTo: 1_500_000, ratePercent: 20 },
  { regime: 'new', assessmentYear: AY, incomeFrom: 1_500_000, incomeTo: null, ratePercent: 30 },
  { regime: 'old', assessmentYear: AY, incomeFrom: 0, incomeTo: 250_000, ratePercent: 0 },
  { regime: 'old', assessmentYear: AY, incomeFrom: 250_000, incomeTo: 500_000, ratePercent: 5 },
  { regime: 'old', assessmentYear: AY, incomeFrom: 500_000, incomeTo: 1_000_000, ratePercent: 20 },
  { regime: 'old', assessmentYear: AY, incomeFrom: 1_000_000, incomeTo: null, ratePercent: 30 },
];

async function seedSlabs(): Promise<void> {
  for (const slab of slabs) {
    await prisma.taxSlab.upsert({
      where: {
        regime_assessmentYear_incomeFrom: {
          regime: slab.regime,
          assessmentYear: slab.assessmentYear,
          incomeFrom: slab.incomeFrom,
        },
      },
      update: {
        incomeTo: slab.incomeTo,
        ratePercent: slab.ratePercent,
      },
      create: slab,
    });
  }
}

async function seedUsers(): Promise<void> {
  const passwordHash = await bcrypt.hash('ChangeMeNow1', 12);

  await prisma.user.upsert({
    where: { email: 'admin@taxledger.in' },
    update: {},
    create: {
      email: 'admin@taxledger.in',
      passwordHash,
      name: 'TaxLedger Admin',
      pan: 'AAAAA9999A',
      role: 'admin',
      defaultTaxRegime: 'new',
    },
  });

  await prisma.user.upsert({
    where: { email: 'ca@taxledger.in' },
    update: {},
    create: {
      email: 'ca@taxledger.in',
      passwordHash,
      name: 'Priya Sharma, CA',
      pan: 'BBBBB8888B',
      role: 'ca',
      defaultTaxRegime: 'new',
    },
  });
}

async function main(): Promise<void> {
  await seedSlabs();
  await seedUsers();
  console.log('Seeded tax slabs for AY 2025-26 and staff accounts.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
