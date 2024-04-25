import { MigrationInterface, QueryRunner } from 'typeorm';

export class Emailvalidation1713902322803 implements MigrationInterface {
  name = 'Emailvalidation1713902322803';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD "emailValided" boolean NOT NULL DEFAULT false`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "emailValided"`);
  }
}
