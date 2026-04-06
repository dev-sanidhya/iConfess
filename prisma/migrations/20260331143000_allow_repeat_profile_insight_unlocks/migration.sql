DROP INDEX "UnlockedProfileInsight_viewerId_targetUserId_key";

CREATE INDEX "UnlockedProfileInsight_viewerId_targetUserId_idx" ON "UnlockedProfileInsight"("viewerId", "targetUserId");
CREATE INDEX "UnlockedProfileInsight_targetUserId_idx" ON "UnlockedProfileInsight"("targetUserId");
