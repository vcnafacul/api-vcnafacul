import { ApiProperty } from '@nestjs/swagger';

export class EnqueuedItem {
  @ApiProperty() classId: string;
  @ApiProperty() month: string;
}

export class RefreshDtoOutput {
  @ApiProperty({ type: [EnqueuedItem] }) enqueued: EnqueuedItem[];
  @ApiProperty() estimatedSeconds: number;
}
