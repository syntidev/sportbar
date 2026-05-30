CREATE TABLE `analytics_events` (
  `id` int NOT NULL AUTO_INCREMENT,
  `event_type` varchar(30) NOT NULL,
  `zone` varchar(20) NULL,
  `device_type` varchar(20) NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `analytics_events_event_type_created_at_idx` (`event_type`, `created_at`),
  KEY `analytics_events_created_at_idx` (`created_at`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
