-- 默认周期改每日：事件类内容隔一周再说就不叫「进展」了。
-- 只改默认值，**不动存量行**——已经选了每周的订阅者不该被静默改掉。
-- AlterTable
ALTER TABLE "NewsletterSubscription" ALTER COLUMN "cadence" SET DEFAULT 'daily';
