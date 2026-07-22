-- CreateTable
CREATE TABLE "whatsapp_message_templates" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "template" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "whatsapp_message_templates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_message_templates_key_key" ON "whatsapp_message_templates"("key");
