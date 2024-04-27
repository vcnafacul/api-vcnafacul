import { MigrationInterface, QueryRunner } from 'typeorm';

export class Emailvalidation1714233088800 implements MigrationInterface {
  name = 'Emailvalidation1714233088800';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD "email_confirm_sended" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN "email_confirm_sended"`,
    );
  }
}
