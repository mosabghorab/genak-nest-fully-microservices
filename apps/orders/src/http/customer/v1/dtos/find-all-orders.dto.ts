import { IsEnum, IsOptional } from 'class-validator';
import { OrderStatus, ServiceType } from '@app/common';

export class FindAllOrdersDto {
  @IsEnum(ServiceType)
  serviceType: ServiceType;

  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;
}
