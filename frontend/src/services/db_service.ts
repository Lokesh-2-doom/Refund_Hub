// frontend/src/services/db_service.ts

const API_BASE_URL = `${import.meta.env.VITE_BASE_URL || 'http://127.0.0.1:8000'}/api`;

export const apiService = {
  // ─── ADMIN PROFILE FUNCTIONS ────────────────────────────────────────────
  getAdminProfile: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/users/admin/profile`);
      if (!response.ok) throw new Error('Failed to fetch admin profile');
      return await response.json();
    } catch (error) {
      console.error('Fetch admin error:', error);
      throw error;
    }
  },

  getUserProfile: async (userId: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/users/${userId}/profile`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to fetch user profile');
      }
      return await response.json();
    } catch (error) {
      console.error('Fetch user profile error:', error);
      throw error;
    }
  },

  updateUserData: async (userId: string, data: any) => {
    try {
      const response = await fetch(`${API_BASE_URL}/user/update`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, _id: userId }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to update data');
      }
      return await response.json();
    } catch (error) {
      console.error('Database update error:', error);
      throw error;
    }
  },

  changePassword: async (userId: string, currentPassword: string, newPassword: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/users/${userId}/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to change password');
      }
      return await response.json();
    } catch (error) {
      console.error('Password change error:', error);
      throw error;
    }
  },

  // ─── PORTAL SETTINGS FUNCTIONS ──────────────────────────────────────────
  getSettings: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/settings`);
      if (!response.ok) throw new Error('Failed to fetch settings');
      return await response.json();
    } catch (error) {
      console.error('Fetch settings error:', error);
      throw error;
    }
  },

  updateSettings: async (settingsData: any) => {
    try {
      const response = await fetch(`${API_BASE_URL}/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settingsData),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to update settings');
      }
      return await response.json();
    } catch (error) {
      console.error('Update settings error:', error);
      throw error;
    }
  },

  // ─── ADMIN: SECRETARY MANAGEMENT ────────────────────────────────────────
  createSecretary: async (secretaryData: any) => {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/secretaries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(secretaryData),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to create secretary');
      }
      return await response.json();
    } catch (error) {
      console.error('Create secretary error:', error);
      throw error;
    }
  },

  getSecretaries: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/secretaries`);
      if (!response.ok) throw new Error('Failed to fetch secretaries');
      return await response.json();
    } catch (error) {
      console.error('Fetch secretaries error:', error);
      throw error;
    }
  },

  getAdminClaims: async (statuses?: string[]) => {
    try {
      const query = statuses?.length ? `?status=${encodeURIComponent(statuses.join(','))}` : '';
      const response = await fetch(`${API_BASE_URL}/admin/claims${query}`);
      if (!response.ok) throw new Error('Failed to fetch admin claims');
      return await response.json();
    } catch (error) {
      console.error('Fetch admin claims error:', error);
      throw error;
    }
  },

  getVerificationClaims: async (params?: { statuses?: string[]; type?: string }) => {
    try {
      const qs = new URLSearchParams();
      if (params?.statuses?.length) qs.set('status', params.statuses.join(','));
      if (params?.type) qs.set('type', params.type);
      const suffix = qs.toString() ? `?${qs.toString()}` : '';
      const response = await fetch(`${API_BASE_URL}/verify/claims${suffix}`);
      if (!response.ok) throw new Error('Failed to fetch verification claims');
      return await response.json();
    } catch (error) {
      console.error('Fetch verification claims error:', error);
      throw error;
    }
  },

  getAuditLogs: async (params?: { search?: string; status?: string; page?: number; limit?: number }) => {
    try {
      const qs = new URLSearchParams();
      if (params?.search) qs.set('search', params.search);
      if (params?.status) qs.set('status', params.status);
      if (params?.page) qs.set('page', String(params.page));
      if (params?.limit) qs.set('limit', String(params.limit));
      const suffix = qs.toString() ? `?${qs.toString()}` : '';
      const response = await fetch(`${API_BASE_URL}/admin/audit-logs${suffix}`);
      if (!response.ok) throw new Error('Failed to fetch audit logs');
      return await response.json();
    } catch (error) {
      console.error('Fetch audit logs error:', error);
      throw error;
    }
  },

  deleteSecretary: async (id: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/secretaries/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to delete secretary');
      }
      return await response.json();
    } catch (error) {
      console.error('Delete secretary error:', error);
      throw error;
    }
  },

  // ─── SEARCH USER BY ROLL NO OR EMAIL ────────────────────────────────────
  // Returns the user object if found, or null if not found (404).
  // Throws on network/server errors.
  searchUser: async (query: string) => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/users/search?query=${encodeURIComponent(query)}`
      );
      if (response.status === 404) return null; // Not found — not a crash
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Search failed');
      }
      return await response.json();
    } catch (error) {
      console.error('Search user error:', error);
      throw error;
    }
  },

  // ─── UPDATE USER ROLE ────────────────────────────────────────────────────
  // Used to assign (e.g. 'Celesta_FC') or revoke (back to 'STUDENT') FC role.
  updateUserRole: async (userId: string, role: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/users/${userId}/role`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to update role');
      }
      return await response.json();
    } catch (error) {
      console.error('Update role error:', error);
      throw error;
    }
  },
};
