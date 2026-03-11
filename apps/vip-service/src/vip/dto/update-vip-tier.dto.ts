import { IsBoolean, IsInt, IsNumber, IsOptional, IsPositive, IsString, MaxLength, Min } from 'class-validator';

export class UpdateVipTierDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  slug?: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  price?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  dailyEarnings?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  dailyTasksCount?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  durationDays?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
