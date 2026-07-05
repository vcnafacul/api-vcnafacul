import { MigrationInterface, QueryRunner } from "typeorm";

export class DropCriarSimulado1783225907858 implements MigrationInterface {
    name = 'DropCriarSimulado1783225907858'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`roles\` DROP COLUMN \`criar_simulado\``);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`roles\` ADD \`criar_simulado\` tinyint NOT NULL DEFAULT '0'`);
    }

}
