CREATE TABLE "SessionLog" (
    "id"        TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "event"     TEXT NOT NULL,
    "details"   JSONB,
    "timestamp" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT "SessionLog_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "SessionLog_sessionId_fkey" FOREIGN KEY ("sessionId")
        REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "SessionLog_sessionId_timestamp_idx" ON "SessionLog"("sessionId", "timestamp");
