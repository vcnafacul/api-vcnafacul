import { ApiProperty } from '@nestjs/swagger';
import { GetAllDtoInput } from 'src/shared/dtos/get-all.dto.input';

export class GetHistoricoDTOInput extends GetAllDtoInput {
  @ApiProperty()
  userId: number;
}
