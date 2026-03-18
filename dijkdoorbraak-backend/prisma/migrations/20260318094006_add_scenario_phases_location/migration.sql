-- AlterTable
ALTER TABLE "Scenario" ADD COLUMN     "incidentLat" DOUBLE PRECISION,
ADD COLUMN     "incidentLng" DOUBLE PRECISION,
ADD COLUMN     "phases" JSONB;
