/*
  Warnings:

  - The primary key for the `Score` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - A unique constraint covering the columns `[url]` on the table `Score` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
CREATE SEQUENCE score_id_seq;
ALTER TABLE "Score" DROP CONSTRAINT "Score_pkey",
ALTER COLUMN "id" SET DEFAULT nextval('score_id_seq'),
ADD CONSTRAINT "Score_pkey" PRIMARY KEY ("id");
ALTER SEQUENCE score_id_seq OWNED BY "Score"."id";

-- CreateIndex
CREATE UNIQUE INDEX "Score_url_key" ON "Score"("url");
