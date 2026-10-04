-- AlterTable
ALTER TABLE "tracker_projects" ADD COLUMN     "after_photo_url" TEXT,
ADD COLUMN     "after_taken_on" DATE,
ADD COLUMN     "before_photo_url" TEXT,
ADD COLUMN     "before_taken_on" DATE;
