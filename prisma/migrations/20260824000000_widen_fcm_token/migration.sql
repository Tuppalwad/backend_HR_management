-- Widen fcm_tokens.fcm_token from the Prisma default VARCHAR(191) to TEXT.
--
-- FCM registration tokens commonly run 150-200+ characters and Firebase documents no fixed
-- maximum, so 191 sits right on the boundary. MySQL 8 runs with
-- STRICT_TRANS_TABLES by default, so an over-length value is rejected with
-- "Data too long for column 'fcm_token'" rather than silently truncated — meaning
-- POST /api/notifications/save would fail for real devices while passing with short
-- test values. No index exists on this column, so widening to TEXT is safe.

ALTER TABLE `fcm_tokens` MODIFY `fcm_token` TEXT NOT NULL;
