import { MigrationInterface, QueryRunner } from 'typeorm';

export class CoursePeriod1760805740313 implements MigrationInterface {
  name = 'CoursePeriod1760805740313';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`course_periods\` (\`id\` varchar(36) NOT NULL, \`created_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP, \`updated_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP, \`deleted_at\` timestamp NULL, \`name\` varchar(255) NOT NULL, \`year\` int NOT NULL, \`startDate\` datetime NOT NULL, \`endDate\` datetime NOT NULL, \`partner_prep_course_id\` varchar(36) NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(`ALTER TABLE \`classes\` DROP COLUMN \`endDate\``);
    await queryRunner.query(
      `ALTER TABLE \`classes\` DROP COLUMN \`startDate\``,
    );
    await queryRunner.query(`ALTER TABLE \`classes\` DROP COLUMN \`year\``);
    await queryRunner.query(
      `ALTER TABLE \`classes\` ADD \`course_period_id\` varchar(36) NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`course_periods\` ADD CONSTRAINT \`FK_5a40ce4672c3dfe611477686f0c\` FOREIGN KEY (\`partner_prep_course_id\`) REFERENCES \`partner_prep_course\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`classes\` ADD CONSTRAINT \`FK_1ece3c10f50398a128115c007d6\` FOREIGN KEY (\`course_period_id\`) REFERENCES \`course_periods\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`classes\` DROP FOREIGN KEY \`FK_1ece3c10f50398a128115c007d6\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`course_periods\` DROP FOREIGN KEY \`FK_5a40ce4672c3dfe611477686f0c\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`classes\` DROP COLUMN \`course_period_id\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`classes\` ADD \`year\` int NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`classes\` ADD \`startDate\` datetime NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`classes\` ADD \`endDate\` datetime NOT NULL`,
    );
    await queryRunner.query(`DROP TABLE \`course_periods\``);
  }
}
