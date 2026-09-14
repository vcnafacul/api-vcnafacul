import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPermissaoCategoriasCursinho1789347036462 implements MigrationInterface {
    name = 'AddPermissaoCategoriasCursinho1789347036462'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`roles\` ADD \`gerenciar_categorias_cursinho\` tinyint NOT NULL DEFAULT 0`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`roles\` DROP COLUMN \`gerenciar_categorias_cursinho\``);
    }
}
