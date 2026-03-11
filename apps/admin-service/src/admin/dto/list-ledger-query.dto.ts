import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

const statuses = ['pending', 'approved', 'rejected'] as const;

export class ListLedgerQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsIn(statuses)
  status?: (typeof statuses)[number];

  @IsOptional()
  @IsString()
  crypto?: string;
}
