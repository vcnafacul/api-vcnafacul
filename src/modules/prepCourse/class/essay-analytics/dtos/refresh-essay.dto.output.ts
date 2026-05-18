import { ApiProperty } from '@nestjs/swagger';

export class EssayEnqueuedItem {
  @ApiProperty() classId: string;
  @ApiProperty() month: string;
  @ApiProperty({ enum: ['essay'] }) type: 'essay';
}

export class RefreshEssayDtoOutput {
  @ApiProperty({ type: [EssayEnqueuedItem] }) enqueued: EssayEnqueuedItem[];
  @ApiProperty() estimatedSeconds: number;
}
