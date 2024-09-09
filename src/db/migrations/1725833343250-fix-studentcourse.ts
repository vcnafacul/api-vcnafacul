import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixStudentcourse1725833343250 implements MigrationInterface {
  name = 'FixStudentcourse1725833343250';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`student_course\` ADD \`uf\` varchar(255) NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`student_course\` DROP FOREIGN KEY \`FK_4a3ce5cc99a42d5eaab2d3cc662\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`student_course\` CHANGE \`user_id\` \`user_id\` int NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`student_course\` DROP COLUMN \`rg\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`student_course\` ADD \`rg\` varchar(255) NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`student_course\` DROP COLUMN \`cpf\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`student_course\` ADD \`cpf\` varchar(255) NOT NULL`,
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
      `ALTER TABLE \`student_course\` DROP COLUMN \`cpf\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`student_course\` ADD \`cpf\` int NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`student_course\` DROP COLUMN \`rg\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`student_course\` ADD \`rg\` int NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`student_course\` CHANGE \`user_id\` \`user_id\` int NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`student_course\` ADD CONSTRAINT \`FK_4a3ce5cc99a42d5eaab2d3cc662\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`student_course\` DROP COLUMN \`uf\``,
    );
  }
}
