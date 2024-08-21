import { MigrationInterface, QueryRunner } from 'typeorm';

export class Emailvalidationfix1714253528423 implements MigrationInterface {
  name = 'Emailvalidationfix1714253528423';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "email_confirm_sended" DROP NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "email_confirm_sended" SET NOT NULL`,
    );
  }
}
