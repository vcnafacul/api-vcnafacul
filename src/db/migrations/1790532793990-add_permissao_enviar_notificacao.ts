import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPermissaoEnviarNotificacao1790532793990 implements MigrationInterface {
    name = 'AddPermissaoEnviarNotificacao1790532793990'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`roles\` ADD \`enviar_notificacao\` tinyint NOT NULL DEFAULT 0`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`roles\` DROP COLUMN \`enviar_notificacao\``);
    }

}
