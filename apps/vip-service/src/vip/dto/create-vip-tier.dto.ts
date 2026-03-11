import { IsBoolean, IsInt, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString, MaxLength, Min } from 'class-validator';

export class CreateVipTierDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  name!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  slug!: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  price!: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  dailyEarnings!: number;

  @IsInt()
  @Min(1)
  dailyTasksCount!: number;

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
