import { MigrationInterface, QueryRunner } from 'typeorm';

export class Document1726346574327 implements MigrationInterface {
  name = 'Document1726346574327';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`document_student\` (\`id\` varchar(36) NOT NULL, \`created_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP, \`updated_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP, \`deleted_at\` timestamp NULL, \`name\` varchar(255) NOT NULL, \`key\` varchar(255) NOT NULL, \`exprires\` datetime NOT NULL, \`student_course_id\` varchar(36) NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `ALTER TABLE \`student_course\` DROP COLUMN \`documents\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`document_student\` ADD CONSTRAINT \`FK_d0d2671b7b84b4dd5935ad3e32b\` FOREIGN KEY (\`student_course_id\`) REFERENCES \`student_course\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`document_student\` DROP FOREIGN KEY \`FK_d0d2671b7b84b4dd5935ad3e32b\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`student_course\` ADD \`documents\` text NULL`,
    );
    await queryRunner.query(`DROP TABLE \`document_student\``);
  }
}
