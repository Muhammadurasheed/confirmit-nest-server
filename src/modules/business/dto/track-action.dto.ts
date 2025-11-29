import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';

export enum MarketplaceActionType {
  WEBSITE_CLICK = 'website_click',
  DIRECTIONS = 'directions',
  PHONE_CALL = 'phone_call',
  WHATSAPP = 'whatsapp',
}

export class TrackActionDto {
  @ApiProperty({
    example: 'website_click',
    enum: MarketplaceActionType,
  })
  @IsEnum(MarketplaceActionType)
  type: MarketplaceActionType;
}
