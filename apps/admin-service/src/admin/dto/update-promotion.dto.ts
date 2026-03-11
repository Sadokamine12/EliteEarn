import { IsBoolean, IsIn, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class UpdatePromotionDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  subtitle?: string;

  @IsOptional()
  @IsIn(['bonus_week', 'banner', 'wheel'])
  type?: 'bonus_week' | 'banner' | 'wheel';

  @IsOptional()
  @IsNumber()
  @Min(0)
  multiplier?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  endsAt?: string;
}
