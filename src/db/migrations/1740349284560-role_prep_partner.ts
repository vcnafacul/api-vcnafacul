import { MigrationInterface, QueryRunner } from 'typeorm';

export class RolePrepPartner1740349284560 implements MigrationInterface {
  name = 'RolePrepPartner1740349284560';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`roles\` ADD \`gerenciar_estudantes\` tinyint NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(
      `ALTER TABLE \`roles\` ADD \`gerenciar_permissoes_cursinho\` tinyint NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(
      `ALTER TABLE \`roles\` ADD \`partnerPrepCourseId\` varchar(36) NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`roles\` ADD CONSTRAINT \`FK_cec05e348c89fb5cd1f96563466\` FOREIGN KEY (\`partnerPrepCourseId\`) REFERENCES \`partner_prep_course\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`roles\` DROP FOREIGN KEY \`FK_cec05e348c89fb5cd1f96563466\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`roles\` DROP COLUMN \`partnerPrepCourseId\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`roles\` DROP COLUMN \`gerenciar_permissoes_cursinho\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`roles\` DROP COLUMN \`gerenciar_estudantes\``,
    );
  }
}
