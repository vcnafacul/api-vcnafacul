import { MigrationInterface, QueryRunner } from 'typeorm';

export class RequestDocuments1744580156394 implements MigrationInterface {
  name = 'RequestDocuments1744580156394';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`inscription_course\` ADD \`requestDocuments\` tinyint NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(
      `ALTER TABLE \`student_course\` CHANGE \`rg\` \`rg\` varchar(255) NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`student_course\` CHANGE \`uf\` \`uf\` varchar(255) NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`student_course\` CHANGE \`uf\` \`uf\` varchar(255) NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`student_course\` CHANGE \`rg\` \`rg\` varchar(255) NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`inscription_course\` DROP COLUMN \`requestDocuments\``,
    );
  }
}
