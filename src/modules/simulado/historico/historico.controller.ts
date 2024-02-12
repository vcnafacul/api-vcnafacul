import { Controller, Get, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiResponse, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "src/shared/guards/jwt-auth.guard";
import { Request } from 'express';
import { HistoricoService } from "./historico.service";
import { User } from "src/modules/user/user.entity";

@ApiTags('Historico')
@Controller('mssimulado/historico')
export class HistoricoController {
  constructor(private readonly service: HistoricoService) {}

  @Get()
  @ApiBearerAuth()
  @ApiResponse({
    status: 200,
    description: 'obtém todos os históricos de simulados',
  })
  @UseGuards(JwtAuthGuard)
  async getAllByUser(@Req() req: Request) {
    console.log("🚀 ~ HistoricoController ~ getAllByUser ~ req:", req)
    return await this.service.getAllByUser((req.user as User).id);
  }
}