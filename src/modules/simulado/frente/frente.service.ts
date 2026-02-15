import { Injectable } from '@nestjs/common';
import { CacheService } from 'src/shared/modules/cache/cache.service';
import { EnvService } from 'src/shared/modules/env/env.service';
import {
  HttpServiceAxios,
  HttpServiceAxiosFactory,
} from 'src/shared/services/axios/http-service-axios.factory';

const MATERIA_ENUM_NAMES: string[] = [
  'Língua Portuguesa',
  'Língua Estrangeira',
  'Artes',
  'Biologia',
  'Física',
  'Quimica',
  'Matemática',
  'História',
  'Geografia',
  'Filosofia',
  'Sociologia',
  'Atualidades',
];

@Injectable()
export class FrenteProxyService {
  private readonly axios: HttpServiceAxios;
  private materiaEnumToId: Map<number, string> | null = null;
  private materiaIdToEnum: Map<string, number> | null = null;

  constructor(
    private readonly httpServiceFactory: HttpServiceAxiosFactory,
    private readonly envService: EnvService,
    private readonly cache: CacheService,
  ) {
    this.axios = this.httpServiceFactory.create(
      this.envService.get('SIMULADO_URL'),
    );
  }

  async loadMateriaMapping(): Promise<void> {
    if (this.materiaEnumToId) return;
    const result = await this.axios.get<any>('v1/materia?page=1&limit=100');
    const materias: any[] = result?.data ?? result ?? [];
    const list = Array.isArray(materias) ? materias : [];

    this.materiaEnumToId = new Map();
    this.materiaIdToEnum = new Map();

    for (const m of list) {
      const nome = m.nome?.trim();
      const id = m._id?.toString();
      const enumIndex = MATERIA_ENUM_NAMES.findIndex(
        (n) => n.toLowerCase() === nome?.toLowerCase(),
      );
      if (enumIndex >= 0 && id) {
        this.materiaEnumToId.set(enumIndex, id);
        this.materiaIdToEnum.set(id, enumIndex);
      }
    }
  }

  async enumToObjectId(enumValue: number | string): Promise<string | null> {
    await this.loadMateriaMapping();
    return this.materiaEnumToId?.get(Number(enumValue)) ?? null;
  }

  async objectIdToEnum(objectId: string): Promise<number | null> {
    await this.loadMateriaMapping();
    return this.materiaIdToEnum?.get(objectId) ?? null;
  }

  async create(body: any) {
    const { name, materia, ...rest } = body;
    const materiaId = await this.enumToObjectId(materia);
    return await this.axios.post('v1/frente', {
      ...rest,
      nome: name,
      ...(materiaId ? { materia: materiaId } : {}),
    });
  }

  async getAll(page: number, limit: number) {
    return await this.axios.get(
      `v1/frente?page=${page}&limit=${limit}`,
    );
  }

  async getById(id: string) {
    return await this.axios.get(`v1/frente/${id}`);
  }

  async update(id: string, body: any) {
    const { name, ...rest } = body;
    return await this.axios.patch(`v1/frente/${id}`, {
      ...rest,
      ...(name ? { nome: name } : {}),
    });
  }

  async delete(id: string) {
    return await this.axios.delete(`v1/frente/${id}`);
  }

  async getByMateria(materia: string) {
    const materiaId = await this.enumToObjectId(materia);
    if (!materiaId) return [];
    return await this.axios.get(`v1/frente/materia/${materiaId}`);
  }

  async getByMateriaContentApproved(materia: string) {
    return await this.cache.wrap(
      `frente:materiawithcontent:${materia}`,
      async () => {
        const materiaId = await this.enumToObjectId(materia);
        if (!materiaId) return [];
        return await this.axios.get(
          `v1/frente/materiawithcontent/${materiaId}`,
        );
      },
    );
  }
}
