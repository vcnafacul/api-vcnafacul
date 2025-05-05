import { MigrationInterface, QueryRunner } from 'typeorm';

export class PartnerRefactor1746489024760 implements MigrationInterface {
  name = 'PartnerRefactor1746489024760';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`partner_prep_course\` ADD \`partnershipAgreement\` varchar(255) NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`partner_prep_course\` ADD \`logo\` varchar(255) NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`partner_prep_course\` ADD \`termOfUseUrl\` varchar(255) NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`partner_prep_course\` ADD \`representative\` varchar(36) NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`partner_prep_course\` ADD UNIQUE INDEX \`IDX_bb77120aa339d2f0550a669d5f\` (\`representative\`)`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_bb77120aa339d2f0550a669d5f\` ON \`partner_prep_course\` (\`representative\`)`,
    );
    await queryRunner.query(
      `ALTER TABLE \`partner_prep_course\` ADD CONSTRAINT \`FK_bb77120aa339d2f0550a669d5f1\` FOREIGN KEY (\`representative\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`partner_prep_course\` DROP FOREIGN KEY \`FK_bb77120aa339d2f0550a669d5f1\``,
    );
    await queryRunner.query(
      `DROP INDEX \`REL_bb77120aa339d2f0550a669d5f\` ON \`partner_prep_course\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`partner_prep_course\` DROP INDEX \`IDX_bb77120aa339d2f0550a669d5f\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`partner_prep_course\` DROP COLUMN \`representative\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`partner_prep_course\` DROP COLUMN \`termOfUseUrl\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`partner_prep_course\` DROP COLUMN \`logo\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`partner_prep_course\` DROP COLUMN \`partnershipAgreement\``,
    );
  }
}
