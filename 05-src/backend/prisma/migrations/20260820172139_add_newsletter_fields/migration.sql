-- AlterTable
ALTER TABLE "newsletter_subscribers" ADD COLUMN     "agreed_to_terms" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "first_name" TEXT,
ADD COLUMN     "last_name" TEXT,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "zip" TEXT;
