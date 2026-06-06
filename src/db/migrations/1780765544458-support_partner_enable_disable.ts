import { MigrationInterface, QueryRunner } from "typeorm";

export class SupportPartnerEnableDisable1780765544458 implements MigrationInterface {
    name = 'SupportPartnerEnableDisable1780765544458'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`home_supporter\` ADD \`active\` tinyint NOT NULL DEFAULT 1`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`home_supporter\` DROP COLUMN \`active\``);
    }

}
