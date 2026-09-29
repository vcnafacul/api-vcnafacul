import { MigrationInterface, QueryRunner } from "typeorm";

export class EventoDeSimulado1790719287582 implements MigrationInterface {
    name = 'EventoDeSimulado1790719287582'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`simulado_evento_inscricao\` (\`id\` varchar(36) NOT NULL, \`created_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP, \`updated_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP, \`deleted_at\` timestamp NULL, \`evento_id\` varchar(255) NOT NULL, \`user_id\` varchar(255) NOT NULL, \`prova_id\` varchar(24) NOT NULL, UNIQUE INDEX \`UQ_inscricao_evento_aluno\` (\`evento_id\`, \`user_id\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`simulado_evento_prova\` (\`id\` varchar(36) NOT NULL, \`created_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP, \`updated_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP, \`deleted_at\` timestamp NULL, \`evento_id\` varchar(255) NOT NULL, \`prova_id\` varchar(24) NOT NULL, \`nome_da_prova\` varchar(200) NOT NULL, \`ordem\` int NOT NULL DEFAULT '0', PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`simulado_evento\` (\`id\` varchar(36) NOT NULL, \`created_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP, \`updated_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP, \`deleted_at\` timestamp NULL, \`partner_prep_course_id\` varchar(255) NOT NULL, \`nome\` varchar(120) NOT NULL, \`descricao\` text NULL, \`inscricoes_de\` datetime NOT NULL, \`inscricoes_ate\` datetime NOT NULL, \`aviso_abertura_enviado_em\` datetime NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`simulado_evento_inscricao\` ADD CONSTRAINT \`FK_9a67dcec6f2a44365e10984c75c\` FOREIGN KEY (\`evento_id\`) REFERENCES \`simulado_evento\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`simulado_evento_inscricao\` ADD CONSTRAINT \`FK_0d34189ad68fe0942b10db22b92\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`simulado_evento_prova\` ADD CONSTRAINT \`FK_ac33db35105e9580cdba3e6f2d1\` FOREIGN KEY (\`evento_id\`) REFERENCES \`simulado_evento\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`simulado_evento\` ADD CONSTRAINT \`FK_16ab99555b25539b2e8a242b20a\` FOREIGN KEY (\`partner_prep_course_id\`) REFERENCES \`partner_prep_course\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`simulado_evento\` DROP FOREIGN KEY \`FK_16ab99555b25539b2e8a242b20a\``);
        await queryRunner.query(`ALTER TABLE \`simulado_evento_prova\` DROP FOREIGN KEY \`FK_ac33db35105e9580cdba3e6f2d1\``);
        await queryRunner.query(`ALTER TABLE \`simulado_evento_inscricao\` DROP FOREIGN KEY \`FK_0d34189ad68fe0942b10db22b92\``);
        await queryRunner.query(`ALTER TABLE \`simulado_evento_inscricao\` DROP FOREIGN KEY \`FK_9a67dcec6f2a44365e10984c75c\``);
        await queryRunner.query(`DROP TABLE \`simulado_evento\``);
        await queryRunner.query(`DROP TABLE \`simulado_evento_prova\``);
        await queryRunner.query(`DROP INDEX \`UQ_inscricao_evento_aluno\` ON \`simulado_evento_inscricao\``);
        await queryRunner.query(`DROP TABLE \`simulado_evento_inscricao\``);
    }

}
