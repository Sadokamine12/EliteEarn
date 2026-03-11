import { Type } from 'class-transformer';
import { IsIn, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateWithdrawalDto {
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount!: number;

  @IsString()
  walletAddress!: string;

  @IsOptional()
  @IsIn(['USDT_BEP20', 'BTC'])
  crypto?: 'USDT_BEP20' | 'BTC';
}
