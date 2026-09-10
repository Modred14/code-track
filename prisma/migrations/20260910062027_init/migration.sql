-- CreateTable
CREATE TABLE "CodingSession" (
    "id" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "endedAt" TIMESTAMP(3) NOT NULL,
    "durationSeconds" INTEGER NOT NULL,
    "project" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "clientId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CodingSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CodingSession_project_language_updatedAt_idx" ON "CodingSession"("project", "language", "updatedAt");

-- CreateIndex
CREATE INDEX "CodingSession_startedAt_idx" ON "CodingSession"("startedAt");

-- CreateIndex
CREATE INDEX "CodingSession_endedAt_idx" ON "CodingSession"("endedAt");

-- CreateIndex
CREATE INDEX "CodingSession_language_idx" ON "CodingSession"("language");

-- CreateIndex
CREATE INDEX "CodingSession_project_idx" ON "CodingSession"("project");
