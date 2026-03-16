import { MigrationInterface, QueryRunner } from 'typeorm';

export class RefactorForm1773508859781 implements MigrationInterface {
  name = 'RefactorForm1773508859781';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`roles\` ADD \`gerenciar_formulario_global\` tinyint NOT NULL DEFAULT 0`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`roles\` DROP COLUMN \`gerenciar_formulario_global\``,
    );
  }
}
