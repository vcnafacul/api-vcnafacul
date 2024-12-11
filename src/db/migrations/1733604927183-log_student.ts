import { MigrationInterface, QueryRunner } from 'typeorm';

export class LogStudent1733604927183 implements MigrationInterface {
  name = 'LogStudent1733604927183';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`log_student\` (\`id\` varchar(36) NOT NULL, \`created_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP, \`updated_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP, \`deleted_at\` timestamp NULL, \`student_id\` varchar(255) NOT NULL, \`applicationStatus\` varchar(255) NOT NULL, \`description\` text NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `ALTER TABLE \`log_student\` ADD CONSTRAINT \`FK_4b3b61953971338a93bb2c768a9\` FOREIGN KEY (\`student_id\`) REFERENCES \`student_course\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`log_student\` DROP FOREIGN KEY \`FK_4b3b61953971338a93bb2c768a9\``,
    );
    await queryRunner.query(`DROP TABLE \`log_student\``);
  }
}
