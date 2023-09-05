import { SetMetadata } from '@nestjs/common';
import { PermissionAction } from '@app/common/enums/permission-action.enum';

export const ADMIN_MUST_CAN_DO_KEY = 'adminMustCanDo';

export const AdminMustCanDo = (permissionsActions: PermissionAction) => SetMetadata(ADMIN_MUST_CAN_DO_KEY, permissionsActions);
