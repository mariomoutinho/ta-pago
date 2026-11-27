export type AdminProfile = { id: string; name: string; email: string; role: "personal" | "student"; hasLogin: boolean; isAdmin: boolean; teachers: string[] };
export type AdminProfiles = { items: AdminProfile[]; total: number; page: number; pageSize: number; counts: { personal: number; student: number; withoutLogin: number } };
