import { createDb } from "./db";
import { purgeEnrollments } from "./enrollment";
const db = createDb();
try {
  const result = await purgeEnrollments(db);
  console.log(`Solicitações expiradas removidas: ${result.count}`);
} finally {
  await db.$disconnect();
}
