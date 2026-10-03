import { MigrationInterface, QueryRunner } from 'typeorm';

export class ColaboradorFuncaoAntesDeInativar1791069447709
  implements MigrationInterface
{
  name = 'ColaboradorFuncaoAntesDeInativar1791069447709';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`collaborators\` ADD \`role_before_inactive_id\` varchar(36) NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`collaborators\` ADD CONSTRAINT \`FK_f8b4c8849388bc3e385ceae8ae2\` FOREIGN KEY (\`role_before_inactive_id\`) REFERENCES \`roles\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`collaborators\` DROP FOREIGN KEY \`FK_f8b4c8849388bc3e385ceae8ae2\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`collaborators\` DROP COLUMN \`role_before_inactive_id\``,
    );
  }
}
