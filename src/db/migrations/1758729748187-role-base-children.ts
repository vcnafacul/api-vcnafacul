import { MigrationInterface, QueryRunner } from 'typeorm';

export class RoleBaseChildren1758729748187 implements MigrationInterface {
  name = 'RoleBaseChildren1758729748187';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`roles\` ADD \`roleBaseId\` varchar(36) NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`roles\` ADD CONSTRAINT \`FK_ebb617a8858f994d50b5034c551\` FOREIGN KEY (\`roleBaseId\`) REFERENCES \`roles\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`roles\` DROP FOREIGN KEY \`FK_ebb617a8858f994d50b5034c551\``,
    );
    await queryRunner.query(`ALTER TABLE \`roles\` DROP COLUMN \`roleBaseId\``);
  }
}
