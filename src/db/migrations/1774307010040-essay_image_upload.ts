import { MigrationInterface, QueryRunner } from 'typeorm';

export class EssayImageUpload1774307010040 implements MigrationInterface {
  name = 'EssayImageUpload1774307010040';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`essays\` ADD \`image_key\` varchar(255) NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`essays\` ADD \`original_filename\` varchar(255) NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`essays\` ADD \`mime_type\` varchar(50) NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`essays\` DROP COLUMN \`mime_type\``);
    await queryRunner.query(
      `ALTER TABLE \`essays\` DROP COLUMN \`original_filename\``,
    );
    await queryRunner.query(`ALTER TABLE \`essays\` DROP COLUMN \`image_key\``);
  }
}
