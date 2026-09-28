import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPermissoesQuestoesCursinho1790566555364 implements MigrationInterface {
    name = 'AddPermissoesQuestoesCursinho1790566555364'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`roles\` ADD \`visualizar_questoes_cursinho\` tinyint NOT NULL DEFAULT 0`);
        await queryRunner.query(`ALTER TABLE \`roles\` ADD \`editar_questoes_cursinho\` tinyint NOT NULL DEFAULT 0`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`roles\` DROP COLUMN \`editar_questoes_cursinho\``);
        await queryRunner.query(`ALTER TABLE \`roles\` DROP COLUMN \`visualizar_questoes_cursinho\``);
    }

}
