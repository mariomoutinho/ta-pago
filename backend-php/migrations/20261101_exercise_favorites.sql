-- Aplicar uma única vez, após backup privado, no banco existente.
ALTER TABLE `Exercise` ADD COLUMN `favorite` TINYINT(1) NOT NULL DEFAULT 0;
