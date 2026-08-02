-- AlterTable
ALTER TABLE "organizations" ADD COLUMN     "publicApiKey" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "organizations_publicApiKey_key" ON "organizations"("publicApiKey");
