import { MigrationInterface, QueryRunner } from 'typeorm';

export class Emailvalidation1714151853505 implements MigrationInterface {
  name = 'Emailvalidation1714151853505';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD "emailConfirmSended" TIMESTAMP NOT NULL DEFAULT now()`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN "emailConfirmSended"`,
    );
  }
}
