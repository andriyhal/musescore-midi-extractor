/*
  Warnings:

  - A unique constraint covering the columns `[ip,port]` on the table `Proxy` will be added. If there are existing duplicate values, this will fail.
  - Changed the type of `status` on the `Proxy` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "ProxyStatus" AS ENUM ('available', 'busy', 'forbidden');

-- AlterTable
ALTER TABLE "Proxy" DROP COLUMN "status",
ADD COLUMN     "status" "ProxyStatus" NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Proxy_ip_port_key" ON "Proxy"("ip", "port");
