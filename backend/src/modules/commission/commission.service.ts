import prisma from '../shared/utils/prisma';

class CommissionService {
  async getAll(academicYear: string) {
    const commissions = await prisma.commission.findMany({
      where: {
        academicYear,
        deletedAt: null,
      },
      orderBy: {
        name: 'asc'
      },
      include: {
        roles: {
          orderBy: { sortOrder: 'asc' },
          include: {
            assignments: {
              include: {
                staff: true
              }
            }
          }
        }
      }
    });

    // Mevcut frontend yapısını bozmamak için role'leri map'liyoruz
    return commissions.map(c => {
      const roles = c.roles.map(r => {
        const assignment = r.assignments[0];
        return {
          id: r.id,
          commissionId: r.commissionId,
          roleName: r.roleName,
          sortOrder: r.sortOrder,
          staffId: assignment?.staffId || null,
          staffName: assignment?.staff?.name || null
        };
      });
      return { ...c, roles };
    });
  }

  async create(data: { name: string; description?: string; academicYear: string; extraData?: string }) {
    const commission = await prisma.commission.create({
      data: {
        name: data.name.trim(),
        description: data.description || null,
        academicYear: data.academicYear,
        extraData: data.extraData || null,
      }
    });
    return { ...commission, roles: [] };
  }

  async update(id: string, data: Partial<{ name: string; description: string; extraData: string }>) {
    await prisma.commission.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name.trim() }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.extraData !== undefined && { extraData: data.extraData }),
      }
    });
  }

  async delete(id: string) {
    await prisma.commission.update({
      where: { id },
      data: { deletedAt: new Date() }
    });
  }

  // Roller
  async addRole(data: { commissionId: string; roleName: string; sortOrder?: number }) {
    return await prisma.commissionRole.create({
      data: {
        commissionId: data.commissionId,
        roleName: data.roleName,
        sortOrder: data.sortOrder ?? 0
      }
    });
  }

  async deleteRole(id: string) {
    await prisma.commissionRole.delete({
      where: { id }
    });
  }

  // Atamalar
  async assign(data: { roleId: string; staffId: string }) {
    // Aynı role ait önceki atamayı sil (Her role bir personel kuralı)
    await prisma.commissionAssignment.deleteMany({
      where: { roleId: data.roleId }
    });

    return await prisma.commissionAssignment.create({
      data: {
        roleId: data.roleId,
        staffId: data.staffId
      }
    });
  }

  async unassign(roleId: string) {
    await prisma.commissionAssignment.deleteMany({
      where: { roleId }
    });
  }
}

export const commissionService = new CommissionService();
