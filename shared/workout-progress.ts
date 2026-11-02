import type { Prescription } from './workouts';
export const prescribedSets = (item: Pick<Prescription,'series'|'sets'>): number[] => item.series.length ? item.series.map(row=>row.sets) : [item.sets ?? 1];
export const exerciseFinished = (sets: number[], completed: number[]) => sets.length > 0 && sets.every((total,i)=>(completed[i]??0)>=total);
