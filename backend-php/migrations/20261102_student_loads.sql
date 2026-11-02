-- Preserva a carga prescrita; ajustes do aluno ficam em campo separado.
ALTER TABLE `WorkoutExercise` ADD COLUMN `studentLoads` JSON NULL;
