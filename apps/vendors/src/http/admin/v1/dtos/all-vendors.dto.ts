import { Expose, Type } from 'class-transformer';
import { VendorDto } from '@app/common';

export class AllVendorsDto {
  @Expose()
  perPage: number;

  @Expose()
  currentPage: number;

  @Expose()
  lastPage: number;

  @Expose()
  total: number;

  @Expose()
  @Type(() => VendorDto)
  data: VendorDto[];
}
