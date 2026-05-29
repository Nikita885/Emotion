-- AlterTable
ALTER TABLE "User" ADD COLUMN     "emotionPaletteSetAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "Emotion" (
    "id" SERIAL NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "defaultColorHex" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Emotion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserEmotionColor" (
    "userId" INTEGER NOT NULL,
    "emotionId" INTEGER NOT NULL,
    "colorHex" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserEmotionColor_pkey" PRIMARY KEY ("userId","emotionId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Emotion_slug_key" ON "Emotion"("slug");

-- CreateIndex
CREATE INDEX "UserEmotionColor_emotionId_idx" ON "UserEmotionColor"("emotionId");

-- AddForeignKey
ALTER TABLE "UserEmotionColor" ADD CONSTRAINT "UserEmotionColor_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserEmotionColor" ADD CONSTRAINT "UserEmotionColor_emotionId_fkey" FOREIGN KEY ("emotionId") REFERENCES "Emotion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
