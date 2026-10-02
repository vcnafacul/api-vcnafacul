import { MigrationInterface, QueryRunner } from 'typeorm';

export class PushQuantosLeram1790905329002 implements MigrationInterface {
  name = 'PushQuantosLeram1790905329002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`push_notification\` ADD \`pessoas_count\` int NOT NULL DEFAULT '0'`,
    );
    await queryRunner.query(
      `ALTER TABLE \`push_notification\` ADD \`lidas_count\` int NOT NULL DEFAULT '0'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`push_notification\` DROP COLUMN \`lidas_count\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`push_notification\` DROP COLUMN \`pessoas_count\``,
    );
  }
}
