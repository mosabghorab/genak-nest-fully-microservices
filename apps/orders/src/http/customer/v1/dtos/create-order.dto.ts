import { IsEnum, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateOrderItemDto } from './create-order-item.dto';
import { ServiceType } from '@app/common';

export class CreateOrderDto {
  @IsNumber()
  vendorId: number;

  @IsNumber()
  customerAddressId: number;

  @IsEnum(ServiceType)
  serviceType: ServiceType;

  @IsOptional()
  @IsString()
  note?: string;

  @IsNumber()
  total: number;

  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  orderItems: CreateOrderItemDto[];
}
