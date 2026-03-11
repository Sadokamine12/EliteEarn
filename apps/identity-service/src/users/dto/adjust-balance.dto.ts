import { IsIn, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class AdjustBalanceDto {
  @IsIn(['available', 'pending', 'total_earned', 'this_month'])
  field!: 'available' | 'pending' | 'total_earned' | 'this_month';

  @IsIn(['credit', 'debit', 'set'])
  operation!: 'credit' | 'debit' | 'set';

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  amount!: number;
}
