import { MigrationInterface, QueryRunner } from "typeorm";

export class AddIsTestToInscriptionCourse1778119751450 implements MigrationInterface {
    name = 'AddIsTestToInscriptionCourse1778119751450'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`inscription_course\` ADD \`is_test\` tinyint NOT NULL DEFAULT 0`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`inscription_course\` DROP COLUMN \`is_test\``);
    }

}
