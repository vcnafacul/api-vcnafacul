import { MigrationInterface, QueryRunner } from "typeorm";

export class AlertaEvasaoCursinho1793410933650 implements MigrationInterface {
    name = 'AlertaEvasaoCursinho1793410933650'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`partner_prep_course\` ADD \`alerta_evasao_percentual\` tinyint UNSIGNED NULL`);
        await queryRunner.query(`ALTER TABLE \`partner_prep_course\` ADD \`alerta_evasao_minimo_aulas\` smallint UNSIGNED NOT NULL DEFAULT '10'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`partner_prep_course\` DROP COLUMN \`alerta_evasao_minimo_aulas\``);
        await queryRunner.query(`ALTER TABLE \`partner_prep_course\` DROP COLUMN \`alerta_evasao_percentual\``);
    }

}
