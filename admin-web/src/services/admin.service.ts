import api from "./api";

export const adminService = {
  async getOverview() {
    const response = await api.get("/admin/panel/overview");
    return response.data;
  },

  async listUsers() {
    const response = await api.get("/admin/panel/users");
    return response.data;
  },

  async deleteUser(userId: string) {
    const response = await api.delete(`/admin/panel/users/${userId}`);
    return response.data;
  },

  async getLogs() {
    const response = await api.get("/admin/panel/logs");
    return response.data;
  },

  async listProviders(status: "pending" | "approved" | "rejected" = "pending") {
    const response = await api.get("/admin/providers", {
      params: { status },
    });
    return response.data;
  },

  async approveProvider(userId: string) {
    const response = await api.post(`/admin/providers/${userId}/approve`);
    return response.data;
  },

  async rejectProvider(userId: string, reason: string) {
    const response = await api.post(`/admin/providers/${userId}/reject`, {
      reason,
    });
    return response.data;
  },
};
