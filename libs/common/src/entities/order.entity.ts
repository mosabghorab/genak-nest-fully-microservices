import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Customer } from './customer.entity';
import { Vendor } from './vendor.entity';
import { OrderItem } from './order-item.entity';
import { OrderStatusHistory } from './order-status-history.entity';
import { Review } from './review.entity';
import { Complain } from './complain.entity';
import { CustomerAddress, OrderStatus, ServiceType } from '@app/common';

@Entity()
export class Order {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true, nullable: true })
  uniqueId?: string;

  @Column()
  customerId: number;

  @Column()
  vendorId: number;

  @Column()
  customerAddressId: number;

  @Column({
    type: 'enum',
    enum: ServiceType,
  })
  serviceType: ServiceType;

  @Column({
    type: 'enum',
    enum: OrderStatus,
    default: OrderStatus.PENDING,
  })
  status: OrderStatus;

  @Column({ nullable: true })
  note?: string;

  @Column({ type: 'double' })
  total: number;

  @Column({ type: 'datetime', nullable: true })
  startTime?: Date;

  @Column({ type: 'datetime', nullable: true })
  endTime?: Date;

  @Column({ nullable: true })
  averageTimeMinutes?: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // relations.
  // one to many.
  @OneToMany(() => OrderItem, (orderItem) => orderItem.order, { cascade: true })
  orderItems: OrderItem[];

  @OneToMany(() => Review, (review) => review.order, { cascade: true })
  reviews: Review[];

  @OneToMany(() => Complain, (complain) => complain.order, { cascade: true })
  complains: Complain[];

  @OneToMany(
    () => OrderStatusHistory,
    (orderStatusHistory) => orderStatusHistory.order,
    {
      cascade: true,
    },
  )
  orderStatusHistories: OrderStatusHistory[];

  // many to one.
  @ManyToOne(() => Customer, (customer) => customer.orders, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'customerId' })
  customer: Customer;

  @ManyToOne(() => Vendor, (vendor) => vendor.orders, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'vendorId' })
  vendor: Vendor;

  @ManyToOne(
    () => CustomerAddress,
    (customerAddress) => customerAddress.orders,
    {
      onDelete: 'CASCADE',
    },
  )
  @JoinColumn({ name: 'customerAddressId' })
  customerAddress: CustomerAddress;
}
