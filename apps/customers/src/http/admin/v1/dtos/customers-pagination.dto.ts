import { Expose, Type } from 'class-transformer';
import { CustomerDto } from '@app/common';

export class CustomersPaginationDto {
  @Expose()
  perPage: number;

  @Expose()
  currentPage: number;

  @Expose()
  lastPage: number;

  @Expose()
  total: number;

  @Expose()
  @Type(() => CustomerDto)
  data: CustomerDto[];
}
