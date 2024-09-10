import { MigrationInterface, QueryRunner } from 'typeorm';

export class StudentRegistrationManyCourse1725977105663
  implements MigrationInterface
{
  name = 'StudentRegistrationManyCourse1725977105663';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`student_course\` DROP FOREIGN KEY \`FK_4a3ce5cc99a42d5eaab2d3cc662\``,
    );
    await queryRunner.query(
      `DROP INDEX \`REL_4a3ce5cc99a42d5eaab2d3cc66\` ON \`student_course\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`users\` ADD \`studentCourseId\` int NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`users\` ADD CONSTRAINT \`FK_a1f9dda694450a3332d1ca5da19\` FOREIGN KEY (\`studentCourseId\`) REFERENCES \`student_course\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`users\` DROP FOREIGN KEY \`FK_a1f9dda694450a3332d1ca5da19\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`users\` DROP COLUMN \`studentCourseId\``,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_4a3ce5cc99a42d5eaab2d3cc66\` ON \`student_course\` (\`user_id\`)`,
    );
    await queryRunner.query(
      `ALTER TABLE \`student_course\` ADD CONSTRAINT \`FK_4a3ce5cc99a42d5eaab2d3cc662\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }
}
