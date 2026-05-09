-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "metadata" JSONB NOT NULL DEFAULT '{}';
