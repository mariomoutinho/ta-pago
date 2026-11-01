import fs from "node:fs";
import path from "node:path";
import { createHash, randomBytes } from "node:crypto";
import type { Db } from "./db";
import type { NewsItem } from "../shared/notifications";
import { unseal } from "./enrollment-crypto";
import { retentionDays } from "./enrollment";
import { HttpError } from "./evaluations";

export async function newsEvents(db: Db, owner: string): Promise<Omit<NewsItem,"read">[]> {
  const since=new Date(Date.now()-Math.min(90,retentionDays())*86400000);
  const [enrollments,completions,feedbacks]=await Promise.all([
    db.enrollmentRequest.findMany({where:{personalId:owner,createdAt:{gte:since}},orderBy:{createdAt:"desc"},take:100}),
    db.workoutCompletion.findMany({where:{createdAt:{gte:since},workout:{plan:{student:{personalId:owner}}}},include:{workout:{select:{name:true,plan:{select:{student:{select:{id:true,name:true}}}}}}},orderBy:{createdAt:"desc"},take:100}),
    db.workoutFeedback.findMany({where:{createdAt:{gte:since},workout:{plan:{student:{personalId:owner}}}},include:{workout:{select:{name:true,plan:{select:{student:{select:{id:true,name:true}}}}}}},orderBy:{createdAt:"desc"},take:100}),
  ]);
  const items:Omit<NewsItem,"read">[]=enrollments.map(row=>({id:row.id,kind:"enrollment",title:`${unseal<{name:string}>(row.payload).name} enviou um cadastro.`,createdAt:row.createdAt.toISOString(),url:row.status==="active"&&row.studentId?`/alunos/${row.studentId}`:"/alunos/cadastros"}));
  for(const [rows,kind] of [[completions,"workout_completed"],[feedbacks,"feedback"]] as const) for(const row of rows){
    const student=row.workout.plan.student;
    items.push({id:(kind==="feedback"?"feedback:":"completion:")+row.id,kind,title:student.name+(kind==="feedback"?" enviou um feedback sobre ":" concluiu ")+row.workout.name+".",createdAt:row.createdAt.toISOString(),url:`/alunos/${student.id}/treinos`});
  }
  return items.sort((a,b)=>b.createdAt.localeCompare(a.createdAt)||a.id.localeCompare(b.id)).slice(0,100);
}
function readFile(owner:string){
  const directory=path.join(path.resolve(process.env.PERSONAL_PUSH_DIRECTORY??"data/push"),"read");fs.mkdirSync(directory,{recursive:true,mode:0o700});
  return path.join(directory,createHash("sha256").update(owner).digest("hex")+".json");
}
export async function newsFeed(db:Db,owner:string):Promise<NewsItem[]>{
  const file=readFile(owner),read:string[]=fs.existsSync(file)?JSON.parse(fs.readFileSync(file,"utf8")):[];
  return (await newsEvents(db,owner)).map(item=>({...item,read:read.includes(item.id)}));
}
export async function markNewsRead(db:Db,owner:string,ids:unknown){
  if(!Array.isArray(ids)||ids.length>100||ids.some(id=>typeof id!=="string"||id.length>128))throw new HttpError(400,"Avisos inválidos");
  const allowed=new Set((await newsEvents(db,owner)).map(item=>item.id));if(ids.some(id=>!allowed.has(id)))throw new HttpError(404,"Aviso não encontrado");
  const file=readFile(owner),lock=file+".lock";let fd:number;
  try{fd=fs.openSync(lock,"wx",0o600);}catch{throw new HttpError(409,"Tente novamente em alguns instantes");}
  try{
    const old:string[]=fs.existsSync(file)?JSON.parse(fs.readFileSync(file,"utf8")):[];
    const temporary=file+"."+randomBytes(8).toString("hex");
    fs.writeFileSync(temporary,JSON.stringify([...new Set([...old,...ids])].slice(-5000)),{mode:0o600});fs.renameSync(temporary,file);
  }finally{fs.closeSync(fd);fs.unlinkSync(lock);}
}
