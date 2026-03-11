import { IsIn } from 'class-validator';

export class UpdateUserStatusDto {
  @IsIn(['active', 'banned'])
  status!: 'active' | 'banned';
}
