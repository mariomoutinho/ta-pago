-- Aditiva: preserva feedbacks e conclusões existentes.
ALTER TABLE `WorkoutFeedback` ADD COLUMN `completionId` VARCHAR(191) NULL;
ALTER TABLE `WorkoutFeedback` ADD CONSTRAINT `fk_WorkoutFeedback_completionId` FOREIGN KEY (`completionId`) REFERENCES `WorkoutCompletion` (`id`) ON DELETE SET NULL;
