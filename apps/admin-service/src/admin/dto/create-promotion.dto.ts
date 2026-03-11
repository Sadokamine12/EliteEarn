import { IsBoolean, IsIn, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreatePromotionDto {
  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  subtitle?: string;

  @IsIn(['bonus_week', 'banner', 'wheel'])
  type!: 'bonus_week' | 'banner' | 'wheel';

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
