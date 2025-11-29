import { IsString, IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class InitializeRenewalDto {
  @ApiProperty({ example: 'business@example.com' })
  @IsEmail()
  email: string;
}

export class VerifyRenewalDto {
  @ApiProperty({ example: 'pay_abc123xyz' })
  @IsString()
  reference: string;
}
