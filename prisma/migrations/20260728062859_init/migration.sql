-- CreateEnum
CREATE TYPE "InvoiceType" AS ENUM ('SETTLEMENT', 'PARTIAL', 'CONSOLIDATED', 'CREDIT');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('OPEN', 'PAID', 'OVERDUE');

-- CreateEnum
CREATE TYPE "InvoiceSource" AS ENUM ('MANUAL', 'PDF_UPLOAD');

-- CreateTable
CREATE TABLE "EnergyType" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "allowedUnits" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EnergyType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "taxNumber" TEXT,
    "contactName" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Site" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Site_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MeteringPoint" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "podCode" TEXT NOT NULL,
    "energyTypeId" TEXT NOT NULL,
    "providerName" TEXT,
    "networkOperatorName" TEXT,
    "currentMeterSerial" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MeteringPoint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "meteringPointId" TEXT NOT NULL,
    "energyTypeId" TEXT NOT NULL,
    "providerName" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "issueDate" TIMESTAMP(3) NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "dueDate" TIMESTAMP(3),
    "quantity" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "meterSerialNumber" TEXT,
    "netAmount" DOUBLE PRECISION NOT NULL,
    "vatRate" DOUBLE PRECISION NOT NULL,
    "vatAmount" DOUBLE PRECISION NOT NULL,
    "grossAmount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'HUF',
    "unitPrice" DOUBLE PRECISION,
    "invoiceType" "InvoiceType" NOT NULL,
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'OPEN',
    "attachmentPath" TEXT,
    "sourceType" "InvoiceSource" NOT NULL DEFAULT 'MANUAL',
    "isDraft" BOOLEAN NOT NULL DEFAULT false,
    "recordedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EnergyType_code_key" ON "EnergyType"("code");

-- CreateIndex
CREATE INDEX "Site_customerId_idx" ON "Site"("customerId");

-- CreateIndex
CREATE INDEX "MeteringPoint_siteId_idx" ON "MeteringPoint"("siteId");

-- CreateIndex
CREATE INDEX "MeteringPoint_energyTypeId_idx" ON "MeteringPoint"("energyTypeId");

-- CreateIndex
CREATE INDEX "Invoice_customerId_idx" ON "Invoice"("customerId");

-- CreateIndex
CREATE INDEX "Invoice_siteId_idx" ON "Invoice"("siteId");

-- CreateIndex
CREATE INDEX "Invoice_meteringPointId_idx" ON "Invoice"("meteringPointId");

-- CreateIndex
CREATE INDEX "Invoice_energyTypeId_idx" ON "Invoice"("energyTypeId");

-- CreateIndex
CREATE INDEX "Invoice_meteringPointId_providerName_invoiceNumber_idx" ON "Invoice"("meteringPointId", "providerName", "invoiceNumber");

-- AddForeignKey
ALTER TABLE "Site" ADD CONSTRAINT "Site_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeteringPoint" ADD CONSTRAINT "MeteringPoint_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeteringPoint" ADD CONSTRAINT "MeteringPoint_energyTypeId_fkey" FOREIGN KEY ("energyTypeId") REFERENCES "EnergyType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_meteringPointId_fkey" FOREIGN KEY ("meteringPointId") REFERENCES "MeteringPoint"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_energyTypeId_fkey" FOREIGN KEY ("energyTypeId") REFERENCES "EnergyType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
