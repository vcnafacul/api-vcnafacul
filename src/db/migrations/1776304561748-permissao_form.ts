import { MigrationInterface, QueryRunner } from "typeorm";

export class PermissaoForm1776304561748 implements MigrationInterface {
    name = 'PermissaoForm1776304561748'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`roles\` ADD \`gerenciar_formulario\` tinyint NOT NULL DEFAULT 0`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`roles\` DROP COLUMN \`gerenciar_formulario\``);
    }

}
