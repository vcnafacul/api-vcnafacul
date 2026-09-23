import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPermissaoExcluirQuestao1790186613886 implements MigrationInterface {
    name = 'AddPermissaoExcluirQuestao1790186613886'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`roles\` ADD \`excluir_questao\` tinyint NOT NULL DEFAULT 0`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`roles\` DROP COLUMN \`excluir_questao\``);
    }
}
