-- AlterTable
ALTER TABLE "financial_records" ADD COLUMN     "due_date" DATE,
ADD COLUMN     "is_recurring" BOOLEAN NOT NULL DEFAULT false;
