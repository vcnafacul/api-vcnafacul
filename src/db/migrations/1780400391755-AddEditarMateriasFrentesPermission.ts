import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEditarMateriasFrentesPermission1780400391755
  implements MigrationInterface
{
  name = 'AddEditarMateriasFrentesPermission1780400391755';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`roles\` ADD \`editar_materias_frentes\` tinyint NOT NULL DEFAULT 0`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`roles\` DROP COLUMN \`editar_materias_frentes\``,
    );
  }
}
