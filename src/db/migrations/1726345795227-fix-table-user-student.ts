import { MigrationInterface, QueryRunner } from "typeorm";

export class FixTableUserStudent1726345795227 implements MigrationInterface {
    name = 'FixTableUserStudent1726345795227'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`users\` DROP FOREIGN KEY \`FK_a1f9dda694450a3332d1ca5da19\``);
        await queryRunner.query(`ALTER TABLE \`users\` DROP COLUMN \`studentCourseId\``);
        await queryRunner.query(`ALTER TABLE \`student_course\` ADD CONSTRAINT \`FK_4a3ce5cc99a42d5eaab2d3cc662\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`student_course\` DROP FOREIGN KEY \`FK_4a3ce5cc99a42d5eaab2d3cc662\``);
        await queryRunner.query(`ALTER TABLE \`users\` ADD \`studentCourseId\` varchar(36) NULL`);
        await queryRunner.query(`ALTER TABLE \`users\` ADD CONSTRAINT \`FK_a1f9dda694450a3332d1ca5da19\` FOREIGN KEY (\`studentCourseId\`) REFERENCES \`student_course\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}
