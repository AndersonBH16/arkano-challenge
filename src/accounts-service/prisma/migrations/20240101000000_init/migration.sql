-- CreateEnum
CREATE TYPE "AccountStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'BLOCKED');

-- CreateTable
CREATE TABLE "customers" (
                             "id" TEXT NOT NULL,
                             "name" TEXT NOT NULL,
                             "email" TEXT NOT NULL,
                             "document" TEXT NOT NULL,
                             "phone" TEXT,
                             "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                             "updated_at" TIMESTAMP(3) NOT NULL,

                             CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts" (
                            "id" TEXT NOT NULL,
                            "customer_id" TEXT NOT NULL,
                            "number" TEXT NOT NULL,
                            "balance" DECIMAL(18,2) NOT NULL DEFAULT 0,
                            "currency" TEXT NOT NULL DEFAULT 'PEN',
                            "status" "AccountStatus" NOT NULL DEFAULT 'ACTIVE',
                            "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                            "updated_at" TIMESTAMP(3) NOT NULL,

                            CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "customers_email_key" ON "customers"("email");

-- CreateIndex
CREATE UNIQUE INDEX "customers_document_key" ON "customers"("document");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_number_key" ON "accounts"("number");

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
