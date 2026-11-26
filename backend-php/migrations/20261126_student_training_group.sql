-- Rótulo de organização do cadastro, restrito ao personal responsável.
ALTER TABLE `Student` ADD COLUMN `trainingGroup` VARCHAR(120) NOT NULL DEFAULT '';
