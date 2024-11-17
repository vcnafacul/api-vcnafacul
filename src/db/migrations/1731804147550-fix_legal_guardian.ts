import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixLegalGuardian1731804147550 implements MigrationInterface {
  name = 'FixLegalGuardian1731804147550';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`student_course\` DROP FOREIGN KEY \`FK_20cea178b87e8475b734004f9ed\``,
    );
    await queryRunner.query(
      `DROP INDEX \`REL_20cea178b87e8475b734004f9e\` ON \`student_course\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`student_course\` DROP COLUMN \`legal_guardian_id\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`inscription_course\` CHANGE \`description\` \`description\` varchar(255) NOT NULL DEFAULT ''`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`inscription_course\` CHANGE \`description\` \`description\` varchar(255) NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`student_course\` ADD \`legal_guardian_id\` varchar(36) NULL`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_20cea178b87e8475b734004f9e\` ON \`student_course\` (\`legal_guardian_id\`)`,
    );
    await queryRunner.query(
      `ALTER TABLE \`student_course\` ADD CONSTRAINT \`FK_20cea178b87e8475b734004f9ed\` FOREIGN KEY (\`legal_guardian_id\`) REFERENCES \`legal_guardian\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }
}
