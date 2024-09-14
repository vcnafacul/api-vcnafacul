import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { BaseService } from 'src/shared/modules/base/base.service';
import { OrConditional } from 'src/shared/modules/base/interfaces/get-all.input';
import { GetAllOutput } from 'src/shared/modules/base/interfaces/get-all.output';
import { EmailService } from 'src/shared/services/email/email.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { User } from '../user/user.entity';
import { UserService } from '../user/user.service';
import { CreateGeoDTOInput } from './dto/create-geo.dto.input';
import { GeoStatusChangeDTOInput } from './dto/geo-status.dto.input';
import { ListGeoDTOInput } from './dto/list-geo.dto.input';
import { UpdateGeoDTOInput } from './dto/update-geo.dto.input';
import { Geolocation } from './geo.entity';
import { GeoRepository } from './geo.repository';

@Injectable()
export class GeoService extends BaseService<Geolocation> {
  constructor(
    private readonly geoRepository: GeoRepository,
    private readonly userService: UserService,
    private readonly emailService: EmailService,
    private readonly auditLogService: AuditLogService,
  ) {
    super(geoRepository);
  }

  async create(geoDTOInput: CreateGeoDTOInput): Promise<Geolocation> {
    const newGeo = await this.geoRepository.create(
      this.convertDtoToDomain(geoDTOInput),
    );
    const listEmail = await this.userService.getvalidateGeo();
    await this.emailService.sendCreateGeoMail(newGeo, listEmail);

    return newGeo;
  }

  async findAllByFilter({
    page,
    limit,
    status,
    text,
  }: ListGeoDTOInput): Promise<GetAllOutput<Geolocation>> {
    const where: any = { status };

    const or = this.generateTextCombinations(text);

    return await this.geoRepository.findAllBy({
      page: page,
      limit: limit,
      where,
      or,
    });
  }

  async findOneById(id: string): Promise<Geolocation> {
    const geo = await this.geoRepository.findOneBy({ id: id });

    // Verifica se o registro existe
    if (!geo) {
      throw new HttpException(
        `Geolocation with id ${id} not found`,
        HttpStatus.NOT_FOUND,
      );
    }
    return geo;
  }

  async updateGeo(updateDTO: UpdateGeoDTOInput, user: User): Promise<boolean> {
    const oldGeo = await this.findOneById(updateDTO.id);
    const changes = {};
    Object.keys(updateDTO).forEach((key) => {
      if (updateDTO[key] !== undefined && updateDTO[key] !== oldGeo[key]) {
        changes[key] = { old: oldGeo[key], new: updateDTO[key] };
        oldGeo[key] = updateDTO[key];
      }
    });
    if (Object.keys(changes).length === 0) {
      return false;
    }
    await this.geoRepository.update(oldGeo);
    await this.auditLogService.create({
      entityType: 'geolocations',
      entityId: oldGeo.id,
      changes: changes,
      updatedBy: user.id,
    });
    return true;
  }

  async validateGeolocation(geoStatus: GeoStatusChangeDTOInput, user: User) {
    const geo = await this.findOneById(geoStatus.geoId);
    const oldStatus = geo.status;
    geo.status = geoStatus.status;
    await this.geoRepository.update(geo);

    const changes = { old: { status: oldStatus }, new: { status: geo.status } };
    if (geoStatus.refuseReason) {
      changes['refuseReason'] = geoStatus.refuseReason;
    }

    await this.auditLogService.create({
      entityType: 'geolocations',
      entityId: geo.id,
      changes: changes,
      updatedBy: user.id,
    });
  }

  private convertDtoToDomain(dto: CreateGeoDTOInput): Geolocation {
    const geolocation = new Geolocation();
    return Object.assign(geolocation, dto) as Geolocation;
  }

  private generateTextCombinations(text: string): OrConditional[] {
    const combinations: OrConditional[] = [];

    combinations.push({ prop: 'name', value: text });
    combinations.push({ prop: 'state', value: text });
    combinations.push({ prop: 'city', value: text });
    combinations.push({ prop: 'email', value: text });
    combinations.push({ prop: 'category', value: text });

    return combinations;
  }
}
