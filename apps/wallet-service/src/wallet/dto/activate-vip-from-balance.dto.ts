import { IsUUID } from 'class-validator';

export class ActivateVipFromBalanceDto {
  @IsUUID()
  vipTierId!: string;
}
