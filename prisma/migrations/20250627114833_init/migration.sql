-- CreateTable
CREATE TABLE "Score" (
    "id" TEXT NOT NULL,
    "musescore_id" INTEGER NOT NULL,
    "title" TEXT,
    "url" TEXT NOT NULL,
    "publisher" TEXT,
    "composer" TEXT,
    "artist" TEXT,
    "date_created" INTEGER,
    "date_updated" INTEGER,
    "pages" INTEGER,
    "duration" TEXT,
    "info" TEXT,
    "measures" INTEGER,
    "keysig" TEXT,
    "difficultyLevel" INTEGER,
    "genres" TEXT[],
    "instrumentations" TEXT[],
    "instruments" TEXT[],
    "categoryPages" TEXT[],
    "scoresJson" JSONB,
    "count_views" INTEGER,
    "count_favorites" INTEGER,
    "count_comments" INTEGER,
    "rating" DOUBLE PRECISION,
    "rating_count" INTEGER,
    "isDownload" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Score_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Score_url_key" ON "Score"("url");
