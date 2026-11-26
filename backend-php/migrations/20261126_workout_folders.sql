CREATE TABLE `WorkoutFolder` (
  `id` VARCHAR(191) NOT NULL PRIMARY KEY,
  `ownerId` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `createdAt` VARCHAR(24) NOT NULL,
  KEY `ix_WorkoutFolder_owner` (`ownerId`),
  UNIQUE KEY `uq_WorkoutFolder_owner_name` (`ownerId`,`name`),
  CONSTRAINT `fk_WorkoutFolder_ownerId` FOREIGN KEY (`ownerId`) REFERENCES `User` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;
ALTER TABLE `WorkoutTemplate` ADD COLUMN `folderId` VARCHAR(191) NULL,
  ADD KEY `ix_WorkoutTemplate_folder` (`folderId`),
  ADD CONSTRAINT `fk_WorkoutTemplate_folderId` FOREIGN KEY (`folderId`) REFERENCES `WorkoutFolder` (`id`) ON DELETE SET NULL;
