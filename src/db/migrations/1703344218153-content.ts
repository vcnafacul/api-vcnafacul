import { MigrationInterface, QueryRunner } from 'typeorm';

export class Content1703344218153 implements MigrationInterface {
  name = 'Content1703344218153';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "frente" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "prev" integer, "next" integer, "head" integer, "tail" integer, "lenght" integer NOT NULL DEFAULT '0', "name" character varying NOT NULL, "materia" integer NOT NULL, CONSTRAINT "UQ_5776f69e94d06608a9be1ecf7da" UNIQUE ("name"), CONSTRAINT "PK_9039c69d12e0a85804c5443d323" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "subject" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "prev" integer, "next" integer, "head" integer, "tail" integer, "lenght" integer NOT NULL DEFAULT '0', "name" character varying NOT NULL, "description" text NOT NULL, "frenteId" integer, CONSTRAINT "UQ_d011c391e37d9a5e63e8b04c977" UNIQUE ("name"), CONSTRAINT "PK_12eee115462e38d62e5455fc054" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "content" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "prev" integer, "next" integer, "filename" character varying, "status" integer NOT NULL DEFAULT '3', "title" character varying NOT NULL, "description" text NOT NULL, "userId" integer, "subjectId" integer, CONSTRAINT "PK_6a2083913f3647b44f205204e36" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "roles" ADD "visualizar_demanda" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "roles" ADD "upload_demanda" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "roles" ADD "validar_demanda" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "roles" ADD "gerenciador_demanda" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "subject" ADD CONSTRAINT "FK_125d29f48682dabb6c905e84513" FOREIGN KEY ("frenteId") REFERENCES "frente"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "content" ADD CONSTRAINT "FK_43185da5e33e99752c6edf91352" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "content" ADD CONSTRAINT "FK_aca2d12589a8580b96b9d4dd76a" FOREIGN KEY ("subjectId") REFERENCES "subject"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "content" DROP CONSTRAINT "FK_aca2d12589a8580b96b9d4dd76a"`,
    );
    await queryRunner.query(
      `ALTER TABLE "content" DROP CONSTRAINT "FK_43185da5e33e99752c6edf91352"`,
    );
    await queryRunner.query(
      `ALTER TABLE "subject" DROP CONSTRAINT "FK_125d29f48682dabb6c905e84513"`,
    );
    await queryRunner.query(
      `ALTER TABLE "roles" DROP COLUMN "gerenciador_demanda"`,
    );
    await queryRunner.query(
      `ALTER TABLE "roles" DROP COLUMN "validar_demanda"`,
    );
    await queryRunner.query(`ALTER TABLE "roles" DROP COLUMN "upload_demanda"`);
    await queryRunner.query(
      `ALTER TABLE "roles" DROP COLUMN "visualizar_demanda"`,
    );
    await queryRunner.query(`DROP TABLE "content"`);
    await queryRunner.query(`DROP TABLE "subject"`);
    await queryRunner.query(`DROP TABLE "frente"`);
  }
}
