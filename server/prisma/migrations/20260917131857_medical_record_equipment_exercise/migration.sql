-- AlterTable
ALTER TABLE "medical_records" ADD COLUMN     "equipment_ids" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "exercise_ids" TEXT[] DEFAULT ARRAY[]::TEXT[];
