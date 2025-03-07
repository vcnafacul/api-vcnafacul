import { MigrationInterface, QueryRunner } from 'typeorm';

export class RolesTurmasEstudante1741210845167 implements MigrationInterface {
  name = 'RolesTurmasEstudante1741210845167';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`roles\` ADD \`visualizar_turmas\` tinyint NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(
      `ALTER TABLE \`roles\` ADD \`visualizar_estudantes\` tinyint NOT NULL DEFAULT 0`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`roles\` DROP COLUMN \`visualizar_estudantes\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`roles\` DROP COLUMN \`visualizar_turmas\``,
    );
  }
}
