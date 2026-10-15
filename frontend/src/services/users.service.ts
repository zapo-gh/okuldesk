import api from './api';

export interface UserItem {
  id: string;
  username: string;
  fullName: string;
  role: string;
  permissions: string[];
  isActive: boolean;
  mustChangePassword: boolean;
  createdAt: string;
  staff?: {
    id: string;
    name: string;
    title?: string;
  } | null;
}

export interface PermissionCategory {
  name: string;
  permissions: {
    key: string;
    label: string;
    description: string;
  }[];
}

export interface RolePreset {
  id: string;
  name: string;
  description: string;
  permissions: string[];
}

export interface UsersMeta {
  categories: PermissionCategory[];
  presets: RolePreset[];
}

export const usersService = {
  async list(): Promise<UserItem[]> {
    const res = await api.get('/users');
    return res.data.data;
  },

  async getMeta(): Promise<UsersMeta> {
    const res = await api.get('/users/permissions-meta');
    return res.data.data;
  },

  async getOne(id: string): Promise<UserItem> {
    const res = await api.get(`/users/${id}`);
    return res.data.data;
  },

  async create(data: {
    username: string;
    fullName?: string;
    password?: string;
    role?: string;
    permissions?: string[];
    isActive?: boolean;
  }): Promise<{ user: UserItem; plainPassword?: string }> {
    const res = await api.post('/users', data);
    return {
      user: res.data.data,
      plainPassword: res.data.plainPassword,
    };
  },

  async update(
    id: string,
    data: {
      fullName?: string;
      role?: string;
      permissions?: string[];
      isActive?: boolean;
    }
  ): Promise<UserItem> {
    const res = await api.put(`/users/${id}`, data);
    return res.data.data;
  },

  async resetPassword(
    id: string,
    newPassword?: string
  ): Promise<{ success: boolean; username: string; plainPassword: string; message: string }> {
    const res = await api.post(`/users/${id}/reset-password`, { newPassword });
    return res.data;
  },

  async delete(id: string): Promise<{ success: boolean; message: string }> {
    const res = await api.delete(`/users/${id}`);
    return res.data;
  },
};
