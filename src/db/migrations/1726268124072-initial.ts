import { MigrationInterface, QueryRunner } from 'typeorm';

export class Initial1726268124072 implements MigrationInterface {
  name = 'Initial1726268124072';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`frente\` (\`id\` varchar(36) NOT NULL, \`created_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP, \`updated_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP, \`deleted_at\` timestamp NULL, \`prev\` varchar(255) NULL, \`next\` varchar(255) NULL, \`head\` varchar(255) NULL, \`tail\` varchar(255) NULL, \`lenght\` int NOT NULL DEFAULT '0', \`name\` varchar(255) NOT NULL, \`materia\` int NOT NULL, UNIQUE INDEX \`IDX_b71f980928922d70c48696fe0e\` (\`name\`, \`materia\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`subject\` (\`id\` varchar(36) NOT NULL, \`created_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP, \`updated_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP, \`deleted_at\` timestamp NULL, \`prev\` varchar(255) NULL, \`next\` varchar(255) NULL, \`head\` varchar(255) NULL, \`tail\` varchar(255) NULL, \`lenght\` int NOT NULL DEFAULT '0', \`name\` varchar(255) NOT NULL, \`description\` text NOT NULL, \`frenteId\` varchar(36) NULL, UNIQUE INDEX \`IDX_ade0f940dba920f53e48e486eb\` (\`name\`, \`frenteId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`content\` (\`id\` varchar(36) NOT NULL, \`created_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP, \`updated_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP, \`deleted_at\` timestamp NULL, \`prev\` varchar(255) NULL, \`next\` varchar(255) NULL, \`filename\` varchar(255) NULL, \`status\` int NOT NULL DEFAULT '3', \`title\` varchar(255) NOT NULL, \`description\` text NOT NULL, \`userId\` varchar(36) NULL, \`subjectId\` varchar(36) NULL, UNIQUE INDEX \`IDX_26bd75273b5769641de10ecc41\` (\`title\`, \`subjectId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`geolocations\` (\`id\` varchar(36) NOT NULL, \`created_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP, \`updated_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP, \`deleted_at\` timestamp NULL, \`latitude\` double NOT NULL, \`longitude\` double NOT NULL, \`name\` varchar(255) NOT NULL, \`cep\` varchar(255) NOT NULL, \`state\` varchar(255) NOT NULL, \`city\` varchar(255) NOT NULL, \`neighborhood\` varchar(255) NOT NULL, \`street\` varchar(255) NOT NULL, \`number\` varchar(255) NOT NULL, \`complement\` varchar(255) NULL, \`phone\` varchar(255) NULL, \`whatsapp\` varchar(255) NULL, \`email\` varchar(255) NULL, \`email2\` varchar(255) NULL, \`category\` varchar(255) NULL, \`site\` varchar(255) NULL, \`linkedin\` varchar(255) NULL, \`youtube\` varchar(255) NULL, \`facebook\` varchar(255) NULL, \`instagram\` varchar(255) NULL, \`twitter\` varchar(255) NULL, \`tiktok\` varchar(255) NULL, \`user_fullname\` varchar(255) NOT NULL, \`user_phone\` varchar(255) NOT NULL, \`user_connection\` varchar(255) NOT NULL, \`user_email\` varchar(255) NOT NULL, \`status\` int NOT NULL DEFAULT '0', PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`partner_prep_course\` (\`id\` varchar(36) NOT NULL, \`created_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP, \`updated_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP, \`deleted_at\` timestamp NULL, \`user_id\` varchar(255) NOT NULL, \`geo_id\` varchar(255) NOT NULL, UNIQUE INDEX \`REL_2abeb84841d3be03a58e85dc18\` (\`user_id\`), UNIQUE INDEX \`REL_b4d2f1d87d59673289b6129f65\` (\`geo_id\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`inscription_course\` (\`id\` varchar(36) NOT NULL, \`created_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP, \`updated_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP, \`deleted_at\` timestamp NULL, \`name\` varchar(255) NOT NULL, \`description\` varchar(255) NOT NULL, \`start_date\` datetime NOT NULL, \`end_date\` datetime NOT NULL, \`actived\` tinyint NOT NULL DEFAULT 1, \`expected_opening\` int NOT NULL, \`partner_prep_course_id\` varchar(36) NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`student_course\` (\`id\` varchar(36) NOT NULL, \`created_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP, \`updated_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP, \`deleted_at\` timestamp NULL, \`user_id\` varchar(255) NOT NULL, \`rg\` varchar(255) NOT NULL, \`uf\` varchar(255) NOT NULL, \`cpf\` varchar(255) NOT NULL, \`urgencyPhone\` varchar(255) NULL, \`documents\` text NULL, \`partner_prep_course_id\` varchar(36) NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`roles\` (\`id\` varchar(36) NOT NULL, \`created_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP, \`updated_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP, \`deleted_at\` timestamp NULL, \`name\` varchar(255) NOT NULL, \`validar_cursinho\` tinyint NOT NULL DEFAULT 0, \`alterar_permissao\` tinyint NOT NULL DEFAULT 0, \`criar_simulado\` tinyint NOT NULL DEFAULT 0, \`criar_questao\` tinyint NOT NULL DEFAULT 0, \`visualizar_questao\` tinyint NOT NULL DEFAULT 0, \`validar_questao\` tinyint NOT NULL DEFAULT 0, \`upload_news\` tinyint NOT NULL DEFAULT 0, \`visualizar_provas\` tinyint NOT NULL DEFAULT 0, \`cadastrar_provas\` tinyint NOT NULL DEFAULT 0, \`visualizar_demanda\` tinyint NOT NULL DEFAULT 0, \`upload_demanda\` tinyint NOT NULL DEFAULT 0, \`validar_demanda\` tinyint NOT NULL DEFAULT 0, \`gerenciador_demanda\` tinyint NOT NULL DEFAULT 0, \`gerenciar_inscricoes_cursinho_parceiro\` tinyint NOT NULL DEFAULT 0, UNIQUE INDEX \`IDX_648e3f5447f725579d7d4ffdfb\` (\`name\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`user_roles\` (\`id\` varchar(36) NOT NULL, \`created_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP, \`updated_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP, \`deleted_at\` timestamp NULL, \`user_id\` varchar(255) NOT NULL, \`role_id\` varchar(255) NOT NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`users\` (\`id\` varchar(36) NOT NULL, \`created_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP, \`updated_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP, \`deleted_at\` timestamp NULL, \`email\` varchar(255) NOT NULL, \`password\` varchar(255) NOT NULL, \`firstName\` varchar(255) NOT NULL, \`lastName\` varchar(255) NOT NULL, \`socialName\` varchar(255) NULL, \`phone\` varchar(255) NOT NULL, \`gender\` int NOT NULL, \`birthday\` datetime NOT NULL, \`state\` varchar(255) NOT NULL, \`city\` varchar(255) NOT NULL, \`about\` varchar(255) NULL, \`lgpd\` tinyint NOT NULL, \`collaborator\` tinyint NOT NULL DEFAULT 0, \`collaboratorDescription\` varchar(255) NULL, \`collaboratorPhoto\` varchar(255) NULL, \`email_confirm_sended\` timestamp NULL DEFAULT CURRENT_TIMESTAMP, \`studentCourseId\` varchar(36) NULL, UNIQUE INDEX \`IDX_97672ac88f789774dd47f7c8be\` (\`email\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`audit_logs\` (\`id\` varchar(36) NOT NULL, \`created_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP, \`updated_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP, \`deleted_at\` timestamp NULL, \`entity_type\` varchar(255) NOT NULL, \`entity_id\` varchar(255) NOT NULL, \`changes\` json NOT NULL, \`updated_by\` varchar(255) NOT NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`news\` (\`id\` varchar(36) NOT NULL, \`created_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP, \`updated_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP, \`deleted_at\` timestamp NULL, \`session\` varchar(255) NOT NULL, \`title\` varchar(255) NOT NULL, \`fileName\` varchar(255) NOT NULL, \`updated_by\` varchar(255) NOT NULL, \`actived\` tinyint NOT NULL DEFAULT 1, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`student_course_inscription_courses_inscription_course\` (\`studentCourseId\` varchar(36) NOT NULL, \`inscriptionCourseId\` varchar(36) NOT NULL, INDEX \`IDX_3e2827c9ad4edac0a93ece0f59\` (\`studentCourseId\`), INDEX \`IDX_1d2cc2da58535f4fd95fa93eb2\` (\`inscriptionCourseId\`), PRIMARY KEY (\`studentCourseId\`, \`inscriptionCourseId\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `ALTER TABLE \`subject\` ADD CONSTRAINT \`FK_125d29f48682dabb6c905e84513\` FOREIGN KEY (\`frenteId\`) REFERENCES \`frente\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`content\` ADD CONSTRAINT \`FK_43185da5e33e99752c6edf91352\` FOREIGN KEY (\`userId\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`content\` ADD CONSTRAINT \`FK_aca2d12589a8580b96b9d4dd76a\` FOREIGN KEY (\`subjectId\`) REFERENCES \`subject\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`partner_prep_course\` ADD CONSTRAINT \`FK_2abeb84841d3be03a58e85dc18a\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`partner_prep_course\` ADD CONSTRAINT \`FK_b4d2f1d87d59673289b6129f65d\` FOREIGN KEY (\`geo_id\`) REFERENCES \`geolocations\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`inscription_course\` ADD CONSTRAINT \`FK_245c29cc87a39e7d3ef7f39e47e\` FOREIGN KEY (\`partner_prep_course_id\`) REFERENCES \`partner_prep_course\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`student_course\` ADD CONSTRAINT \`FK_af45625c0a8c76912b2b8da44d7\` FOREIGN KEY (\`partner_prep_course_id\`) REFERENCES \`partner_prep_course\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`user_roles\` ADD CONSTRAINT \`FK_87b8888186ca9769c960e926870\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`user_roles\` ADD CONSTRAINT \`FK_b23c65e50a758245a33ee35fda1\` FOREIGN KEY (\`role_id\`) REFERENCES \`roles\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`users\` ADD CONSTRAINT \`FK_a1f9dda694450a3332d1ca5da19\` FOREIGN KEY (\`studentCourseId\`) REFERENCES \`student_course\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`audit_logs\` ADD CONSTRAINT \`FK_11acfa80f86df2becee8b55a328\` FOREIGN KEY (\`updated_by\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`news\` ADD CONSTRAINT \`FK_5ba7f768b1fcb8278686537e14b\` FOREIGN KEY (\`updated_by\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`student_course_inscription_courses_inscription_course\` ADD CONSTRAINT \`FK_3e2827c9ad4edac0a93ece0f590\` FOREIGN KEY (\`studentCourseId\`) REFERENCES \`student_course\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE \`student_course_inscription_courses_inscription_course\` ADD CONSTRAINT \`FK_1d2cc2da58535f4fd95fa93eb20\` FOREIGN KEY (\`inscriptionCourseId\`) REFERENCES \`inscription_course\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`student_course_inscription_courses_inscription_course\` DROP FOREIGN KEY \`FK_1d2cc2da58535f4fd95fa93eb20\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`student_course_inscription_courses_inscription_course\` DROP FOREIGN KEY \`FK_3e2827c9ad4edac0a93ece0f590\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`news\` DROP FOREIGN KEY \`FK_5ba7f768b1fcb8278686537e14b\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`audit_logs\` DROP FOREIGN KEY \`FK_11acfa80f86df2becee8b55a328\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`users\` DROP FOREIGN KEY \`FK_a1f9dda694450a3332d1ca5da19\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`user_roles\` DROP FOREIGN KEY \`FK_b23c65e50a758245a33ee35fda1\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`user_roles\` DROP FOREIGN KEY \`FK_87b8888186ca9769c960e926870\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`student_course\` DROP FOREIGN KEY \`FK_af45625c0a8c76912b2b8da44d7\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`inscription_course\` DROP FOREIGN KEY \`FK_245c29cc87a39e7d3ef7f39e47e\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`partner_prep_course\` DROP FOREIGN KEY \`FK_b4d2f1d87d59673289b6129f65d\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`partner_prep_course\` DROP FOREIGN KEY \`FK_2abeb84841d3be03a58e85dc18a\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`content\` DROP FOREIGN KEY \`FK_aca2d12589a8580b96b9d4dd76a\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`content\` DROP FOREIGN KEY \`FK_43185da5e33e99752c6edf91352\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`subject\` DROP FOREIGN KEY \`FK_125d29f48682dabb6c905e84513\``,
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_1d2cc2da58535f4fd95fa93eb2\` ON \`student_course_inscription_courses_inscription_course\``,
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_3e2827c9ad4edac0a93ece0f59\` ON \`student_course_inscription_courses_inscription_course\``,
    );
    await queryRunner.query(
      `DROP TABLE \`student_course_inscription_courses_inscription_course\``,
    );
    await queryRunner.query(`DROP TABLE \`news\``);
    await queryRunner.query(`DROP TABLE \`audit_logs\``);
    await queryRunner.query(
      `DROP INDEX \`IDX_97672ac88f789774dd47f7c8be\` ON \`users\``,
    );
    await queryRunner.query(`DROP TABLE \`users\``);
    await queryRunner.query(`DROP TABLE \`user_roles\``);
    await queryRunner.query(
      `DROP INDEX \`IDX_648e3f5447f725579d7d4ffdfb\` ON \`roles\``,
    );
    await queryRunner.query(`DROP TABLE \`roles\``);
    await queryRunner.query(`DROP TABLE \`student_course\``);
    await queryRunner.query(`DROP TABLE \`inscription_course\``);
    await queryRunner.query(
      `DROP INDEX \`REL_b4d2f1d87d59673289b6129f65\` ON \`partner_prep_course\``,
    );
    await queryRunner.query(
      `DROP INDEX \`REL_2abeb84841d3be03a58e85dc18\` ON \`partner_prep_course\``,
    );
    await queryRunner.query(`DROP TABLE \`partner_prep_course\``);
    await queryRunner.query(`DROP TABLE \`geolocations\``);
    await queryRunner.query(
      `DROP INDEX \`IDX_26bd75273b5769641de10ecc41\` ON \`content\``,
    );
    await queryRunner.query(`DROP TABLE \`content\``);
    await queryRunner.query(
      `DROP INDEX \`IDX_ade0f940dba920f53e48e486eb\` ON \`subject\``,
    );
    await queryRunner.query(`DROP TABLE \`subject\``);
    await queryRunner.query(
      `DROP INDEX \`IDX_b71f980928922d70c48696fe0e\` ON \`frente\``,
    );
    await queryRunner.query(`DROP TABLE \`frente\``);
  }
}
