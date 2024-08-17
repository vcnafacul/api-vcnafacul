import { MigrationInterface, QueryRunner } from 'typeorm';

export class CursinhoParceiro1723925664244 implements MigrationInterface {
  name = 'CursinhoParceiro1723925664244';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "student_course" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "rg" integer NOT NULL, "cpf" integer NOT NULL, "urgencyPhone" character varying, "user_id" integer, "partner_prep_course_id" integer, CONSTRAINT "REL_4a3ce5cc99a42d5eaab2d3cc66" UNIQUE ("user_id"), CONSTRAINT "PK_140d2607308f60eda2ae0d72a4f" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "partner_prep_course" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "user_id" integer NOT NULL, "geo_id" integer NOT NULL, CONSTRAINT "REL_2abeb84841d3be03a58e85dc18" UNIQUE ("user_id"), CONSTRAINT "REL_b4d2f1d87d59673289b6129f65" UNIQUE ("geo_id"), CONSTRAINT "PK_947f4b80ff67a4024798fd87f17" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "inscription_course" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "name" character varying NOT NULL, "description" character varying NOT NULL, "start_date" TIMESTAMP NOT NULL, "end_date" TIMESTAMP NOT NULL, "actived" boolean NOT NULL DEFAULT true, "expected_opening" integer NOT NULL, "partnerPrepCourseId" integer, CONSTRAINT "PK_1727f254c13c331ce26623e7fdf" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "student_course" ADD CONSTRAINT "FK_4a3ce5cc99a42d5eaab2d3cc662" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "student_course" ADD CONSTRAINT "FK_af45625c0a8c76912b2b8da44d7" FOREIGN KEY ("partner_prep_course_id") REFERENCES "partner_prep_course"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "partner_prep_course" ADD CONSTRAINT "FK_2abeb84841d3be03a58e85dc18a" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "partner_prep_course" ADD CONSTRAINT "FK_b4d2f1d87d59673289b6129f65d" FOREIGN KEY ("geo_id") REFERENCES "geolocations"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "inscription_course" ADD CONSTRAINT "FK_0f38f4fd85b3feb600b36aadf07" FOREIGN KEY ("partnerPrepCourseId") REFERENCES "partner_prep_course"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "inscription_course" DROP CONSTRAINT "FK_0f38f4fd85b3feb600b36aadf07"`,
    );
    await queryRunner.query(
      `ALTER TABLE "partner_prep_course" DROP CONSTRAINT "FK_b4d2f1d87d59673289b6129f65d"`,
    );
    await queryRunner.query(
      `ALTER TABLE "partner_prep_course" DROP CONSTRAINT "FK_2abeb84841d3be03a58e85dc18a"`,
    );
    await queryRunner.query(
      `ALTER TABLE "student_course" DROP CONSTRAINT "FK_af45625c0a8c76912b2b8da44d7"`,
    );
    await queryRunner.query(
      `ALTER TABLE "student_course" DROP CONSTRAINT "FK_4a3ce5cc99a42d5eaab2d3cc662"`,
    );
    await queryRunner.query(`DROP TABLE "inscription_course"`);
    await queryRunner.query(`DROP TABLE "partner_prep_course"`);
    await queryRunner.query(`DROP TABLE "student_course"`);
  }
}
