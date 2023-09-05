import { IsNumber, IsOptional, IsString } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateLocationDto {
  @IsString()
  name: string;

  @IsOptional()
  @Transform(({ value }): number => parseInt(value))
  @IsNumber()
  parentId?: number;
}
