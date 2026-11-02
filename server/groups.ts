import { Router } from 'express';
import { randomBytes } from 'node:crypto';
import type { Db } from './db';
import { HttpError } from './evaluations';
import { fitnessGroupSchema,fitnessChallengeSchema } from '../shared/groups';
export async function validateGroupPost(db:Pick<Db,'fitnessGroup'|'fitnessGroupMember'>,id:string,accountId:string,ownerId:string){
  if(!await db.fitnessGroup.findFirst({where:{id,ownerId,members:{some:{accountId}}}}))throw new HttpError(403,'Entre no grupo antes de compartilhar');
}
export function groupRoutes(db:Db){
  const router=Router();
  const activeMember=async(id:string,accountId:string,ownerId:string)=>!!await db.fitnessGroupMember.findFirst({where:{groupId:id,accountId,account:{profiles:{some:{personalId:ownerId,linkStatus:'active'}}}}});
  const summary=async(g:any,userId:string,origin:string)=>({id:g.id,name:g.name,description:g.description,ownerName:(await db.user.findUniqueOrThrow({where:{id:g.ownerId},select:{name:true}})).name,members:await db.fitnessGroupMember.count({where:{groupId:g.id,account:{profiles:{some:{personalId:g.ownerId,linkStatus:'active'}}}}}),...(g.ownerId===userId?{inviteUrl:origin+'/grupo/'+g.inviteCode}:{})});
  router.get('/fitness-groups',async(req,res)=>{
    const user=res.locals.user;const groups=await db.fitnessGroup.findMany({where:user.role==='personal'?{ownerId:user.id}:{members:{some:{accountId:user.id}}}});
    const visible=[];for(const g of groups)if(user.role==='personal'||await activeMember(g.id,user.id,g.ownerId))visible.push(await summary(g,user.id,`${req.protocol}://${req.get('host')}`));res.json(visible);
  });
  router.post('/fitness-groups',async(req,res)=>{if(res.locals.user.role!=='personal')throw new HttpError(403,'Acesso do personal');const g=await db.fitnessGroup.create({data:{...fitnessGroupSchema.parse(req.body),ownerId:res.locals.user.id,inviteCode:randomBytes(24).toString('hex')}});res.status(201).json(await summary(g,res.locals.user.id,`${req.protocol}://${req.get('host')}`));});
  router.route('/fitness-groups/invite/:code').get(async(req,res)=>{const g=await db.fitnessGroup.findUnique({where:{inviteCode:String(req.params.code)}});if(!g)throw new HttpError(404,'Convite não encontrado');res.json({...await summary(g,res.locals.user.id,`${req.protocol}://${req.get('host')}`),joined:await activeMember(g.id,res.locals.user.id,g.ownerId)});}).post(async(req,res)=>{
    const g=await db.fitnessGroup.findUnique({where:{inviteCode:String(req.params.code)}}),user=res.locals.user;
    if(!g)throw new HttpError(404,'Convite não encontrado');if(user.role!=='student'||!await db.student.findFirst({where:{personalId:g.ownerId,accountId:user.id,linkStatus:'active'}}))throw new HttpError(403,'O convite é para alunos vinculados a este personal');
    await db.fitnessGroupMember.upsert({where:{groupId_accountId:{groupId:g.id,accountId:user.id}},create:{groupId:g.id,accountId:user.id},update:{}});res.json({id:g.id,joined:true});
  });
  router.post('/fitness-groups/:id/leave',async(req,res)=>{
    if(res.locals.user.role!=='student')throw new HttpError(403,'Acesso do aluno');const groupId=String(req.params.id),accountId=res.locals.user.id;
    await db.$transaction(async tx=>{if(!await tx.fitnessGroupMember.findUnique({where:{groupId_accountId:{groupId,accountId}}}))throw new HttpError(404,'Grupo não encontrado');await tx.workoutFeedback.updateMany({where:{groupId,workout:{plan:{student:{accountId}}}},data:{groupId:null}});await tx.fitnessGroupMember.delete({where:{groupId_accountId:{groupId,accountId}}});});res.json({ok:true});
  });
  router.post('/fitness-groups/:id/challenges',async(req,res)=>{const g=await db.fitnessGroup.findFirst({where:{id:String(req.params.id),ownerId:res.locals.user.id}});if(!g||res.locals.user.role!=='personal')throw new HttpError(404,'Grupo não encontrado');res.status(201).json(await db.fitnessChallenge.create({data:{...fitnessChallengeSchema.parse(req.body),groupId:g.id}}));});
  router.get('/fitness-groups/:id',async(req,res)=>{
    const g=await db.fitnessGroup.findUnique({where:{id:String(req.params.id)}}),user=res.locals.user;
    if(!g||!(g.ownerId===user.id||await activeMember(g.id,user.id,g.ownerId)))throw new HttpError(404,'Grupo não encontrado');
    const members=await db.fitnessGroupMember.findMany({where:{groupId:g.id,account:{profiles:{some:{personalId:g.ownerId,linkStatus:'active'}}}},include:{account:{select:{name:true}}}});
    const challenges=[];for(const c of await db.fitnessChallenge.findMany({where:{groupId:g.id},orderBy:{createdAt:'desc'}})){const ranking=[];for(const m of members)ranking.push({name:m.account.name,count:await db.workoutCompletion.count({where:{createdAt:{gte:m.joinedAt},completedOn:{gte:c.startsAt,lte:c.endsAt},workout:{plan:{student:{accountId:m.accountId,personalId:g.ownerId}}}}})});ranking.sort((a,b)=>b.count-a.count||a.name.localeCompare(b.name));challenges.push({...c,ranking});}
    const posts=await db.workoutFeedback.findMany({where:{groupId:g.id,workout:{plan:{student:{personalId:g.ownerId,linkStatus:'active',accountId:{in:members.map(m=>m.accountId)}}}}},orderBy:{createdAt:'desc'},take:30,select:{id:true,comment:true,photo:true,createdAt:true,workout:{select:{plan:{select:{student:{select:{account:{select:{name:true}}}}}}}}}});
    res.json({...await summary(g,user.id,`${req.protocol}://${req.get('host')}`),challenges,posts:posts.map(({workout,...p})=>({...p,name:workout.plan.student.account?.name??'Aluno'}))});
  });return router;
}
