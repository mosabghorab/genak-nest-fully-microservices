import { IsEnum, IsNumber, IsString } from 'class-validator';
import { Transform } from 'class-transformer';
import { ServiceType } from '@app/common';

export class CreateProductDto {
  @IsString()
  name: string;

  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  price: number;

  @IsEnum(ServiceType)
  serviceType: ServiceType;

  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  size: number;
}
