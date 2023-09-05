import { IsNumber, IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';

export class FindAllLocationsDto {
  @IsOptional()
  @Transform(({ value }): number => parseInt(value))
  @IsNumber()
  parentId?: number;
}
