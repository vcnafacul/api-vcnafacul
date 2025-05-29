import { MigrationInterface, QueryRunner } from 'typeorm';

export class LastAccess1748456122442 implements MigrationInterface {
  name = 'LastAccess1748456122442';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`collaborators\` DROP COLUMN \`lastAccess\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`users\` ADD \`lastAccess\` datetime NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`users\` DROP COLUMN \`lastAccess\``);
    await queryRunner.query(
      `ALTER TABLE \`collaborators\` ADD \`lastAccess\` datetime NULL`,
    );
  }
}
