import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
it('a migration de feedback preserva registros anteriores e valida a sessão referenciada', () => {
  const db = new DatabaseSync(':memory:');
  try {
    db.exec(`PRAGMA foreign_keys=ON;
      CREATE TABLE WorkoutCompletion (id TEXT PRIMARY KEY);
      CREATE TABLE WorkoutFeedback (id TEXT PRIMARY KEY, comment TEXT NOT NULL);
      INSERT INTO WorkoutFeedback VALUES ('old','Mensagem anterior');`);
    db.exec(readFileSync('prisma/migrations/20261126190000_feedback_completion/migration.sql', 'utf8'));
    expect({ ...db.prepare('SELECT * FROM WorkoutFeedback').get() }).toEqual({ id: 'old', comment: 'Mensagem anterior', completionId: null });
    expect(() => db.exec("INSERT INTO WorkoutFeedback VALUES ('invalid','Mensagem','foreign')")).toThrow();
    db.exec("INSERT INTO WorkoutCompletion VALUES ('session'); INSERT INTO WorkoutFeedback VALUES ('new','Atual','session'); DELETE FROM WorkoutCompletion WHERE id='session'");
    expect(db.prepare("SELECT completionId FROM WorkoutFeedback WHERE id='new'").get()!.completionId).toBeNull();
    expect(db.prepare('SELECT COUNT(*) AS count FROM WorkoutFeedback').get()!.count).toBe(2);
  } finally { db.close(); }
});
