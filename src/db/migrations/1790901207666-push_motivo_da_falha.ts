import { MigrationInterface, QueryRunner } from 'typeorm';

export class PushMotivoDaFalha1790901207666 implements MigrationInterface {
  name = 'PushMotivoDaFalha1790901207666';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`push_notification\` ADD \`failure_reasons\` json NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`push_notification\` DROP COLUMN \`failure_reasons\``,
    );
  }
}
