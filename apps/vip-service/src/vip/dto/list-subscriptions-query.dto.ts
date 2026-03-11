import { IsIn, IsOptional, IsUUID } from 'class-validator';

export class ListSubscriptionsQueryDto {
  @IsOptional()
  @IsUUID()
  userId?: string;

  @IsOptional()
  @IsUUID()
  vipTierId?: string;

  @IsOptional()
  @IsIn(['active', 'expired', 'cancelled'])
  status?: 'active' | 'expired' | 'cancelled';
}
