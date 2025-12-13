import { faker } from '@faker-js/faker/locale/af_ZA';
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerGuard } from '@nestjs/throttler';
import { AppModule } from 'src/app.module';
import { RoleSeedService } from 'src/db/seeds/1-role.seed';
import { RoleUpdateAdminSeedService } from 'src/db/seeds/2-role-update-admin.seed';
import { CreateRoleDtoInput } from 'src/modules/role/dto/create-role.dto';
import { UpdateRoleDtoInput } from 'src/modules/role/dto/update.role.dto';
import { JwtAuthGuard } from 'src/shared/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/shared/guards/permission.guard';
import * as request from 'supertest';
import { createNestAppTest } from './utils/createNestAppTest';

describe('Role e2e', () => {
  let app: INestApplication;
  let roleSeedService: RoleSeedService;
  let roleUpdateAdminSeedService: RoleUpdateAdminSeedService;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideGuard(PermissionsGuard)
      .useValue({
        canActivate: jest.fn(() => true),
      })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: jest.fn(() => true),
      })
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = createNestAppTest(moduleFixture);
    roleSeedService = moduleFixture.get<RoleSeedService>(RoleSeedService);
    roleUpdateAdminSeedService = moduleFixture.get<RoleUpdateAdminSeedService>(
      RoleUpdateAdminSeedService,
    );

    await app.init();
    await roleSeedService.seed();
    await roleUpdateAdminSeedService.seed();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Role inheritance behavior', () => {
    it('should create a base role and a child role based on it, then update base role and verify inheritance', async () => {
      // Step 1: Create a base role
      const baseRoleData: CreateRoleDtoInput = {
        name: faker.person.jobTitle() + ' Base',
        base: true,
        validarCursinho: true,
        alterarPermissao: false,
        criarSimulado: true,
        visualizarQuestao: true,
        criarQuestao: false,
        validarQuestao: false,
        uploadNews: true,
        visualizarProvas: false,
        cadastrarProvas: false,
        visualizarDemanda: true,
        uploadDemanda: false,
        validarDemanda: false,
        gerenciadorDemanda: false,
        gerenciarProcessoSeletivo: true,
        gerenciarColaboradores: false,
        gerenciarTurmas: true,
        gerenciarEstudantes: false,
        gerenciarPermissoesCursinho: false,
        visualizarTurmas: false,
        visualizarEstudantes: false,
      };

      const baseRoleResponse = await request(app.getHttpServer())
        .post('/role')
        .send(baseRoleData)
        .expect(201);

      const baseRole = baseRoleResponse.body;
      expect(baseRole).toBeDefined();
      expect(baseRole.name).toBe(baseRoleData.name);
      expect(baseRole.base).toBe(true);
      expect(baseRole.validarCursinho).toBe(true);
      expect(baseRole.criarSimulado).toBe(true);
      expect(baseRole.uploadNews).toBe(true);
      expect(baseRole.gerenciarProcessoSeletivo).toBe(true);
      expect(baseRole.gerenciarTurmas).toBe(true);

      // Step 2: Create a child role based on the base role
      const childRoleData: CreateRoleDtoInput = {
        name: faker.person.jobTitle() + ' Child',
        base: false,
        roleBase: baseRole.id,
        validarCursinho: false, // This should be inherited from base role
        alterarPermissao: false,
        criarSimulado: false, // This should be inherited from base role
        visualizarQuestao: false,
        criarQuestao: true, // New permission not in base
        validarQuestao: false,
        uploadNews: false, // This should be inherited from base role
        visualizarProvas: true, // New permission not in base
        cadastrarProvas: false,
        visualizarDemanda: false,
        uploadDemanda: false,
        validarDemanda: false,
        gerenciadorDemanda: false,
        gerenciarProcessoSeletivo: false, // This should not be inherited from base role
        gerenciarColaboradores: true, // New permission not in base
        gerenciarTurmas: false, // This should not be inherited from base role
        gerenciarEstudantes: false,
        gerenciarPermissoesCursinho: false,
        visualizarTurmas: false,
        visualizarEstudantes: false,
      };

      const childRoleResponse = await request(app.getHttpServer())
        .post('/role')
        .send(childRoleData)
        .expect(201);

      const childRole = childRoleResponse.body;
      expect(childRole).toBeDefined();
      expect(childRole.name).toBe(childRoleData.name);
      expect(childRole.base).toBe(false);
      expect(childRole.roleBase.id).toBe(baseRole.id);

      // Verify inheritance: child role should inherit permissions from base role
      expect(childRole.validarCursinho).toBe(true); // Inherited from base
      expect(childRole.criarSimulado).toBe(true); // Inherited from base
      expect(childRole.uploadNews).toBe(true); // Inherited from base
      expect(childRole.gerenciarProcessoSeletivo).toBe(false); // It is not a base permission
      expect(childRole.gerenciarTurmas).toBe(false); // It is not a base permission

      // Verify child role has its own permissions
      expect(childRole.criarQuestao).toBe(true); // Child's own permission
      expect(childRole.visualizarProvas).toBe(true); // Child's own permission
      expect(childRole.gerenciarColaboradores).toBe(true); // Child's own permission

      // Step 3: Update the base role permissions
      const updateBaseRoleData: UpdateRoleDtoInput = {
        id: baseRole.id,
        name: baseRole.name + ' Updated',
        base: true,
        validarCursinho: false, // Changed from true to false
        alterarPermissao: true, // New permission
        criarSimulado: true, // Keep same
        visualizarQuestao: true, // New permission
        criarQuestao: true, // New permission
        validarQuestao: true, // New permission
        uploadNews: false, // Changed from true to false
        visualizarProvas: true, // New permission
        cadastrarProvas: true, // New permission
        visualizarDemanda: true, // New permission
        uploadDemanda: true, // New permission
        validarDemanda: true, // New permission
        gerenciadorDemanda: true, // New permission
        gerenciarProcessoSeletivo: false, // Changed from true to false
        gerenciarColaboradores: true, // New permission
        gerenciarTurmas: false, // Changed from true to false
        visualizarTurmas: true, // New permission
        gerenciarEstudantes: true, // New permission
        visualizarEstudantes: true, // New permission
        gerenciarPermissoesCursinho: true, // New permission
      };

      await request(app.getHttpServer())
        .patch('/role')
        .send(updateBaseRoleData)
        .expect(200);

      const updatedBaseRoleResponse = await request(app.getHttpServer())
        .get(`/role/${baseRole.id}`)
        .expect(200);

      const updatedBaseRole = updatedBaseRoleResponse.body;
      expect(updatedBaseRole.name).toBe(updateBaseRoleData.name);
      expect(updatedBaseRole.validarCursinho).toBe(false);
      expect(updatedBaseRole.uploadNews).toBe(false);
      expect(updatedBaseRole.gerenciarProcessoSeletivo).toBe(false);
      expect(updatedBaseRole.gerenciarTurmas).toBe(false);

      // Step 4: Verify that child role was updated with inherited permissions
      const updatedChildRoleResponse = await request(app.getHttpServer())
        .get(`/role/${childRole.id}`)
        .expect(200);

      const updatedChildRole = updatedChildRoleResponse.body;

      // Verify inheritance: child role should have updated permissions from base role
      expect(updatedChildRole.validarCursinho).toBe(false); // Updated from base
      expect(updatedChildRole.uploadNews).toBe(false); // Updated from base
      expect(updatedChildRole.gerenciarProcessoSeletivo).toBe(false); // Updated from base
      expect(updatedChildRole.gerenciarTurmas).toBe(false); // Updated from base

      // Verify child role still has its own permissions
      expect(updatedChildRole.criarQuestao).toBe(true); // Child's own permission preserved
      expect(updatedChildRole.visualizarProvas).toBe(true); // Child's own permission preserved
      expect(updatedChildRole.gerenciarColaboradores).toBe(true); // Child's own permission preserved

      // Verify that child role inherited new permissions from base
      expect(updatedChildRole.alterarPermissao).toBe(true); // Inherited from base
      expect(updatedChildRole.visualizarQuestao).toBe(true); // Inherited from base
      expect(updatedChildRole.validarQuestao).toBe(true); // Inherited from base
      expect(updatedChildRole.cadastrarProvas).toBe(true); // Inherited from base
      expect(updatedChildRole.visualizarDemanda).toBe(true); // Inherited from base
      expect(updatedChildRole.uploadDemanda).toBe(true); // Inherited from base
      expect(updatedChildRole.validarDemanda).toBe(true); // Inherited from base
      expect(updatedChildRole.gerenciadorDemanda).toBe(true); // Inherited from base
      expect(updatedChildRole.visualizarTurmas).toBe(false); // It is not Inherited from base
      expect(updatedChildRole.gerenciarEstudantes).toBe(false); // Inherited from base
      expect(updatedChildRole.visualizarEstudantes).toBe(false); // Inherited from base
      expect(updatedChildRole.gerenciarPermissoesCursinho).toBe(false); // Inherited from base
    }, 30000);

    it('should handle automatic permission inheritance for dependent permissions', async () => {
      // Create a base role with specific permissions
      const baseRoleData: CreateRoleDtoInput = {
        name: faker.person.jobTitle() + ' Auto Base',
        base: true,
        validarCursinho: false,
        alterarPermissao: false,
        criarSimulado: false,
        visualizarQuestao: false,
        criarQuestao: false,
        validarQuestao: false,
        uploadNews: false,
        visualizarProvas: false,
        cadastrarProvas: false,
        visualizarDemanda: false,
        uploadDemanda: false,
        validarDemanda: false,
        gerenciadorDemanda: false,
        gerenciarProcessoSeletivo: false,
        gerenciarColaboradores: false,
        gerenciarTurmas: false,
        gerenciarEstudantes: false,
        gerenciarPermissoesCursinho: false,
        visualizarTurmas: false,
        visualizarEstudantes: false,
      };

      const baseRoleResponse = await request(app.getHttpServer())
        .post('/role')
        .send(baseRoleData)
        .expect(201);

      const baseRole = baseRoleResponse.body;

      // Create a child role that enables dependent permissions
      const childRoleData: CreateRoleDtoInput = {
        name: faker.person.jobTitle() + ' Auto Child',
        base: false,
        roleBase: baseRole.id,
        validarCursinho: false,
        alterarPermissao: false,
        criarSimulado: false,
        visualizarQuestao: false,
        criarQuestao: true, // This should automatically enable visualizarQuestao
        validarQuestao: false,
        uploadNews: false,
        visualizarProvas: false,
        cadastrarProvas: true, // This should automatically enable visualizarProvas
        visualizarDemanda: false,
        uploadDemanda: false,
        validarDemanda: false,
        gerenciadorDemanda: true, // This should automatically enable uploadDemanda and validarDemanda
        gerenciarProcessoSeletivo: false,
        gerenciarColaboradores: false,
        gerenciarTurmas: true, // This should automatically enable visualizarTurmas
        gerenciarEstudantes: true, // This should automatically enable visualizarEstudantes
        gerenciarPermissoesCursinho: false,
        visualizarTurmas: false,
        visualizarEstudantes: false,
      };

      const childRoleResponse = await request(app.getHttpServer())
        .post('/role')
        .send(childRoleData)
        .expect(201);

      const childRole = childRoleResponse.body;

      // Verify automatic permission inheritance
      expect(childRole.criarQuestao).toBe(true);
      expect(childRole.visualizarQuestao).toBe(true); // Automatically enabled

      expect(childRole.cadastrarProvas).toBe(true);
      expect(childRole.visualizarProvas).toBe(true); // Automatically enabled

      expect(childRole.gerenciadorDemanda).toBe(true);
      expect(childRole.uploadDemanda).toBe(true); // Automatically enabled
      expect(childRole.validarDemanda).toBe(true); // Automatically enabled
      expect(childRole.visualizarDemanda).toBe(true); // Automatically enabled

      expect(childRole.gerenciarTurmas).toBe(true);
      expect(childRole.visualizarTurmas).toBe(true); // Automatically enabled

      expect(childRole.gerenciarEstudantes).toBe(true);
      expect(childRole.visualizarEstudantes).toBe(true); // Automatically enabled
    }, 30000);
  });
});
