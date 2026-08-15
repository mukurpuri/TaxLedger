import type { DocumentType, FilingStatus, TaxRegime, UserRole } from '@prisma/client';
import type { z } from 'zod';
import type {
  AdminStatusUpdateSchema,
  DocumentUploadSchema,
  FilingRequestSchema,
  GstCalculateRequestSchema,
  LoginRequestSchema,
  PaymentRequestSchema,
  RegisterRequestSchema,
  TaxCalculateRequestSchema,
} from './schemas';

export type FilingRequest = z.infer<typeof FilingRequestSchema>;
export type PaymentRequest = z.infer<typeof PaymentRequestSchema>;
export type DocumentUpload = z.infer<typeof DocumentUploadSchema>;
export type RegisterRequest = z.infer<typeof RegisterRequestSchema>;
export type LoginRequest = z.infer<typeof LoginRequestSchema>;
export type TaxCalculateRequest = z.infer<typeof TaxCalculateRequestSchema>;
export type GstCalculateRequest = z.infer<typeof GstCalculateRequestSchema>;
export type AdminStatusUpdate = z.infer<typeof AdminStatusUpdateSchema>;

export type AuthUser = {
  userId: string;
  role: UserRole;
};

export type PublicUser = {
  id: string;
  email: string;
  pan: string;
  name: string;
  role: UserRole;
  defaultTaxRegime: TaxRegime;
  createdAt: Date;
};

export type PublicFiling = {
  id: string;
  userId: string;
  assessmentYear: string;
  grossIncome: number;
  taxRegime: TaxRegime;
  status: FilingStatus;
  computedTax: number;
  submittedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type PublicPayment = {
  id: string;
  filingId: string;
  amount: number;
  gatewayReference: string;
  status: 'pending' | 'success' | 'failed';
  invoiceText: string | null;
  createdAt: Date;
};

export type PublicDocument = {
  id: string;
  filingId: string;
  type: DocumentType;
  fileUrl: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  uploadedAt: Date;
};

export type TaxBreakdown = {
  grossIncome: number;
  assessmentYear: string;
  regime: TaxRegime;
  slabTax: number;
  rebate87A: number;
  surcharge: number;
  cess: number;
  finalTax: number;
};
