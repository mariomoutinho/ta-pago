import { z } from "zod";
import { HttpError } from "./evaluations";
export const orderSchema = z.object({ revision: z.number().int().positive(), ids: z.array(z.string().min(1)).max(100) });
export function ordered<T>(items: T[], ids: string[], key: (item: T) => string | undefined): T[] {
  if (ids.length !== items.length || new Set(ids).size !== ids.length || items.some(item => !ids.includes(key(item) ?? "")))
    throw new HttpError(409, "A lista mudou. Salve as alterações e abra novamente antes de reordenar.");
  return ids.map(id => items.find(item => key(item) === id)!);
}
