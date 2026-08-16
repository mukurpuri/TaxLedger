import { z } from 'zod';

export const PAN_PATTERN = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
export const ASSESSMENT_YEAR_PATTERN = /^[0-9]{4}-[0-9]{2}$/;

const TaxRegimeSchema = z.enum(['old', 'new']);
const FilingStatusSchema = z.enum([
  'draft',
  'submitted',
  'processing',
  'assessed',
  'refund_issued',
]);
const DocumentTypeSchema = z.enum(['form16', 'receipt', 'investment_proof']);
const UserRoleSchema = z.enum(['taxpayer', 'ca', 'admin']);

export const RegisterRequestSchema = z.object({
  email: z.string().trim().max(254).transform((value) => value.toLowerCase()),
  password: z.string().min(10, 'Password must be at least 10 characters').max(128),
  name: z.string().trim().min(2).max(120),
  pan: z
    .string()
    .trim()
    .toUpperCase()
    .regex(PAN_PATTERN, 'PAN must match AAAAA9999A'),
  role: UserRoleSchema.optional().default('taxpayer'),
  defaultTaxRegime: TaxRegimeSchema.optional().default('new'),
});

export const LoginRequestSchema = z.object({
  email: z.string().trim().email().transform((value) => value.toLowerCase()),
  password: z.string().min(1, 'Password is required'),
});

export const FilingRequestSchema = z.object({
  assessmentYear: z
    .string()
    .trim()
    .regex(ASSESSMENT_YEAR_PATTERN, 'assessmentYear must match YYYY-YY, e.g. 2025-26')
    .refine((value) => {
      const start = Number(value.slice(0, 4));
      const end = Number(value.slice(5));
      return end === (start + 1) % 100;
    }, 'assessmentYear suffix must be the following two-digit year'),
  grossIncome: z.coerce
    .number({ invalid_type_error: 'grossIncome must be a number' })
    .finite()
    .positive('grossIncome must be greater than 0')
    .max(1_000_000_000_000, 'grossIncome exceeds supported range'),
  taxRegime: TaxRegimeSchema,
});

export const PaymentRequestSchema = z.object({
  filingId: z.string().cuid().optional(),
  amount: z.coerce
    .number({ invalid_type_error: 'amount must be a number' })
    .finite()
    .positive('amount must be greater than 0')
    .max(1_000_000_000_000),
});

export const DocumentUploadSchema = z.object({
  type: DocumentTypeSchema,
  filingId: z.string().cuid(),
});

export const TaxCalculateRequestSchema = z.object({
  grossIncome: z.coerce.number().finite().positive().max(1_000_000_000_000),
  assessmentYear: FilingRequestSchema.shape.assessmentYear,
  taxRegime: TaxRegimeSchema.optional(),
});

export const GstCalculateRequestSchema = z.object({
  amount: z.coerce.number().finite().nonnegative().max(1_000_000_000_000),
  category: z.string().trim().min(1).max(64).toLowerCase(),
});

export const AdminStatusUpdateSchema = z.object({
  status: FilingStatusSchema.refine(
    (status) => status !== 'draft',
    'Admin cannot revert a filing to draft',
  ),
});

export {
  TaxRegimeSchema,
  FilingStatusSchema,
  DocumentTypeSchema,
  UserRoleSchema,
};
