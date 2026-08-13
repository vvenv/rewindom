-- CreateTable
CREATE TABLE "ShopSetting" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "origin_country" TEXT NOT NULL DEFAULT 'CN',
    "ioss_number" TEXT,
    "eori_number" TEXT,
    "stripe_tax_enabled" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShopSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShopProduct" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "title" JSONB NOT NULL,
    "description" JSONB,
    "created_by" TEXT NOT NULL,
    "updated_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShopProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShopVariant" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "title" JSONB,
    "price_cents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "stock_qty" INTEGER NOT NULL DEFAULT 0,
    "weight_g" INTEGER NOT NULL DEFAULT 0,
    "hs_code" TEXT,
    "origin_country" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShopVariant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShopCart" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "member_id" TEXT,
    "guest_token" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShopCart_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShopCartItem" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "cart_id" TEXT NOT NULL,
    "variant_id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShopCartItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShopShippingZone" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "countries" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShopShippingZone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShopShippingRate" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "zone_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "carrier_code" TEXT NOT NULL,
    "price_cents" INTEGER NOT NULL,
    "min_days" INTEGER,
    "max_days" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShopShippingRate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShopOrder" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "member_id" TEXT,
    "guest_token" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "subtotal_cents" INTEGER NOT NULL,
    "shipping_cents" INTEGER NOT NULL,
    "tax_cents" INTEGER NOT NULL DEFAULT 0,
    "total_cents" INTEGER NOT NULL,
    "shipping_address" JSONB NOT NULL,
    "billing_address" JSONB,
    "shipping_rate_id" TEXT,
    "shipping_rate_name" TEXT,
    "carrier_code" TEXT,
    "stripe_checkout_session_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "paid_at" TIMESTAMP(3),

    CONSTRAINT "ShopOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShopOrderLine" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "variant_id" TEXT,
    "sku" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unit_price_cents" INTEGER NOT NULL,
    "weight_g" INTEGER NOT NULL DEFAULT 0,
    "hs_code" TEXT,
    "origin_country" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShopOrderLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShopShipment" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "carrier_code" TEXT NOT NULL,
    "tracking_number" TEXT NOT NULL,
    "shipped_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "customs_snapshot" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShopShipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShopPayment" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'stripe',
    "provider_ref" TEXT NOT NULL,
    "amount_cents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "paid_at" TIMESTAMP(3),
    "raw_event" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShopPayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ShopSetting_tenant_id_key" ON "ShopSetting"("tenant_id");

-- CreateIndex
CREATE INDEX "ShopProduct_tenant_id_status_updated_at_idx" ON "ShopProduct"("tenant_id", "status", "updated_at");

-- CreateIndex
CREATE UNIQUE INDEX "ShopProduct_tenant_id_slug_key" ON "ShopProduct"("tenant_id", "slug");

-- CreateIndex
CREATE INDEX "ShopVariant_tenant_id_product_id_idx" ON "ShopVariant"("tenant_id", "product_id");

-- CreateIndex
CREATE UNIQUE INDEX "ShopVariant_tenant_id_sku_key" ON "ShopVariant"("tenant_id", "sku");

-- CreateIndex
CREATE INDEX "ShopCart_tenant_id_member_id_idx" ON "ShopCart"("tenant_id", "member_id");

-- CreateIndex
CREATE UNIQUE INDEX "ShopCart_tenant_id_guest_token_key" ON "ShopCart"("tenant_id", "guest_token");

-- CreateIndex
CREATE INDEX "ShopCartItem_tenant_id_cart_id_idx" ON "ShopCartItem"("tenant_id", "cart_id");

-- CreateIndex
CREATE UNIQUE INDEX "ShopCartItem_tenant_id_cart_id_variant_id_key" ON "ShopCartItem"("tenant_id", "cart_id", "variant_id");

-- CreateIndex
CREATE INDEX "ShopShippingZone_tenant_id_idx" ON "ShopShippingZone"("tenant_id");

-- CreateIndex
CREATE INDEX "ShopShippingRate_tenant_id_zone_id_idx" ON "ShopShippingRate"("tenant_id", "zone_id");

-- CreateIndex
CREATE INDEX "ShopOrder_tenant_id_status_created_at_idx" ON "ShopOrder"("tenant_id", "status", "created_at");

-- CreateIndex
CREATE INDEX "ShopOrder_tenant_id_member_id_idx" ON "ShopOrder"("tenant_id", "member_id");

-- CreateIndex
CREATE INDEX "ShopOrder_tenant_id_email_idx" ON "ShopOrder"("tenant_id", "email");

-- CreateIndex
CREATE INDEX "ShopOrder_tenant_id_stripe_checkout_session_id_idx" ON "ShopOrder"("tenant_id", "stripe_checkout_session_id");

-- CreateIndex
CREATE UNIQUE INDEX "ShopOrder_tenant_id_number_key" ON "ShopOrder"("tenant_id", "number");

-- CreateIndex
CREATE INDEX "ShopOrderLine_tenant_id_order_id_idx" ON "ShopOrderLine"("tenant_id", "order_id");

-- CreateIndex
CREATE INDEX "ShopShipment_tenant_id_order_id_idx" ON "ShopShipment"("tenant_id", "order_id");

-- CreateIndex
CREATE INDEX "ShopPayment_tenant_id_order_id_idx" ON "ShopPayment"("tenant_id", "order_id");

-- CreateIndex
CREATE UNIQUE INDEX "ShopPayment_tenant_id_provider_provider_ref_key" ON "ShopPayment"("tenant_id", "provider", "provider_ref");

-- AddForeignKey
ALTER TABLE "ShopVariant" ADD CONSTRAINT "ShopVariant_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "ShopProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopCartItem" ADD CONSTRAINT "ShopCartItem_cart_id_fkey" FOREIGN KEY ("cart_id") REFERENCES "ShopCart"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopCartItem" ADD CONSTRAINT "ShopCartItem_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "ShopVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopShippingRate" ADD CONSTRAINT "ShopShippingRate_zone_id_fkey" FOREIGN KEY ("zone_id") REFERENCES "ShopShippingZone"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopOrderLine" ADD CONSTRAINT "ShopOrderLine_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "ShopOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopShipment" ADD CONSTRAINT "ShopShipment_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "ShopOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopPayment" ADD CONSTRAINT "ShopPayment_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "ShopOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
