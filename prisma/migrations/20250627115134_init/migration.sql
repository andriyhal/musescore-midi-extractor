/*
  Warnings:

  - You are about to drop the column `isDownload` on the `Score` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Score" DROP COLUMN "isDownload",
ADD COLUMN     "is_download" BOOLEAN NOT NULL DEFAULT false;
