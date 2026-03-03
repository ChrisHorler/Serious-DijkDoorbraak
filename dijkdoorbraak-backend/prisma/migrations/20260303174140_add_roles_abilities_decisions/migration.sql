/*
  Warnings:

  - You are about to drop the column `choice` on the `Decision` table. All the data in the column will be lost.
  - You are about to drop the column `role` on the `Player` table. All the data in the column will be lost.
  - Added the required column `sessionId` to the `Decision` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Decision" DROP COLUMN "choice",
ADD COLUMN     "abilityId" TEXT,
ADD COLUMN     "adminApproved" BOOLEAN,
ADD COLUMN     "adminResponse" TEXT,
ADD COLUMN     "customAction" TEXT,
ADD COLUMN     "score" INTEGER,
ADD COLUMN     "sessionId" TEXT NOT NULL,
ALTER COLUMN "injectId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Player" DROP COLUMN "role",
ADD COLUMN     "roleId" TEXT;

-- CreateTable
CREATE TABLE "Role" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "shortName" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ability" (
    "id" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Ability_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Role_name_key" ON "Role"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Role_shortName_key" ON "Role"("shortName");

-- AddForeignKey
ALTER TABLE "Player" ADD CONSTRAINT "Player_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Decision" ADD CONSTRAINT "Decision_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Decision" ADD CONSTRAINT "Decision_injectId_fkey" FOREIGN KEY ("injectId") REFERENCES "Inject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Decision" ADD CONSTRAINT "Decision_abilityId_fkey" FOREIGN KEY ("abilityId") REFERENCES "Ability"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ability" ADD CONSTRAINT "Ability_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
