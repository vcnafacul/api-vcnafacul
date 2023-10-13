import { MigrationInterface, QueryRunner } from 'typeorm';

export class News1697235538819 implements MigrationInterface {
  name = 'News1697235538819';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "news" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "session" character varying NOT NULL, "title" character varying NOT NULL, "fileName" character varying NOT NULL, "updated_by" integer NOT NULL, CONSTRAINT "PK_39a43dfcb6007180f04aff2357e" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "news" ADD CONSTRAINT "FK_5ba7f768b1fcb8278686537e14b" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "news" DROP CONSTRAINT "FK_5ba7f768b1fcb8278686537e14b"`,
    );
    await queryRunner.query(`DROP TABLE "news"`);
  }
}
