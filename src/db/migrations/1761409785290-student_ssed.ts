import { MigrationInterface, QueryRunner } from 'typeorm';

export class StudentSsed1761409785290 implements MigrationInterface {
  name = 'StudentSsed1761409785290';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`roles\` ADD \`visualizar_minhas_inscricoes\` tinyint NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(
      `ALTER TABLE \`course_periods\` DROP FOREIGN KEY \`FK_5a40ce4672c3dfe611477686f0c\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`course_periods\` CHANGE \`partner_prep_course_id\` \`partner_prep_course_id\` varchar(36) NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`course_periods\` ADD CONSTRAINT \`FK_5a40ce4672c3dfe611477686f0c\` FOREIGN KEY (\`partner_prep_course_id\`) REFERENCES \`partner_prep_course\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`course_periods\` DROP FOREIGN KEY \`FK_5a40ce4672c3dfe611477686f0c\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`course_periods\` CHANGE \`partner_prep_course_id\` \`partner_prep_course_id\` varchar(36) NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`course_periods\` ADD CONSTRAINT \`FK_5a40ce4672c3dfe611477686f0c\` FOREIGN KEY (\`partner_prep_course_id\`) REFERENCES \`partner_prep_course\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`roles\` DROP COLUMN \`visualizar_minhas_inscricoes\``,
    );
  }
}
