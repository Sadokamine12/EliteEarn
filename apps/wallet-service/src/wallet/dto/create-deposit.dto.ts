import { Type } from 'class-transformer';
import { IsIn, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class CreateDepositDto {
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount!: number;

  @IsIn(['USDT_ERC20', 'USDT_TRC20', 'USDT_BEP20'])
  crypto!: 'USDT_ERC20' | 'USDT_TRC20' | 'USDT_BEP20';

  @IsUUID()
  vipTierId!: string;

  @IsOptional()
  @IsString()
  txHash?: string;

  @IsOptional()
  @IsString()
  proofUrl?: string;
}
