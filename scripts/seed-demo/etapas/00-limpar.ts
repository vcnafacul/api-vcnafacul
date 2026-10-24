import { BANCO_DEMO, conferirTrava } from '../ambiente';
import { DOMINIO_DEMO } from '../config';
import { Contexto } from '../contexto';

/**
 * Tudo que o seed escreve e tudo que a app preenche ligado a usuário,
 * cursinho, turma ou aluno. Fica de fora só o que vem das migrations
 * (`migrations`, `typeorm_metadata`, roles base) e conteúdo do site (home,
 * news). Ordem filho → pai. O banco é só do demo (trava do ambiente.ts).
 */
const TABELAS = [
  'indicador_diario_turma',
  'absence_justification',
  'period_justification',
  'student_attendance',
  'attendance_record',
  'log_student',
  'document_student',
  'legal_guardian',
  'student_course_inscription_courses_inscription_course',
  'student_course',
  'class_essay_snapshots',
  'classes_collaborators',
  'classes',
  'course_periods',
  'inscription_course',
  'simulado_evento_inscricao',
  'simulado_evento_prova',
  'simulado_evento',
  'cursinho_link',
  'cursinho_pagina',
  'convites_colaborador',
  'collaborator_frentes',
  'collaborators',
  'log_partner',
  'partner_prep_course',
  'geo_confirmations',
  'log_geo',
  'geolocations',
  'notificacao_do_usuario',
  'push_resultado_cartao',
  'push_recalculo_anulacao',
  'push_notification',
  'push_device',
  'essay_ai_reviews',
  'essay_reviews',
  'essays',
  'essay_themes',
  'audit_logs',
];

/** Apaga tudo: só com o env do demo E conectado de fato nos bancos do demo. */
async function conferirBancosConectados(ctx: Contexto) {
  try {
    conferirTrava(process.env);
  } catch (e) {
    throw new Error(`00-limpar recusado: ${(e as Error).message}`);
  }
  const [{ db }] = await ctx.ds.query('SELECT DATABASE() AS db');
  if (db !== BANCO_DEMO.mysqlDb)
    throw new Error(
      `00-limpar recusado: MySQL conectado em "${db}", não em ${BANCO_DEMO.mysqlDb}.`,
    );
  if (ctx.form.databaseName !== BANCO_DEMO.mongoDb)
    throw new Error(
      `00-limpar recusado: Mongo conectado em "${ctx.form.databaseName}", não em ${BANCO_DEMO.mongoDb}.`,
    );
}

export async function executar(ctx: Contexto) {
  await conferirBancosConectados(ctx);
  await ctx.ds.query('SET FOREIGN_KEY_CHECKS = 0');
  try {
    for (const t of TABELAS) await ctx.ds.query(`DELETE FROM \`${t}\``);
    await ctx.ds.query(
      'DELETE FROM roles WHERE partnerPrepCourseId IS NOT NULL',
    );
    await ctx.ds.query('DELETE FROM users WHERE email LIKE ?', [
      `%@${DOMINIO_DEMO}`,
    ]);
  } finally {
    await ctx.ds.query('SET FOREIGN_KEY_CHECKS = 1');
  }
  await ctx.form.dropDatabase();
  console.log('00 limpar: banco do demo zerado (MySQL + Mongo)');
}
