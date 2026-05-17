import { MigrationInterface, QueryRunner } from 'typeorm';

export class NewsRichText1777169513218 implements MigrationInterface {
  name = 'NewsRichText1777169513218';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`news\` ADD \`body\` text NULL`);
    await queryRunner.query(
      `ALTER TABLE \`news\` ADD \`content_type\` enum ('file', 'text') NOT NULL DEFAULT 'file'`,
    );
    await queryRunner.query(
      `ALTER TABLE \`news\` CHANGE \`fileName\` \`fileName\` varchar(255) NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`news\` CHANGE \`fileName\` \`fileName\` varchar(255) NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`news\` DROP COLUMN \`content_type\``,
    );
    await queryRunner.query(`ALTER TABLE \`news\` DROP COLUMN \`body\``);
  }
}
