/*
  Warnings:

  - A unique constraint covering the columns `[qr_token]` on the table `Transaction` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `store_id` to the `Transaction` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Transaction" DROP CONSTRAINT "Transaction_membership_id_fkey";

-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "store_id" TEXT NOT NULL,
ALTER COLUMN "membership_id" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_qr_token_key" ON "Transaction"("qr_token");

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_membership_id_fkey" FOREIGN KEY ("membership_id") REFERENCES "Membership"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
