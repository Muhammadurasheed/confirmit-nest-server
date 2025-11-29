import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class MigrateMarketplaceDto {
  @ApiProperty({
    example: 'admin-user-id-or-token',
    description: 'Admin user ID or authorization token',
  })
  @IsString()
  adminId: string;
}
