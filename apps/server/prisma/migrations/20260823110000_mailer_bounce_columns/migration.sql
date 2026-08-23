-- AlterTable
ALTER TABLE "MailDelivery" ADD COLUMN     "bounce_type" TEXT,
ADD COLUMN     "bounced_at" TIMESTAMP(3),
ADD COLUMN     "complained_at" TIMESTAMP(3);
