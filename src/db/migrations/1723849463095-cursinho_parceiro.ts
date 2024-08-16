import { MigrationInterface, QueryRunner } from 'typeorm';

export class CursinhoParceiro1723849463095 implements MigrationInterface {
  name = 'CursinhoParceiro1723849463095';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "cursinho_parceiro" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "user_id" integer NOT NULL, "geo_id" integer NOT NULL, CONSTRAINT "REL_1f525f1bd31fb20bb6875d8672" UNIQUE ("user_id"), CONSTRAINT "REL_c58857715d3073d846c3168842" UNIQUE ("geo_id"), CONSTRAINT "PK_d6134309aaa189e5eaa9d76691e" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "cursinho_parceiro" ADD CONSTRAINT "FK_1f525f1bd31fb20bb6875d86721" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "cursinho_parceiro" ADD CONSTRAINT "FK_c58857715d3073d846c3168842a" FOREIGN KEY ("geo_id") REFERENCES "geolocations"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "cursinho_parceiro" DROP CONSTRAINT "FK_c58857715d3073d846c3168842a"`,
    );
    await queryRunner.query(
      `ALTER TABLE "cursinho_parceiro" DROP CONSTRAINT "FK_1f525f1bd31fb20bb6875d86721"`,
    );
    await queryRunner.query(`DROP TABLE "cursinho_parceiro"`);
  }
}
