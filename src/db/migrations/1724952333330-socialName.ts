import { MigrationInterface, QueryRunner } from 'typeorm';

export class SocialName1724952333330 implements MigrationInterface {
  name = 'SocialName1724952333330';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`users\` ADD \`socialName\` varchar(255) NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`users\` DROP COLUMN \`socialName\``);
  }
}
