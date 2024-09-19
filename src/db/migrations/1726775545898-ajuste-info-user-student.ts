import { MigrationInterface, QueryRunner } from 'typeorm';

export class AjusteInfoUserStudent1726775545898 implements MigrationInterface {
  name = 'AjusteInfoUserStudent1726775545898';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`legal_guardian\` (\`id\` varchar(36) NOT NULL, \`created_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP, \`updated_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP, \`deleted_at\` timestamp NULL, \`fullName\` varchar(255) NOT NULL, \`phone\` varchar(255) NOT NULL, \`rg\` varchar(255) NOT NULL, \`uf\` varchar(255) NOT NULL, \`cpf\` varchar(255) NOT NULL, \`student_course_id\` varchar(36) NULL, UNIQUE INDEX \`REL_ddeac10c3c6f8ac059519f0cf6\` (\`student_course_id\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `ALTER TABLE \`student_course\` ADD \`email\` varchar(255) NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`student_course\` ADD \`whatsapp\` varchar(255) NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`student_course\` ADD \`legal_guardian_id\` varchar(36) NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`student_course\` ADD UNIQUE INDEX \`IDX_20cea178b87e8475b734004f9e\` (\`legal_guardian_id\`)`,
    );
    await queryRunner.query(
      `ALTER TABLE \`users\` ADD \`street\` varchar(255) NULL`,
    );
    await queryRunner.query(`ALTER TABLE \`users\` ADD \`number\` int NULL`);
    await queryRunner.query(
      `ALTER TABLE \`users\` ADD \`PostalCode\` varchar(255) NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`users\` ADD \`neighborhood\` varchar(255) NULL`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_20cea178b87e8475b734004f9e\` ON \`student_course\` (\`legal_guardian_id\`)`,
    );
    await queryRunner.query(
      `ALTER TABLE \`legal_guardian\` ADD CONSTRAINT \`FK_ddeac10c3c6f8ac059519f0cf67\` FOREIGN KEY (\`student_course_id\`) REFERENCES \`student_course\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`student_course\` ADD CONSTRAINT \`FK_20cea178b87e8475b734004f9ed\` FOREIGN KEY (\`legal_guardian_id\`) REFERENCES \`legal_guardian\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`student_course\` DROP FOREIGN KEY \`FK_20cea178b87e8475b734004f9ed\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`legal_guardian\` DROP FOREIGN KEY \`FK_ddeac10c3c6f8ac059519f0cf67\``,
    );
    await queryRunner.query(
      `DROP INDEX \`REL_20cea178b87e8475b734004f9e\` ON \`student_course\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`users\` DROP COLUMN \`neighborhood\``,
    );
    await queryRunner.query(`ALTER TABLE \`users\` DROP COLUMN \`PostalCode\``);
    await queryRunner.query(`ALTER TABLE \`users\` DROP COLUMN \`number\``);
    await queryRunner.query(`ALTER TABLE \`users\` DROP COLUMN \`street\``);
    await queryRunner.query(
      `ALTER TABLE \`student_course\` DROP INDEX \`IDX_20cea178b87e8475b734004f9e\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`student_course\` DROP COLUMN \`legal_guardian_id\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`student_course\` DROP COLUMN \`whatsapp\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`student_course\` DROP COLUMN \`email\``,
    );
    await queryRunner.query(
      `DROP INDEX \`REL_ddeac10c3c6f8ac059519f0cf6\` ON \`legal_guardian\``,
    );
    await queryRunner.query(`DROP TABLE \`legal_guardian\``);
  }
}
