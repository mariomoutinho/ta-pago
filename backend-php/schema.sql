-- Gerado por scripts/php/generate.ts; MySQL 8 / MariaDB 10.4+.
CREATE TABLE `User` (
  `id` VARCHAR(191) NOT NULL PRIMARY KEY,
  `name` LONGTEXT NOT NULL,
  `email` VARCHAR(254) NOT NULL,
  `role` LONGTEXT NOT NULL,
  `passwordHash` LONGTEXT NOT NULL,
  UNIQUE KEY `uq_User_0` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

CREATE TABLE `Session` (
  `id` VARCHAR(191) NOT NULL PRIMARY KEY,
  `userId` VARCHAR(191) NOT NULL,
  `expiresAt` VARCHAR(24) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

CREATE TABLE `Student` (
  `personalId` VARCHAR(191) NOT NULL,
  `accountId` VARCHAR(191) NULL,
  `linkStatus` LONGTEXT NOT NULL,
  `id` VARCHAR(191) NOT NULL PRIMARY KEY,
  `name` LONGTEXT NOT NULL,
  `birthDate` LONGTEXT NULL,
  `phone` LONGTEXT NOT NULL,
  `email` LONGTEXT NOT NULL,
  `sex` LONGTEXT NOT NULL,
  `startDate` LONGTEXT NOT NULL,
  `status` LONGTEXT NOT NULL,
  `mainGoal` LONGTEXT NOT NULL,
  `secondaryGoals` LONGTEXT NOT NULL,
  `experience` LONGTEXT NOT NULL,
  `weeklyFrequency` INT NOT NULL,
  `availability` LONGTEXT NOT NULL,
  `notes` LONGTEXT NOT NULL,
  `injuries` LONGTEXT NOT NULL,
  `limitations` LONGTEXT NOT NULL,
  `surgeries` LONGTEXT NOT NULL,
  `conditions` LONGTEXT NOT NULL,
  `medications` LONGTEXT NOT NULL,
  `restrictions` LONGTEXT NOT NULL,
  `emergencyContact` LONGTEXT NOT NULL,
  `nextEvaluationDate` LONGTEXT NULL,
  `programId` VARCHAR(191) NULL,
  `createdAt` VARCHAR(24) NOT NULL,
  `updatedAt` VARCHAR(24) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

CREATE TABLE `Program` (
  `ownerId` VARCHAR(191) NOT NULL,
  `id` VARCHAR(191) NOT NULL PRIMARY KEY,
  `name` LONGTEXT NOT NULL,
  `description` LONGTEXT NOT NULL,
  `weeklyFrequency` INT NOT NULL,
  `cycleDays` INT NOT NULL,
  `sessions` LONGTEXT NOT NULL,
  `workouts` JSON NOT NULL,
  `revision` INT NOT NULL,
  `createdAt` VARCHAR(24) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

CREATE TABLE `EvaluationTemplate` (
  `ownerId` VARCHAR(191) NOT NULL,
  `id` VARCHAR(191) NOT NULL PRIMARY KEY,
  `name` VARCHAR(191) NOT NULL,
  `version` INT NOT NULL,
  `cycleDays` INT NOT NULL,
  `createdAt` VARCHAR(24) NOT NULL,
  UNIQUE KEY `uq_EvaluationTemplate_0` (`name`,`version`,`ownerId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

CREATE TABLE `EvaluationQuestion` (
  `id` VARCHAR(191) NOT NULL PRIMARY KEY,
  `templateId` VARCHAR(191) NOT NULL,
  `position` INT NOT NULL,
  `dimension` LONGTEXT NOT NULL,
  `text` LONGTEXT NOT NULL,
  `type` LONGTEXT NOT NULL,
  `required` TINYINT(1) NOT NULL,
  `min` DOUBLE NULL,
  `max` DOUBLE NULL,
  UNIQUE KEY `uq_EvaluationQuestion_0` (`templateId`,`position`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

CREATE TABLE `EvaluationOption` (
  `id` VARCHAR(191) NOT NULL PRIMARY KEY,
  `questionId` VARCHAR(191) NOT NULL,
  `position` INT NOT NULL,
  `label` LONGTEXT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

CREATE TABLE `Evaluation` (
  `id` VARCHAR(191) NOT NULL PRIMARY KEY,
  `studentId` VARCHAR(191) NOT NULL,
  `templateId` VARCHAR(191) NOT NULL,
  `programId` VARCHAR(191) NULL,
  `programSnapshot` LONGTEXT NOT NULL,
  `date` VARCHAR(191) NOT NULL,
  `cycle` INT NOT NULL,
  `evaluator` LONGTEXT NOT NULL,
  `status` LONGTEXT NOT NULL,
  `notes` LONGTEXT NOT NULL,
  `conclusion` LONGTEXT NOT NULL,
  `actionPlan` LONGTEXT NOT NULL,
  `createdAt` VARCHAR(24) NOT NULL,
  `updatedAt` VARCHAR(24) NOT NULL,
  KEY `ix_Evaluation_0` (`studentId`,`date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

CREATE TABLE `EvaluationAnswer` (
  `id` VARCHAR(191) NOT NULL PRIMARY KEY,
  `evaluationId` VARCHAR(191) NOT NULL,
  `questionId` VARCHAR(191) NOT NULL,
  `value` LONGTEXT NOT NULL,
  UNIQUE KEY `uq_EvaluationAnswer_0` (`evaluationId`,`questionId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

CREATE TABLE `TrackingRecord` (
  `id` VARCHAR(191) NOT NULL PRIMARY KEY,
  `studentId` VARCHAR(191) NOT NULL,
  `kind` VARCHAR(191) NOT NULL,
  `date` VARCHAR(191) NOT NULL,
  `data` JSON NOT NULL,
  `createdAt` VARCHAR(24) NOT NULL,
  `updatedAt` VARCHAR(24) NOT NULL,
  KEY `ix_TrackingRecord_0` (`studentId`,`kind`,`date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

CREATE TABLE `HistoryEntry` (
  `id` VARCHAR(191) NOT NULL PRIMARY KEY,
  `studentId` VARCHAR(191) NOT NULL,
  `action` LONGTEXT NOT NULL,
  `detail` JSON NOT NULL,
  `createdAt` VARCHAR(24) NOT NULL,
  KEY `ix_HistoryEntry_0` (`studentId`,`createdAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

CREATE TABLE `Invitation` (
  `id` VARCHAR(191) NOT NULL PRIMARY KEY,
  `tokenHash` VARCHAR(191) NOT NULL,
  `studentId` VARCHAR(191) NOT NULL,
  `expiresAt` VARCHAR(24) NOT NULL,
  `consumedAt` VARCHAR(24) NULL,
  `createdAt` VARCHAR(24) NOT NULL,
  UNIQUE KEY `uq_Invitation_0` (`tokenHash`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

CREATE TABLE `EnrollmentLink` (
  `id` VARCHAR(191) NOT NULL PRIMARY KEY,
  `personalId` VARCHAR(191) NOT NULL,
  `token` VARCHAR(191) NOT NULL,
  `active` TINYINT(1) NOT NULL,
  `publicName` LONGTEXT NOT NULL,
  `contact` LONGTEXT NOT NULL,
  `createdAt` VARCHAR(24) NOT NULL,
  `updatedAt` VARCHAR(24) NOT NULL,
  UNIQUE KEY `uq_EnrollmentLink_0` (`personalId`),
  UNIQUE KEY `uq_EnrollmentLink_1` (`token`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

CREATE TABLE `EnrollmentChallenge` (
  `id` VARCHAR(191) NOT NULL PRIMARY KEY,
  `linkId` VARCHAR(191) NOT NULL,
  `createdAt` VARCHAR(24) NOT NULL,
  `expiresAt` VARCHAR(24) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

CREATE TABLE `EnrollmentRequest` (
  `id` VARCHAR(191) NOT NULL PRIMARY KEY,
  `personalId` VARCHAR(191) NOT NULL,
  `emailHash` VARCHAR(191) NOT NULL,
  `payload` LONGTEXT NOT NULL,
  `healthPayload` LONGTEXT NULL,
  `status` VARCHAR(191) NOT NULL,
  `studentId` VARCHAR(191) NULL,
  `policyVersion` LONGTEXT NOT NULL,
  `consentAt` VARCHAR(24) NOT NULL,
  `healthConsentAt` VARCHAR(24) NULL,
  `createdAt` VARCHAR(24) NOT NULL,
  `updatedAt` VARCHAR(24) NOT NULL,
  UNIQUE KEY `uq_EnrollmentRequest_0` (`studentId`),
  UNIQUE KEY `uq_EnrollmentRequest_1` (`personalId`,`emailHash`),
  KEY `ix_EnrollmentRequest_0` (`personalId`,`status`,`createdAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

CREATE TABLE `EnrollmentEvent` (
  `id` VARCHAR(191) NOT NULL PRIMARY KEY,
  `requestId` VARCHAR(191) NOT NULL,
  `status` LONGTEXT NOT NULL,
  `createdAt` VARCHAR(24) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

CREATE TABLE `WorkoutPlan` (
  `id` VARCHAR(191) NOT NULL PRIMARY KEY,
  `studentId` VARCHAR(191) NOT NULL,
  `title` LONGTEXT NOT NULL,
  `objective` LONGTEXT NOT NULL,
  `difficulty` LONGTEXT NOT NULL,
  `startsAt` LONGTEXT NOT NULL,
  `endsAt` LONGTEXT NULL,
  `instructions` LONGTEXT NOT NULL,
  `status` VARCHAR(191) NOT NULL,
  `publishedAt` VARCHAR(24) NULL,
  `revision` INT NOT NULL,
  `createdAt` VARCHAR(24) NOT NULL,
  `updatedAt` VARCHAR(24) NOT NULL,
  KEY `ix_WorkoutPlan_0` (`studentId`,`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

CREATE TABLE `Workout` (
  `id` VARCHAR(191) NOT NULL PRIMARY KEY,
  `planId` VARCHAR(191) NOT NULL,
  `name` LONGTEXT NOT NULL,
  `subtitle` LONGTEXT NOT NULL,
  `instructions` LONGTEXT NOT NULL,
  `orderIndex` INT NOT NULL,
  `deletedAt` VARCHAR(24) NULL,
  `createdAt` VARCHAR(24) NOT NULL,
  `updatedAt` VARCHAR(24) NOT NULL,
  KEY `ix_Workout_0` (`planId`,`orderIndex`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

CREATE TABLE `Exercise` (
  `id` VARCHAR(191) NOT NULL PRIMARY KEY,
  `ownerId` VARCHAR(191) NOT NULL,
  `name` LONGTEXT NOT NULL,
  `muscleGroup` LONGTEXT NOT NULL,
  `category` LONGTEXT NOT NULL,
  `equipment` LONGTEXT NOT NULL,
  `description` LONGTEXT NOT NULL,
  `imageUrl` LONGTEXT NOT NULL,
  `videoUrl` LONGTEXT NOT NULL,
  `notes` LONGTEXT NOT NULL,
  `status` VARCHAR(191) NOT NULL,
  `createdAt` VARCHAR(24) NOT NULL,
  `updatedAt` VARCHAR(24) NOT NULL,
  KEY `ix_Exercise_0` (`ownerId`,`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

CREATE TABLE `WorkoutExercise` (
  `id` VARCHAR(191) NOT NULL PRIMARY KEY,
  `workoutId` VARCHAR(191) NOT NULL,
  `exerciseId` VARCHAR(191) NOT NULL,
  `alternativeExerciseId` VARCHAR(191) NULL,
  `orderIndex` INT NOT NULL,
  `groupId` LONGTEXT NULL,
  `series` JSON NOT NULL,
  `sets` INT NULL,
  `repetitions` LONGTEXT NOT NULL,
  `load` DOUBLE NULL,
  `durationSeconds` INT NULL,
  `restSeconds` INT NULL,
  `rir` DOUBLE NULL,
  `rpe` DOUBLE NULL,
  `cadence` LONGTEXT NOT NULL,
  `notes` LONGTEXT NOT NULL,
  `deletedAt` VARCHAR(24) NULL,
  `createdAt` VARCHAR(24) NOT NULL,
  `updatedAt` VARCHAR(24) NOT NULL,
  KEY `ix_WorkoutExercise_0` (`workoutId`,`orderIndex`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

CREATE TABLE `WorkoutFeedback` (
  `id` VARCHAR(191) NOT NULL PRIMARY KEY,
  `workoutId` VARCHAR(191) NOT NULL,
  `requestId` VARCHAR(191) NOT NULL,
  `comment` LONGTEXT NOT NULL,
  `createdAt` VARCHAR(24) NOT NULL,
  UNIQUE KEY `uq_WorkoutFeedback_0` (`workoutId`,`requestId`),
  KEY `ix_WorkoutFeedback_0` (`workoutId`,`createdAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

CREATE TABLE `PrescriptionPreset` (
  `id` VARCHAR(191) NOT NULL PRIMARY KEY,
  `ownerId` VARCHAR(191) NOT NULL,
  `name` LONGTEXT NOT NULL,
  `series` JSON NOT NULL,
  `configuration` JSON NULL,
  `createdAt` VARCHAR(24) NOT NULL,
  KEY `ix_PrescriptionPreset_0` (`ownerId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

CREATE TABLE `WorkoutTemplate` (
  `id` VARCHAR(191) NOT NULL PRIMARY KEY,
  `ownerId` VARCHAR(191) NOT NULL,
  `name` LONGTEXT NOT NULL,
  `subtitle` LONGTEXT NOT NULL,
  `instructions` LONGTEXT NOT NULL,
  `exercises` JSON NOT NULL,
  `revision` INT NOT NULL,
  `createdAt` VARCHAR(24) NOT NULL,
  `updatedAt` VARCHAR(24) NOT NULL,
  KEY `ix_WorkoutTemplate_0` (`ownerId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

CREATE TABLE `RateLimit` (`id` VARCHAR(64) PRIMARY KEY, `hits` INT NOT NULL, `expires` BIGINT NOT NULL) ENGINE=InnoDB;

CREATE TABLE `MigrationReceipt` (`id` VARCHAR(64) PRIMARY KEY, `createdAt` VARCHAR(24) NOT NULL) ENGINE=InnoDB;

ALTER TABLE `Session` ADD CONSTRAINT `fk_Session_userId` FOREIGN KEY (`userId`) REFERENCES `User` (`id`) ON DELETE CASCADE;

ALTER TABLE `Student` ADD CONSTRAINT `fk_Student_personalId` FOREIGN KEY (`personalId`) REFERENCES `User` (`id`) ON DELETE RESTRICT;

ALTER TABLE `Student` ADD CONSTRAINT `fk_Student_accountId` FOREIGN KEY (`accountId`) REFERENCES `User` (`id`) ON DELETE SET NULL;

ALTER TABLE `Student` ADD CONSTRAINT `fk_Student_programId` FOREIGN KEY (`programId`) REFERENCES `Program` (`id`) ON DELETE SET NULL;

ALTER TABLE `Program` ADD CONSTRAINT `fk_Program_ownerId` FOREIGN KEY (`ownerId`) REFERENCES `User` (`id`) ON DELETE RESTRICT;

ALTER TABLE `EvaluationQuestion` ADD CONSTRAINT `fk_EvaluationQuestion_templateId` FOREIGN KEY (`templateId`) REFERENCES `EvaluationTemplate` (`id`) ON DELETE CASCADE;

ALTER TABLE `EvaluationOption` ADD CONSTRAINT `fk_EvaluationOption_questionId` FOREIGN KEY (`questionId`) REFERENCES `EvaluationQuestion` (`id`) ON DELETE CASCADE;

ALTER TABLE `Evaluation` ADD CONSTRAINT `fk_Evaluation_studentId` FOREIGN KEY (`studentId`) REFERENCES `Student` (`id`) ON DELETE CASCADE;

ALTER TABLE `Evaluation` ADD CONSTRAINT `fk_Evaluation_templateId` FOREIGN KEY (`templateId`) REFERENCES `EvaluationTemplate` (`id`) ON DELETE RESTRICT;

ALTER TABLE `Evaluation` ADD CONSTRAINT `fk_Evaluation_programId` FOREIGN KEY (`programId`) REFERENCES `Program` (`id`) ON DELETE SET NULL;

ALTER TABLE `EvaluationAnswer` ADD CONSTRAINT `fk_EvaluationAnswer_evaluationId` FOREIGN KEY (`evaluationId`) REFERENCES `Evaluation` (`id`) ON DELETE CASCADE;

ALTER TABLE `EvaluationAnswer` ADD CONSTRAINT `fk_EvaluationAnswer_questionId` FOREIGN KEY (`questionId`) REFERENCES `EvaluationQuestion` (`id`) ON DELETE RESTRICT;

ALTER TABLE `TrackingRecord` ADD CONSTRAINT `fk_TrackingRecord_studentId` FOREIGN KEY (`studentId`) REFERENCES `Student` (`id`) ON DELETE CASCADE;

ALTER TABLE `HistoryEntry` ADD CONSTRAINT `fk_HistoryEntry_studentId` FOREIGN KEY (`studentId`) REFERENCES `Student` (`id`) ON DELETE CASCADE;

ALTER TABLE `Invitation` ADD CONSTRAINT `fk_Invitation_studentId` FOREIGN KEY (`studentId`) REFERENCES `Student` (`id`) ON DELETE CASCADE;

ALTER TABLE `EnrollmentLink` ADD CONSTRAINT `fk_EnrollmentLink_personalId` FOREIGN KEY (`personalId`) REFERENCES `User` (`id`) ON DELETE CASCADE;

ALTER TABLE `EnrollmentChallenge` ADD CONSTRAINT `fk_EnrollmentChallenge_linkId` FOREIGN KEY (`linkId`) REFERENCES `EnrollmentLink` (`id`) ON DELETE CASCADE;

ALTER TABLE `EnrollmentRequest` ADD CONSTRAINT `fk_EnrollmentRequest_personalId` FOREIGN KEY (`personalId`) REFERENCES `User` (`id`) ON DELETE RESTRICT;

ALTER TABLE `EnrollmentRequest` ADD CONSTRAINT `fk_EnrollmentRequest_studentId` FOREIGN KEY (`studentId`) REFERENCES `Student` (`id`) ON DELETE CASCADE;

ALTER TABLE `EnrollmentEvent` ADD CONSTRAINT `fk_EnrollmentEvent_requestId` FOREIGN KEY (`requestId`) REFERENCES `EnrollmentRequest` (`id`) ON DELETE CASCADE;

ALTER TABLE `WorkoutPlan` ADD CONSTRAINT `fk_WorkoutPlan_studentId` FOREIGN KEY (`studentId`) REFERENCES `Student` (`id`) ON DELETE CASCADE;

ALTER TABLE `Workout` ADD CONSTRAINT `fk_Workout_planId` FOREIGN KEY (`planId`) REFERENCES `WorkoutPlan` (`id`) ON DELETE CASCADE;

ALTER TABLE `Exercise` ADD CONSTRAINT `fk_Exercise_ownerId` FOREIGN KEY (`ownerId`) REFERENCES `User` (`id`) ON DELETE RESTRICT;

ALTER TABLE `WorkoutExercise` ADD CONSTRAINT `fk_WorkoutExercise_workoutId` FOREIGN KEY (`workoutId`) REFERENCES `Workout` (`id`) ON DELETE CASCADE;

ALTER TABLE `WorkoutExercise` ADD CONSTRAINT `fk_WorkoutExercise_exerciseId` FOREIGN KEY (`exerciseId`) REFERENCES `Exercise` (`id`) ON DELETE RESTRICT;

ALTER TABLE `WorkoutExercise` ADD CONSTRAINT `fk_WorkoutExercise_alternativeExerciseId` FOREIGN KEY (`alternativeExerciseId`) REFERENCES `Exercise` (`id`) ON DELETE RESTRICT;

ALTER TABLE `WorkoutFeedback` ADD CONSTRAINT `fk_WorkoutFeedback_workoutId` FOREIGN KEY (`workoutId`) REFERENCES `Workout` (`id`) ON DELETE CASCADE;

ALTER TABLE `PrescriptionPreset` ADD CONSTRAINT `fk_PrescriptionPreset_ownerId` FOREIGN KEY (`ownerId`) REFERENCES `User` (`id`) ON DELETE CASCADE;

ALTER TABLE `WorkoutTemplate` ADD CONSTRAINT `fk_WorkoutTemplate_ownerId` FOREIGN KEY (`ownerId`) REFERENCES `User` (`id`) ON DELETE CASCADE;
