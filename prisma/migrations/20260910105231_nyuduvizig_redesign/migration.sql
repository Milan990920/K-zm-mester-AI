-- CreateEnum
CREATE TYPE "SiteCategory" AS ENUM ('BUILDING', 'ACTIVITY', 'TRANSPORT');

-- CreateEnum
CREATE TYPE "MeasurementType" AS ENUM ('TIME_SERIES', 'PROFILE');

-- CreateEnum
CREATE TYPE "MeasurementPointStatus" AS ENUM ('ACTIVE', 'INACTIVE');

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
    "badgeColor" TEXT NOT NULL DEFAULT '#5C6B63',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EnergyType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Unit" (
    "id" TEXT NOT NULL,
    "energyTypeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kwhPerUnit" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Unit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CO2Factor" (
    "id" TEXT NOT NULL,
    "energyTypeId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "kgCo2PerKwh" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CO2Factor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "taxNumber" TEXT,
    "contactName" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "specialistName" TEXT,
    "specialistQualification" TEXT,
    "certificateIssuer" TEXT,
    "certificateNumber" TEXT,
    "serviceCompanyName" TEXT,
    "serviceCompanyAddress" TEXT,
    "serviceCompanyTaxNumber" TEXT,
    "relationshipStartDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsumptionSite" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "category" "SiteCategory" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConsumptionSite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MeasurementPoint" (
    "id" TEXT NOT NULL,
    "consumptionSiteId" TEXT NOT NULL,
    "podCode" TEXT NOT NULL,
    "energyTypeId" TEXT NOT NULL,
    "providerName" TEXT,
    "networkOperatorName" TEXT,
    "meterSerialNumber" TEXT,
    "measurementType" "MeasurementType" NOT NULL DEFAULT 'PROFILE',
    "status" "MeasurementPointStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MeasurementPoint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "consumptionSiteId" TEXT NOT NULL,
    "measurementPointId" TEXT NOT NULL,
    "energyTypeId" TEXT NOT NULL,
    "providerName" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "issueDate" TIMESTAMP(3) NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "dueDate" TIMESTAMP(3),
    "quantity" DOUBLE PRECISION NOT NULL,
    "unitId" TEXT NOT NULL,
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
CREATE INDEX "EnergyType_sortOrder_idx" ON "EnergyType"("sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "Unit_energyTypeId_name_key" ON "Unit"("energyTypeId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "CO2Factor_energyTypeId_year_key" ON "CO2Factor"("energyTypeId", "year");

-- CreateIndex
CREATE INDEX "ConsumptionSite_customerId_idx" ON "ConsumptionSite"("customerId");

-- CreateIndex
CREATE INDEX "MeasurementPoint_consumptionSiteId_idx" ON "MeasurementPoint"("consumptionSiteId");

-- CreateIndex
CREATE INDEX "MeasurementPoint_energyTypeId_idx" ON "MeasurementPoint"("energyTypeId");

-- CreateIndex
CREATE INDEX "Invoice_customerId_idx" ON "Invoice"("customerId");

-- CreateIndex
CREATE INDEX "Invoice_consumptionSiteId_idx" ON "Invoice"("consumptionSiteId");

-- CreateIndex
CREATE INDEX "Invoice_measurementPointId_idx" ON "Invoice"("measurementPointId");

-- CreateIndex
CREATE INDEX "Invoice_energyTypeId_idx" ON "Invoice"("energyTypeId");

-- CreateIndex
CREATE INDEX "Invoice_measurementPointId_providerName_invoiceNumber_idx" ON "Invoice"("measurementPointId", "providerName", "invoiceNumber");

-- AddForeignKey
ALTER TABLE "Unit" ADD CONSTRAINT "Unit_energyTypeId_fkey" FOREIGN KEY ("energyTypeId") REFERENCES "EnergyType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CO2Factor" ADD CONSTRAINT "CO2Factor_energyTypeId_fkey" FOREIGN KEY ("energyTypeId") REFERENCES "EnergyType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsumptionSite" ADD CONSTRAINT "ConsumptionSite_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeasurementPoint" ADD CONSTRAINT "MeasurementPoint_consumptionSiteId_fkey" FOREIGN KEY ("consumptionSiteId") REFERENCES "ConsumptionSite"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeasurementPoint" ADD CONSTRAINT "MeasurementPoint_energyTypeId_fkey" FOREIGN KEY ("energyTypeId") REFERENCES "EnergyType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_consumptionSiteId_fkey" FOREIGN KEY ("consumptionSiteId") REFERENCES "ConsumptionSite"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_measurementPointId_fkey" FOREIGN KEY ("measurementPointId") REFERENCES "MeasurementPoint"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_energyTypeId_fkey" FOREIGN KEY ("energyTypeId") REFERENCES "EnergyType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
