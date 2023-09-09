import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { SendVerificationCodeDto } from '../../../shared/v1/dtos/send-verification-code.dto';
import { SignInWithPhoneDto } from '../../../shared/v1/dtos/sign-in-with-phone.dto';
import { FcmTokensService } from '../../../shared/v1/services/fcm-tokens.service';
import { VerificationCodesService } from '../../../shared/v1/services/verification-codes.service';
import {
  AuthedUser,
  ClientUserType,
  CreateAttachmentDto,
  DateHelpers,
  FcmToken,
  FindOneOrFailByIdDto,
  FindOneOrFailByPhoneDto,
  UserType,
  Vendor,
  VendorSignUpDto,
  VendorsMicroserviceConnection,
  VendorsMicroserviceConstants,
  VendorUploadDocumentsDto,
  VerificationCode,
} from '@app/common';
import { ClientProxy } from '@nestjs/microservices';
import { Constants } from '../../../../constants';
import { VendorAuthValidation } from '../validations/vendor-auth.validation';
import { FindOneFcmTokenDto } from '../../../shared/v1/dtos/find-one-fcm-token.dto';
import { CreateFcmTokenDto } from '../../../shared/v1/dtos/create-fcm-token.dto';

@Injectable()
export class VendorAuthService {
  private readonly vendorsMicroserviceConnection: VendorsMicroserviceConnection;

  constructor(
    private readonly jwtService: JwtService,
    private readonly fcmTokensService: FcmTokensService,
    private readonly verificationCodesService: VerificationCodesService,
    private readonly vendorAuthValidation: VendorAuthValidation,
    @Inject(VendorsMicroserviceConstants.NAME)
    private readonly vendorsMicroservice: ClientProxy,
  ) {
    this.vendorsMicroserviceConnection = new VendorsMicroserviceConnection(vendorsMicroservice, Constants.VENDORS_MICROSERVICE_VERSION);
  }

  // send verification code.
  async sendVerificationCode(sendVerificationCodeDto: SendVerificationCodeDto): Promise<void> {
    await this.vendorsMicroserviceConnection.vendorsServiceImpl.findOneOrFailByPhone(<FindOneOrFailByPhoneDto<Vendor>>{
      phone: sendVerificationCodeDto.phone,
    });
    await this.verificationCodesService.create(sendVerificationCodeDto.phone, ClientUserType.VENDOR);
  }

  // sign in with phone.
  async signInWithPhone(signInWithPhoneDto: SignInWithPhoneDto): Promise<any> {
    const vendor: Vendor = await this.vendorsMicroserviceConnection.vendorsServiceImpl.findOneOrFailByPhone(<FindOneOrFailByPhoneDto<Vendor>>{
      phone: signInWithPhoneDto.phone,
    });
    const verificationCode: VerificationCode = await this.verificationCodesService.findLastOneOrFailByPhone(signInWithPhoneDto.phone, ClientUserType.VENDOR);
    if (signInWithPhoneDto.code !== verificationCode.code) {
      throw new BadRequestException('Invalid verification code.');
    }
    if (DateHelpers.calculateTimeDifferenceInMinutes(verificationCode.createdAt, new Date()) > 3) {
      throw new BadRequestException('Expired verification code.');
    }
    const fcmToken: FcmToken = await this.fcmTokensService.findOne(<FindOneFcmTokenDto>{
      tokenableId: vendor.id,
      tokenableType: UserType.VENDOR,
      token: signInWithPhoneDto.fcmToken,
    });
    if (!fcmToken) {
      await this.fcmTokensService.create(<CreateFcmTokenDto>{
        tokenableId: vendor.id,
        tokenableType: UserType.VENDOR,
        token: signInWithPhoneDto.fcmToken,
      });
    }
    const accessToken: string = await this.jwtService.signAsync(<AuthedUser>{
      id: vendor.id,
      type: UserType.VENDOR,
    });
    return { ...vendor, accessToken };
  }

  // sign up.
  async signUp(vendorSignUpDto: VendorSignUpDto, avatar?: Express.Multer.File): Promise<Vendor> {
    await this.vendorAuthValidation.validateSignUp(vendorSignUpDto);
    return this.vendorsMicroserviceConnection.vendorsServiceImpl.create(vendorSignUpDto, avatar);
  }

  // upload documents.
  async uploadDocuments(vendorId: number, files?: Express.Multer.File[]): Promise<Vendor> {
    const {
      createAttachmentDtoList,
      vendor,
    }: {
      vendor: Vendor;
      createAttachmentDtoList: CreateAttachmentDto[];
    } = await this.vendorAuthValidation.validateUploadDocuments(vendorId, files);
    return this.vendorsMicroserviceConnection.vendorsServiceImpl.uploadDocuments(<VendorUploadDocumentsDto>{
      vendorId: vendor.id,
      createAttachmentDtoList,
    });
  }

  // delete account.
  async deleteAccount(vendorId: number): Promise<Vendor> {
    const vendor: Vendor = await this.vendorsMicroserviceConnection.vendorsServiceImpl.findOneOrFailById(<FindOneOrFailByIdDto<Vendor>>{
      id: vendorId,
    });
    return this.vendorsMicroserviceConnection.vendorsServiceImpl.removeOneByInstance(vendor);
  }
}
