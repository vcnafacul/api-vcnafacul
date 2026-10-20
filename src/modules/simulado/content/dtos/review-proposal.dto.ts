import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';

/** `ProposalStatus` do ms: 1 aprovada, 2 rejeitada. Pendente (0) não é revisão. */
export class ReviewProposalDto {
  @ApiProperty({ enum: [1, 2] })
  @IsIn([1, 2])
  status: 1 | 2;
}
