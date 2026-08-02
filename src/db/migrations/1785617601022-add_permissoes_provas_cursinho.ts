import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPermissoesProvasCursinho1785617601022 implements MigrationInterface {
    name = 'AddPermissoesProvasCursinho1785617601022'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`roles\` ADD \`visualizar_provas_cursinho\` tinyint NOT NULL DEFAULT 0`);
        await queryRunner.query(`ALTER TABLE \`roles\` ADD \`cadastrar_provas_cursinho\` tinyint NOT NULL DEFAULT 0`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`roles\` DROP COLUMN \`cadastrar_provas_cursinho\``);
        await queryRunner.query(`ALTER TABLE \`roles\` DROP COLUMN \`visualizar_provas_cursinho\``);
    }

}
