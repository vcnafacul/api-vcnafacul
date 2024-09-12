import { MigrationInterface, QueryRunner } from 'typeorm';

export class DocumentsStudent21726149433428 implements MigrationInterface {
  name = 'DocumentsStudent21726149433428';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`users\` DROP FOREIGN KEY \`FK_a1f9dda694450a3332d1ca5da19\``,
    );
    await queryRunner.query(
      `CREATE TABLE \`document_student\` (\`id\` int NOT NULL AUTO_INCREMENT, \`created_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP, \`updated_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP, \`deleted_at\` timestamp NULL, \`name\` varchar(255) NOT NULL, \`key\` varchar(255) NOT NULL, \`exprires\` datetime NOT NULL, \`student_course_id\` int NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `ALTER TABLE \`student_course\` DROP COLUMN \`documents\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`users\` DROP COLUMN \`studentCourseId\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`document_student\` ADD CONSTRAINT \`FK_d0d2671b7b84b4dd5935ad3e32b\` FOREIGN KEY (\`student_course_id\`) REFERENCES \`student_course\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`student_course\` ADD CONSTRAINT \`FK_4a3ce5cc99a42d5eaab2d3cc662\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`student_course\` DROP FOREIGN KEY \`FK_4a3ce5cc99a42d5eaab2d3cc662\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`document_student\` DROP FOREIGN KEY \`FK_d0d2671b7b84b4dd5935ad3e32b\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`users\` ADD \`studentCourseId\` int NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`student_course\` ADD \`documents\` text NULL`,
    );
    await queryRunner.query(`DROP TABLE \`document_student\``);
    await queryRunner.query(
      `ALTER TABLE \`users\` ADD CONSTRAINT \`FK_a1f9dda694450a3332d1ca5da19\` FOREIGN KEY (\`studentCourseId\`) REFERENCES \`student_course\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }
}
