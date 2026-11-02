import { z } from 'zod';
import { dateSchema } from './validation';
export const fitnessGroupSchema=z.object({name:z.string().trim().min(1).max(120),description:z.string().trim().max(2000).default('')});
export const fitnessChallengeSchema=z.object({title:z.string().trim().min(1).max(120),startsAt:dateSchema,endsAt:dateSchema,goal:z.number().int().min(1).max(365)}).refine(d=>d.endsAt>=d.startsAt,'Término anterior ao início');
export type FitnessGroupSummary={id:string;name:string;description:string;inviteUrl?:string;members:number;ownerName:string};
export type FitnessGroupDetails=FitnessGroupSummary & {challenges:{id:string;title:string;startsAt:string;endsAt:string;goal:number;ranking:{name:string;count:number}[]}[];posts:{id:string;name:string;comment:string;photo:string;createdAt:string}[]};
