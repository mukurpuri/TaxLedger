-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('taxpayer', 'ca', 'admin');

-- CreateEnum
CREATE TYPE "TaxRegime" AS ENUM ('old', 'new');

-- CreateEnum
CREATE TYPE "FilingStatus" AS ENUM ('draft', 'submitted', 'processing', 'assessed', 'refund_issued');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('pending', 'success', 'failed');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('form16', 'receipt', 'investment_proof');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "pan" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'taxpayer',
    "defaultTaxRegime" "TaxRegime" NOT NULL DEFAULT 'new',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Filing" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "assessmentYear" TEXT NOT NULL,
    "grossIncome" DECIMAL(15,2) NOT NULL,
    "taxRegime" "TaxRegime" NOT NULL,
    "status" "FilingStatus" NOT NULL DEFAULT 'draft',
    "computedTax" DECIMAL(15,2) NOT NULL,
    "submittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Filing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "filingId" TEXT NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "gatewayReference" TEXT NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'pending',
    "invoiceText" TEXT,
    "failureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "filingId" TEXT NOT NULL,
    "type" "DocumentType" NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaxSlab" (
    "id" TEXT NOT NULL,
    "regime" "TaxRegime" NOT NULL,
    "assessmentYear" TEXT NOT NULL,
    "incomeFrom" DECIMAL(15,2) NOT NULL,
    "incomeTo" DECIMAL(15,2),
    "ratePercent" DECIMAL(5,2) NOT NULL,

    CONSTRAINT "TaxSlab_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_pan_key" ON "User"("pan");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "User_pan_idx" ON "User"("pan");

-- CreateIndex
CREATE INDEX "Filing_userId_idx" ON "Filing"("userId");

-- CreateIndex
CREATE INDEX "Filing_status_idx" ON "Filing"("status");

-- CreateIndex
CREATE INDEX "Filing_assessmentYear_idx" ON "Filing"("assessmentYear");

-- CreateIndex
CREATE UNIQUE INDEX "Filing_userId_assessmentYear_key" ON "Filing"("userId", "assessmentYear");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_gatewayReference_key" ON "Payment"("gatewayReference");

-- CreateIndex
CREATE INDEX "Payment_filingId_idx" ON "Payment"("filingId");

-- CreateIndex
CREATE INDEX "Payment_status_idx" ON "Payment"("status");

-- CreateIndex
CREATE INDEX "Document_filingId_idx" ON "Document"("filingId");

-- CreateIndex
CREATE INDEX "Document_type_idx" ON "Document"("type");

-- CreateIndex
CREATE INDEX "TaxSlab_regime_assessmentYear_idx" ON "TaxSlab"("regime", "assessmentYear");

-- CreateIndex
CREATE UNIQUE INDEX "TaxSlab_regime_assessmentYear_incomeFrom_key" ON "TaxSlab"("regime", "assessmentYear", "incomeFrom");

-- AddForeignKey
ALTER TABLE "Filing" ADD CONSTRAINT "Filing_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_filingId_fkey" FOREIGN KEY ("filingId") REFERENCES "Filing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_filingId_fkey" FOREIGN KEY ("filingId") REFERENCES "Filing"("id") ON DELETE CASCADE ON UPDATE CASCADE;
