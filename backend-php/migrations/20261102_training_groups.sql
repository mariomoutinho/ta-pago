-- Migração aditiva: progresso diário, fotos privadas e grupos com participação voluntária.
ALTER TABLE `WorkoutExercise` ADD COLUMN `studentProgress` JSON NULL;
ALTER TABLE `WorkoutFeedback` ADD COLUMN `photo` LONGTEXT NOT NULL DEFAULT (''), ADD COLUMN `groupId` VARCHAR(191) NULL;
CREATE TABLE `FitnessGroup` (
  `id` VARCHAR(191) NOT NULL PRIMARY KEY,
  `ownerId` VARCHAR(191) NOT NULL,
  `name` LONGTEXT NOT NULL,
  `description` LONGTEXT NOT NULL,
  `inviteCode` VARCHAR(191) NOT NULL,
  `createdAt` VARCHAR(24) NOT NULL,
  UNIQUE KEY `uq_FitnessGroup_0` (`inviteCode`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

CREATE TABLE `FitnessGroupMember` (
  `id` VARCHAR(191) NOT NULL PRIMARY KEY,
  `groupId` VARCHAR(191) NOT NULL,
  `accountId` VARCHAR(191) NOT NULL,
  `joinedAt` VARCHAR(24) NOT NULL,
  UNIQUE KEY `uq_FitnessGroupMember_0` (`groupId`,`accountId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

CREATE TABLE `FitnessChallenge` (
  `id` VARCHAR(191) NOT NULL PRIMARY KEY,
  `groupId` VARCHAR(191) NOT NULL,
  `title` LONGTEXT NOT NULL,
  `startsAt` LONGTEXT NOT NULL,
  `endsAt` LONGTEXT NOT NULL,
  `goal` INT NOT NULL,
  `createdAt` VARCHAR(24) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

ALTER TABLE `WorkoutFeedback` ADD CONSTRAINT `fk_WorkoutFeedback_groupId` FOREIGN KEY (`groupId`) REFERENCES `FitnessGroup` (`id`) ON DELETE SET NULL;

ALTER TABLE `FitnessGroup` ADD CONSTRAINT `fk_FitnessGroup_ownerId` FOREIGN KEY (`ownerId`) REFERENCES `User` (`id`) ON DELETE RESTRICT;

ALTER TABLE `FitnessGroupMember` ADD CONSTRAINT `fk_FitnessGroupMember_groupId` FOREIGN KEY (`groupId`) REFERENCES `FitnessGroup` (`id`) ON DELETE CASCADE;

ALTER TABLE `FitnessGroupMember` ADD CONSTRAINT `fk_FitnessGroupMember_accountId` FOREIGN KEY (`accountId`) REFERENCES `User` (`id`) ON DELETE CASCADE;

ALTER TABLE `FitnessChallenge` ADD CONSTRAINT `fk_FitnessChallenge_groupId` FOREIGN KEY (`groupId`) REFERENCES `FitnessGroup` (`id`) ON DELETE CASCADE;
