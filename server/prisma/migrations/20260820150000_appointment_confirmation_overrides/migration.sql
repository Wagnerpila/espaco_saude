-- CreateTable
CREATE TABLE "appointment_confirmation_overrides" (
    "id" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "scope_value" TEXT NOT NULL,
    "template" TEXT,
    "media_url" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "appointment_confirmation_overrides_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "appointment_confirmation_overrides_scope_scope_value_key" ON "appointment_confirmation_overrides"("scope", "scope_value");
