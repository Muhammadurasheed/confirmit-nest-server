import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class ActivateMarketplaceDto {
  @ApiProperty({ example: 'BIZ-123456' })
  @IsString()
  businessId: string;
}
