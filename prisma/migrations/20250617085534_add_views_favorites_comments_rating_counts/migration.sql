-- AlterTable
ALTER TABLE "Score" ADD COLUMN     "count_comments" INTEGER,
ADD COLUMN     "count_favorites" INTEGER,
ADD COLUMN     "count_views" INTEGER,
ADD COLUMN     "rating" INTEGER,
ADD COLUMN     "rating_count" INTEGER;
