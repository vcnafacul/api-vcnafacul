import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPermissaoValidarQuestoesCursinho1790637239452 implements MigrationInterface {
    name = 'AddPermissaoValidarQuestoesCursinho1790637239452'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`roles\` ADD \`validar_questoes_cursinho\` tinyint NOT NULL DEFAULT 0`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`roles\` DROP COLUMN \`validar_questoes_cursinho\``);
    }

}
