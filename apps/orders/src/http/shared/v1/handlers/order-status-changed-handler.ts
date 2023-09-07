import { Inject, Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
  AuthMicroserviceConnection,
  AuthMicroserviceConstants,
  CreateDatabaseNotificationDto,
  Customer,
  CustomersMicroserviceConnection,
  CustomersMicroserviceConstants,
  FcmNotificationType,
  FcmToken,
  FindAllFcmTokensDto,
  FindOneOrFailByIdDto,
  NotificationsMicroserviceConstants,
  NotificationsMicroserviceImpl,
  NotificationTarget,
  SendFcmNotificationDto,
  UserType,
  Vendor,
  VendorsMicroserviceConstants,
  VendorsMicroserviceImpl,
} from '@app/common';
import { ClientProxy } from '@nestjs/microservices';
import { OrderStatusChangedEvent } from '../events/order-status-changed.event';
import { Constants } from '../../../../constants';

@Injectable()
export class OrderStatusChangedHandler {
  private readonly notificationsMicroserviceImpl: NotificationsMicroserviceImpl;
  private readonly authMicroserviceConnection: AuthMicroserviceConnection;
  private readonly customersMicroserviceConnection: CustomersMicroserviceConnection;
  private readonly vendorsMicroserviceImpl: VendorsMicroserviceImpl;

  constructor(
    @Inject(NotificationsMicroserviceConstants.NAME)
    private readonly notificationsMicroservice: ClientProxy,
    @Inject(AuthMicroserviceConstants.NAME)
    private readonly authMicroservice: ClientProxy,
    @Inject(CustomersMicroserviceConstants.NAME)
    private readonly customersMicroservice: ClientProxy,
    @Inject(VendorsMicroserviceConstants.NAME)
    private readonly vendorsMicroservice: ClientProxy,
  ) {
    this.notificationsMicroserviceImpl = new NotificationsMicroserviceImpl(notificationsMicroservice, Constants.NOTIFICATIONS_MICROSERVICE_VERSION);
    this.authMicroserviceConnection = new AuthMicroserviceConnection(authMicroservice, Constants.AUTH_MICROSERVICE_VERSION);
    this.customersMicroserviceConnection = new CustomersMicroserviceConnection(customersMicroservice, Constants.CUSTOMERS_MICROSERVICE_VERSION);
    this.vendorsMicroserviceImpl = new VendorsMicroserviceImpl(vendorsMicroservice, Constants.VENDORS_MICROSERVICE_VERSION);
  }

  // handle.
  @OnEvent(Constants.ORDER_STATUS_CHANGED_EVENT, { async: true })
  async handle(orderStatusChangedEvent: OrderStatusChangedEvent): Promise<void> {
    await this._sendFcmNotification(orderStatusChangedEvent);
    await this._createDatabaseNotification(orderStatusChangedEvent);
  }

  // send fcm notification.
  private async _sendFcmNotification(orderStatusChangedEvent: OrderStatusChangedEvent): Promise<void> {
    const { authedUser, order }: OrderStatusChangedEvent = orderStatusChangedEvent;
    let fcmTokens: string[] = [];
    if (authedUser.type === UserType.VENDOR) {
      const isNotificationsEnabled: boolean = (
        await this.customersMicroserviceConnection.customersServiceImpl.findOneOrFailById(<FindOneOrFailByIdDto<Customer>>{
          id: order.customerId,
        })
      ).notificationsEnabled;
      if (isNotificationsEnabled) {
        fcmTokens = (
          await this.authMicroserviceConnection.fcmTokensServiceImpl.findAll(<FindAllFcmTokensDto>{
            tokenableId: order.customerId,
            tokenableType: UserType.CUSTOMER,
          })
        ).map((fcmToken: FcmToken) => fcmToken.token);
      }
    } else if (authedUser.type === UserType.CUSTOMER) {
      const isNotificationsEnabled: boolean = (
        await this.vendorsMicroserviceImpl.findOneOrFailById(<FindOneOrFailByIdDto<Vendor>>{
          id: order.vendorId,
        })
      ).notificationsEnabled;
      if (isNotificationsEnabled) {
        fcmTokens = (
          await this.authMicroserviceConnection.fcmTokensServiceImpl.findAll(<FindAllFcmTokensDto>{
            tokenableId: order.vendorId,
            tokenableType: UserType.VENDOR,
          })
        ).map((fcmToken: FcmToken) => fcmToken.token);
      }
    } else if (authedUser.type === UserType.ADMIN) {
      const customerIsNotificationsEnabled: boolean = (
        await this.customersMicroserviceConnection.customersServiceImpl.findOneOrFailById(<FindOneOrFailByIdDto<Customer>>{
          id: order.customerId,
        })
      ).notificationsEnabled;
      if (customerIsNotificationsEnabled) {
        fcmTokens.push(
          ...(
            await this.authMicroserviceConnection.fcmTokensServiceImpl.findAll(<FindAllFcmTokensDto>{
              tokenableId: order.customerId,
              tokenableType: UserType.CUSTOMER,
            })
          ).map((fcmToken: FcmToken) => fcmToken.token),
        );
      }
      const vendorIsNotificationsEnabled: boolean = (
        await this.vendorsMicroserviceImpl.findOneOrFailById(<FindOneOrFailByIdDto<Vendor>>{
          id: order.vendorId,
        })
      ).notificationsEnabled;
      if (vendorIsNotificationsEnabled) {
        fcmTokens.push(
          ...(
            await this.authMicroserviceConnection.fcmTokensServiceImpl.findAll(<FindAllFcmTokensDto>{
              tokenableId: order.vendorId,
              tokenableType: UserType.VENDOR,
            })
          ).map((fcmToken: FcmToken) => fcmToken.token),
        );
      }
    }
    if (fcmTokens.length > 0) {
      this.notificationsMicroserviceImpl.sendFcmNotification(<SendFcmNotificationDto>{
        type: FcmNotificationType.FCM_TOKENS,
        fcmTokens: fcmTokens,
        title: 'Order Status',
        body: `Order status with id ${order.uniqueId} changed to ${order.status} by ${authedUser.type}`,
        notificationTarget: NotificationTarget.ORDER,
        notificationTargetId: order.id,
      });
    }
  }

  // create database notification.
  private async _createDatabaseNotification(orderStatusChangedEvent: OrderStatusChangedEvent): Promise<void> {
    const { authedUser, order }: OrderStatusChangedEvent = orderStatusChangedEvent;
    if (authedUser.type === UserType.ADMIN) {
      const createDatabaseNotificationDtoForCustomer: CreateDatabaseNotificationDto = <CreateDatabaseNotificationDto>{
        notifiableId: order.customerId,
        notifiableType: UserType.CUSTOMER,
        notificationTarget: NotificationTarget.ORDER,
        notificationTargetId: order.id,
        title: 'Order Status',
        body: `Order status with id ${order.uniqueId} changed to ${order.status} by ${authedUser.type}`,
      };
      const createDatabaseNotificationDtoForVendor: CreateDatabaseNotificationDto = <CreateDatabaseNotificationDto>{
        notifiableId: order.vendorId,
        notifiableType: UserType.VENDOR,
        notificationTarget: NotificationTarget.ORDER,
        notificationTargetId: order.id,
        title: 'Order Status',
        body: `Order status with id ${order.uniqueId} changed to ${order.status} by ${authedUser.type}`,
      };
      this.notificationsMicroserviceImpl.createDatabaseNotification(createDatabaseNotificationDtoForCustomer);
      this.notificationsMicroserviceImpl.createDatabaseNotification(createDatabaseNotificationDtoForVendor);
    } else {
      let notifiableType: UserType;
      let notifiableId: number;
      if (authedUser.type === UserType.VENDOR) {
        notifiableType = UserType.CUSTOMER;
        notifiableId = order.customerId;
      } else if (authedUser.type === UserType.CUSTOMER) {
        notifiableType = UserType.VENDOR;
        notifiableId = order.vendorId;
      }
      const createDatabaseNotificationDto: CreateDatabaseNotificationDto = <CreateDatabaseNotificationDto>{
        notifiableId: notifiableId,
        notifiableType: notifiableType,
        notificationTarget: NotificationTarget.ORDER,
        notificationTargetId: order.id,
        title: 'Order Status',
        body: `Order status with id ${order.uniqueId} changed to ${order.status} by ${authedUser.type}`,
      };
      this.notificationsMicroserviceImpl.createDatabaseNotification(createDatabaseNotificationDto);
    }
  }
}
