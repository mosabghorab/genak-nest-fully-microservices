import { forwardRef, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { FindOptionsRelations } from 'typeorm/browser';
import { ClientUserType, Vendor, VendorStatus } from '@app/common';
import { CustomerVendorsValidation } from '../validations/customer-vendors.validation';
import { FindAllVendorsDto } from '../dtos/find-all-vendors.dto';

@Injectable()
export class CustomerVendorsService {
  constructor(
    @InjectRepository(Vendor)
    private readonly vendorRepository: Repository<Vendor>,
    @Inject(forwardRef(() => CustomerVendorsValidation))
    private readonly customerVendorsValidation: CustomerVendorsValidation,
  ) {}

  // find one by id.
  findOneById(id: number, relations?: FindOptionsRelations<Vendor>): Promise<Vendor | null> {
    return this.vendorRepository.findOne({ where: { id }, relations });
  }

  // find one or fail by id.
  async findOneOrFailById(id: number, failureMessage?: string, relations?: FindOptionsRelations<Vendor>): Promise<Vendor> {
    const vendor: Vendor = await this.findOneById(id, relations);
    if (!vendor) {
      throw new NotFoundException(failureMessage || 'Vendor not found.');
    }
    return vendor;
  }

  // find all.
  async findAll(findAllVendorsDto: FindAllVendorsDto): Promise<Vendor[]> {
    await this.customerVendorsValidation.validateFindAll(findAllVendorsDto);
    const queryBuilder: SelectQueryBuilder<Vendor> = this.vendorRepository
      .createQueryBuilder('vendor')
      .leftJoinAndSelect('vendor.governorate', 'governorate')
      .leftJoin('vendor.orders', 'order')
      .leftJoin('vendor.reviews', 'review', 'review.reviewedBy = :reviewedBy', {
        reviewedBy: ClientUserType.CUSTOMER,
      })
      .addSelect(['AVG(order.averageTimeMinutes) AS averageTimeMinutes', 'AVG(review.rate) AS averageRate', 'COUNT(DISTINCT review.id) AS reviewsCount']);
    if (findAllVendorsDto.regionsIds) {
      queryBuilder.innerJoin('vendor.locationsVendors', 'locationVendor', 'locationVendor.locationId IN (:...regionsIds)', {
        regionsIds: findAllVendorsDto.regionsIds,
      });
    }
    queryBuilder
      .where('vendor.serviceType = :serviceType', {
        serviceType: findAllVendorsDto.serviceType,
      })
      .andWhere('vendor.status = :status', {
        status: VendorStatus.ACTIVE,
      })
      .andWhere('vendor.available = :available', {
        available: true,
      });
    if (findAllVendorsDto.governorateId) {
      queryBuilder.andWhere('vendor.governorateId = :governorateId', {
        governorateId: findAllVendorsDto.governorateId,
      });
    }
    if (findAllVendorsDto.name) {
      queryBuilder.andWhere('vendor.name LIKE :name', {
        name: `%${findAllVendorsDto.name}%`,
      });
    }
    queryBuilder.groupBy('vendor.id');
    const { entities, raw }: { entities: Vendor[]; raw: any[] } = await queryBuilder.getRawAndEntities();
    for (let i = 0; i < entities.length; i++) {
      entities[i]['averageTimeMinutes'] = Math.floor(raw[i]['averageTimeMinutes']) || 0;
      entities[i]['averageRate'] = Math.ceil(raw[i]['averageRate']) || 0;
      entities[i]['reviewsCount'] = parseInt(raw[i]['reviewsCount']) || 0;
    }
    return entities;
  }
}
