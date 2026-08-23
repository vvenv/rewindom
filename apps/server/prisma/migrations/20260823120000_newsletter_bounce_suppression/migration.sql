-- AlterTable
ALTER TABLE "NewsletterSubscriber" ADD COLUMN     "bounce_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "last_bounce_at" TIMESTAMP(3),
ADD COLUMN     "last_bounce_type" TEXT,
ADD COLUMN     "suppressed_reason" TEXT;
