import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { BaseService } from 'src/shared/modules/base/base.service';
import { OrConditional } from 'src/shared/modules/base/interfaces/get-all.input';
import { GetAllOutput } from 'src/shared/modules/base/interfaces/get-all.output';
import { EmailService } from 'src/shared/services/email/email.service';
import { AuditLog } from '../audit-log/audit-log.entity';
import { AuditLogRepository } from '../audit-log/audit-log.repository';
import { AuditLogService } from '../audit-log/audit-log.service';
import { User } from '../user/user.entity';
import { UserService } from '../user/user.service';
import { CreateGeoDTOInput } from './dto/create-geo.dto.input';
import { GeoStatusChangeDTOInput } from './dto/geo-status.dto.input';
import { ListGeoDTOInput } from './dto/list-geo.dto.input';
import { ReportMapHome } from './dto/report-map-home';
import { UpdateGeoDTOInput } from './dto/update-geo.dto.input';
import { Geolocation } from './geo.entity';
import { GeoRepository } from './geo.repository';

const TypeAuditLog = 'geolocations';

@Injectable()
export class GeoService extends BaseService<Geolocation> {
  constructor(
    private readonly geoRepository: GeoRepository,
    private readonly userService: UserService,
    private readonly emailService: EmailService,
    private readonly auditLogService: AuditLogService,
    private readonly auditLogRepository: AuditLogRepository,
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
    const data = await this.geoRepository.findAllBy({
      page: page,
      limit: limit,
      where,
      or,
    });
    return data;
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
      entityType: TypeAuditLog,
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
      entityType: TypeAuditLog,
      entityId: geo.id,
      changes: changes,
      updatedBy: user.id,
    });
  }

  async reportMapHome(request: ReportMapHome): Promise<void> {
    let user;
    if (request.updatedBy) {
      user = await this.userService.findOneBy({
        email: request.updatedBy,
      });
    }
    const geo = await this.geoRepository.findOneBy({
      id: request.entityId,
    });
    if (!geo) {
      throw new HttpException(
        `Cursinho com não encontrado`,
        HttpStatus.NOT_FOUND,
      );
    }
    geo.reportAddress = geo.reportAddress ? true : request.address;
    geo.reportContact = geo.reportContact ? true : request.contact;
    geo.reportOther = geo.reportOther ? true : request.other;
    await this.geoRepository.update(geo);

    const auditLog = new AuditLog();
    auditLog.entityType = TypeAuditLog;
    auditLog.entityId = request.entityId;
    auditLog.changes = request.message;
    auditLog.updatedBy = request.updatedBy ? user.id : null;

    await this.auditLogRepository.create(auditLog);
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
