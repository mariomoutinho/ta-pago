import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { z } from "zod";
import type { Db } from "./db";
import { HttpError } from "./evaluations";
import { hashPassword, sessionKey } from "./security";
import {passwordHasMinimum,PASSWORD_MINIMUM_MESSAGE} from '../shared/password';

export function studentAccessRoutes(db:Db){
  const router=Router();
  router.use(rateLimit({windowMs:900000,limit:20,standardHeaders:'draft-8',legacyHeaders:false}));
  router.route('/:code').get(async(req,res)=>{
    const invite=await invitation(db,String(req.params.code));
    const existing=await db.user.findUnique({where:{email:invite.student.email.toLowerCase()}});
    res.json({name:invite.student.name,email:invite.student.email,existingAccount:!!existing});
  }).post(async(req,res)=>{
    const password=z.string().refine(passwordHasMinimum,PASSWORD_MINIMUM_MESSAGE).parse(req.body.password);
    const passwordHash=await hashPassword(password);
    await db.$transaction(async tx=>{
      const invite=await invitation(tx,String(req.params.code));
      if(await tx.user.findUnique({where:{email:invite.student.email.toLowerCase()}}))throw new HttpError(409,'Você já tem conta. Entre com sua senha e aceite o convite.');
      const consumed=await tx.invitation.updateMany({where:{id:invite.id,consumedAt:null},data:{consumedAt:new Date()}});
      if(consumed.count!==1)throw new HttpError(400,'Convite inválido ou expirado');
      const user=await tx.user.create({data:{name:invite.student.name,email:invite.student.email.toLowerCase(),role:'student',passwordHash}});
      await tx.student.update({where:{id:invite.studentId},data:{accountId:user.id,linkStatus:'active'}});
      await tx.historyEntry.create({data:{studentId:invite.studentId,action:'Acesso ativado pelo aluno',detail:{}}});
    });res.status(201).json({ok:true});
  });return router;
}
async function invitation(db:Pick<Db,'invitation'|'enrollmentRequest'>,code:string){
  if(!/^[a-f0-9]{64}$/.test(code))throw new HttpError(400,'Convite inválido ou expirado');
  const invite=await db.invitation.findUnique({where:{tokenHash:sessionKey(code)},include:{student:true}});
  if(!invite||invite.consumedAt||invite.expiresAt<=new Date()||invite.student.accountId||invite.student.linkStatus==='ended'||!invite.student.email)throw new HttpError(400,'Convite inválido ou expirado');
  const enrollment=await db.enrollmentRequest.findFirst({where:{studentId:invite.studentId,status:'active'}});
  if(!enrollment)throw new HttpError(400,'Convite inválido ou expirado');
  return invite;
}
