import { MigrationInterface, QueryRunner } from 'typeorm';

export class RefactorCreatePartner1753555213513 implements MigrationInterface {
  name = 'RefactorCreatePartner1753555213513';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX \`IDX_bb77120aa339d2f0550a669d5f\` ON \`partner_prep_course\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`partner_prep_course\` DROP COLUMN \`termOfUseUrl\``,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`partner_prep_course\` ADD \`termOfUseUrl\` varchar(255) NOT NULL`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`IDX_bb77120aa339d2f0550a669d5f\` ON \`partner_prep_course\` (\`representative\`)`,
    );
  }
}
