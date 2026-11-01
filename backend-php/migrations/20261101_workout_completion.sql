-- Migração aditiva: preserva treinos e feedbacks existentes.
CREATE TABLE `WorkoutCompletion` (
  `id` VARCHAR(191) NOT NULL PRIMARY KEY,
  `workoutId` VARCHAR(191) NOT NULL,
  `completedOn` VARCHAR(191) NOT NULL,
  `createdAt` VARCHAR(24) NOT NULL,
  UNIQUE KEY `uq_WorkoutCompletion_0` (`workoutId`,`completedOn`),
  KEY `ix_WorkoutCompletion_0` (`createdAt`),
  CONSTRAINT `fk_WorkoutCompletion_workoutId` FOREIGN KEY (`workoutId`) REFERENCES `Workout` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;
