import { MigrationInterface, QueryRunner } from "typeorm";

export class Collaborator1704051954587 implements MigrationInterface {
    name = 'Collaborator1704051954587'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" ADD "collaborator" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "users" ADD "collaboratorDescription" character varying`);
        await queryRunner.query(`ALTER TABLE "users" ADD "collaboratorPhoto" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "collaboratorPhoto"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "collaboratorDescription"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "collaborator"`);
    }

}
