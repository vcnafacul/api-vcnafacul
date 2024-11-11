import { MigrationInterface, QueryRunner } from 'typeorm';

export class PrepPartnerMembers1731279552364 implements MigrationInterface {
  name = 'PrepPartnerMembers1731279552364';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`users\` ADD \`partner_prep_course_id\` varchar(36) NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`users\` ADD CONSTRAINT \`FK_2cef8c4e2dc48dcb2db298e5efd\` FOREIGN KEY (\`partner_prep_course_id\`) REFERENCES \`partner_prep_course\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`users\` DROP FOREIGN KEY \`FK_2cef8c4e2dc48dcb2db298e5efd\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`users\` DROP COLUMN \`partner_prep_course_id\``,
    );
  }
}
