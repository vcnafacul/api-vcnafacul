import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { GetAllOutput } from 'src/shared/modules/base/interfaces/get-all.output';
import { EmailService } from 'src/shared/services/email.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { User } from '../user/user.entity';
import { UserService } from '../user/user.service';
import { CreateGeoDTOInput } from './dto/create-geo.dto.input';
import { GeoStatusChangeDTOInput } from './dto/geo-status.dto.input';
import { ListGeoDTOInput } from './dto/list-geo.dto.input';
import { UpdateGeoDTOInput } from './dto/update-geo.dto.input';
import { StatusGeolocation } from './enum/status-geolocation';
import { Geolocation } from './geo.entity';
import { GeoRepository } from './geo.repository';

@Injectable()
export class GeoService {
  constructor(
    private readonly geoRepository: GeoRepository,
    private readonly userService: UserService,
    private readonly emailService: EmailService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async create(geoDTOInput: CreateGeoDTOInput): Promise<Geolocation> {
    const newGeo = await this.geoRepository.create(
      this.convertDtoToDomain(geoDTOInput),
    );
    const listEmail = await this.userService.getvalidateGeo();
    await this.emailService.sendCreateGeoMail(newGeo, listEmail);

    return newGeo;
  }

  async findAllByFilter(
    filterDto: ListGeoDTOInput,
  ): Promise<GetAllOutput<Geolocation>> {
    const where: any = { status: StatusGeolocation.Validated };

    if (filterDto.status) {
      where.status = parseInt(filterDto.status as any) as StatusGeolocation;
    }

    return await this.geoRepository.findAll({
      page: filterDto.page,
      limit: filterDto.limit,
      where,
    });
  }

  async findById(id: number): Promise<Geolocation> {
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
    const oldGeo = await this.findById(updateDTO.id);
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
    const geo = await this.findById(geoStatus.geoId);
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
}
