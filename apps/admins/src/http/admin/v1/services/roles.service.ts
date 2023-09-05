import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FindOptionsRelations } from 'typeorm/browser';
import { Role, RolesPermissions } from '@app/common';
import { RolesPermissionsService } from './roles-permissions.service';
import { CreateRoleDto } from '../dtos/create-role.dto';
import { UpdateRoleDto } from '../dtos/update-role.dto';

@Injectable()
export class RolesService {
  @InjectRepository(Role) private readonly roleRepository: Repository<Role>;

  constructor(@InjectRepository(Role) roleRepository: Repository<Role>, private readonly rolesPermissionsService: RolesPermissionsService) {
    this.roleRepository = roleRepository;
  }

  // create.
  async create(createRoleDto: CreateRoleDto): Promise<Role> {
    const role: Role = await this.roleRepository.create(createRoleDto);
    const savedRole: Role = await this.roleRepository.save(role);
    savedRole.rolesPermissions = createRoleDto.permissionsIds.map(
      (permissionId: number) =>
        <RolesPermissions>{
          roleId: savedRole.id,
          permissionId,
        },
    );
    return this.roleRepository.save(role);
  }

  // find all.
  findAll(): Promise<Role[]> {
    return this.roleRepository.find();
  }

  // find one by id.
  findOneById(id: number, relations?: FindOptionsRelations<Role>): Promise<Role> {
    return this.roleRepository.findOne({
      where: { id },
      relations,
    });
  }

  // find one or fail by id.
  async findOneOrFailById(id: number, failureMessage?: string, relations?: FindOptionsRelations<Role>): Promise<Role> {
    const role: Role = await this.findOneById(id, relations);
    if (!role) {
      throw new NotFoundException(failureMessage || 'Role not found.');
    }
    return role;
  }

  // update.
  async update(id: number, updateRoleDto: UpdateRoleDto): Promise<Role> {
    const role: Role = await this.findOneOrFailById(id, null, { rolesPermissions: true });
    if (updateRoleDto.permissionsIds) {
      await this.rolesPermissionsService.removeAllByRoleId(role.id);
      role.rolesPermissions = updateRoleDto.permissionsIds.map(
        (permissionId: number) =>
          <RolesPermissions>{
            roleId: role.id,
            permissionId,
          },
      );
    }
    Object.assign(role, updateRoleDto);
    return this.roleRepository.save(role);
  }

  // remove.
  async remove(id: number): Promise<Role> {
    const role: Role = await this.findOneOrFailById(id);
    return this.roleRepository.remove(role);
  }
}
