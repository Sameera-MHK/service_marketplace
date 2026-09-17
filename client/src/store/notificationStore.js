import { create } from 'zustand';
import api from '../lib/axios';

export const useNotificationStore = create((set, get) => ({
  notifications: [],
  unreadCount: 0,

  fetchNotifications: async () => {
    try {
      const { data } = await api.get('/notifications');
      const notifs = data.data || [];
      set({ notifications: notifs, unreadCount: notifs.filter((n) => !n.read).length });
    } catch {
      // ignore when not authenticated
    }
  },

  markRead: async (id) => {
    try {
      await api.put(`/notifications/${id}/read`);
      set((state) => ({
        notifications: state.notifications.map((n) => (n._id === id ? { ...n, read: true } : n)),
        unreadCount: Math.max(0, state.unreadCount - 1),
      }));
    } catch {
      // ignore
    }
  },

  markAllRead: async () => {
    try {
      await api.put('/notifications/read-all');
      set((state) => ({
        notifications: state.notifications.map((n) => ({ ...n, read: true })),
        unreadCount: 0,
      }));
    } catch {
      // ignore
    }
  },
}));
