import { Expose, Type } from 'class-transformer';
import { AdminsRolesDto, RolesPermissionsDto } from '@app/common';

export class RoleDto {
  @Expose()
  id: number;

  @Expose()
  name: string;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;

  @Expose()
  @Type(() => RolesPermissionsDto)
  rolesPermissions: RolesPermissionsDto[];

  @Expose()
  @Type(() => AdminsRolesDto)
  usersRoles: AdminsRolesDto[];
}
