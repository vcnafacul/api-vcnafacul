import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBqQuestao1696102513702 implements MigrationInterface {
  name = 'AddBqQuestao1696102513702';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "roles" ADD "banco_questoes" boolean NOT NULL DEFAULT false`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "roles" DROP COLUMN "banco_questoes"`);
  }
}
