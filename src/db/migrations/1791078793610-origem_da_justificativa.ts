import { MigrationInterface, QueryRunner } from 'typeorm';

export class OrigemDaJustificativa1791078793610 implements MigrationInterface {
  name = 'OrigemDaJustificativa1791078793610';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`absence_justification\` ADD \`period_justification_id\` varchar(36) NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`absence_justification\` ADD CONSTRAINT \`FK_ccda32c0711e13e8f77c352b978\` FOREIGN KEY (\`period_justification_id\`) REFERENCES \`period_justification\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`absence_justification\` DROP FOREIGN KEY \`FK_ccda32c0711e13e8f77c352b978\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`absence_justification\` DROP COLUMN \`period_justification_id\``,
    );
  }
}
