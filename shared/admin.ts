export type AdminProfile = { id: string; name: string; email: string; role: "personal" | "student"; hasLogin: boolean; isAdmin: boolean; teachers: string[] };
export type AdminProfiles = { items: AdminProfile[]; total: number; page: number; pageSize: number; counts: { personal: number; student: number; withoutLogin: number } };
import { z } from 'zod';
import { passwordHasMinimum, PASSWORD_MINIMUM_MESSAGE } from './password';
export const adminPasswordSchema = z.object({ password: z.string().refine(passwordHasMinimum, PASSWORD_MINIMUM_MESSAGE) });
export const adminTeacherSchema = adminPasswordSchema.extend({ name: z.string().trim().min(2).max(120), email: z.email().transform(value => value.toLowerCase()) });
export const adminDeleteSchema = z.object({ confirm: z.literal(true) });
