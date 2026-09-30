import { MigrationInterface, QueryRunner } from "typeorm";

export class PushResultadoCartao1790728236494 implements MigrationInterface {
    name = 'PushResultadoCartao1790728236494'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`push_resultado_cartao\` (\`id\` varchar(36) NOT NULL, \`created_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP, \`updated_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP, \`deleted_at\` timestamp NULL, \`historico_id\` varchar(24) NOT NULL, \`user_id\` varchar(36) NOT NULL, \`simulado\` varchar(200) NOT NULL, \`total\` int NOT NULL, \`acertos\` int NOT NULL, \`erros\` int NOT NULL, \`em_branco\` int NOT NULL, \`aproveitamento\` int NOT NULL, \`status\` varchar(10) NOT NULL DEFAULT 'pendente', \`envios\` int NOT NULL DEFAULT '0', \`tentativas\` int NOT NULL DEFAULT '0', \`proxima_tentativa_em\` datetime NOT NULL, UNIQUE INDEX \`UQ_push_resultado_historico\` (\`historico_id\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX \`UQ_push_resultado_historico\` ON \`push_resultado_cartao\``);
        await queryRunner.query(`DROP TABLE \`push_resultado_cartao\``);
    }

}
