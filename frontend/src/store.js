import { create } from 'zustand';
import * as api from './api';
import { todayStr, parseManualTime } from './constants';
import { validateEntry, ValidationError } from './validate';

// HH:MM — locale-safe, deterministic on every OS
function formatTime() {
  const now = new Date();
  return String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
}

// Request ID per fetch — prevents stale async responses (race condition guard)
let dailyFetchId = 0;
let statsFetchId = 0;

export const useStore = create((set, get) => ({

  // ── Auth ──────────────────────────────────────────────────────────
  currentUser: null,
  authToken:   localStorage.getItem('token') || null,

  login: async (email, password) => {
    const { token, user } = await api.authLogin(email, password);
    localStorage.setItem('token', token);
    set({ authToken: token, currentUser: user });
  },

  register: async (email, username, password) => {
    const data = await api.authRegister(email, username, password);
    if (data.pending) return { pending: true };
    localStorage.setItem('token', data.token);
    set({ authToken: data.token, currentUser: data.user });
  },

  logout: () => {
    localStorage.removeItem('token');
    set({ currentUser: null, authToken: null, dailyEntries: [], stats: null });
  },

  fetchMe: async () => {
    const user = await api.authMe();
    if (!user) {
      get().logout();
    } else {
      set({ currentUser: user });
    }
  },

  uploadAvatar: async (avatar_data) => {
    const updated = await api.uploadAvatar(avatar_data);
    set(s => ({
      currentUser: { ...s.currentUser, avatar_data: updated.avatar_data },
      users: s.users.map(u => u.id === updated.id ? { ...u, avatar_data: updated.avatar_data } : u),
    }));
  },

  // ── UI ────────────────────────────────────────────────────────────
  activeTab:          'log',
  viewDate:           todayStr(),
  setActiveTab:       (tab) => set({ activeTab: tab }),
  setViewDate:        (date) => { set({ viewDate: date }); get().fetchDailyEntries(); },

  // ── Daily entries ─────────────────────────────────────────────────
  dailyEntries:       [],
  dailyLoading:       false,
  dailyError:         null,
  dailySort:          'date-desc',
  dailyProjectFilter: '',

  setDailySort:          (sort)    => { set({ dailySort: sort });            get().fetchDailyEntries(); },
  setDailyProjectFilter: (project) => { set({ dailyProjectFilter: project }); get().fetchDailyEntries(); },

  fetchDailyEntries: async () => {
    const id = ++dailyFetchId;
    const { viewDate, dailySort, dailyProjectFilter } = get();
    set({ dailyLoading: true, dailyError: null });
    try {
      const params = { date: viewDate, sort: dailySort };
      if (dailyProjectFilter) params.project = dailyProjectFilter;
      const entries = await api.getEntries(params);
      if (id !== dailyFetchId) return; // discard stale response
      set({ dailyEntries: entries, dailyLoading: false });
    } catch (err) {
      if (id !== dailyFetchId) return;
      set({ dailyError: err.message, dailyLoading: false });
    }
  },

  // ── Stats ─────────────────────────────────────────────────────────
  stats:        null,
  statsLoading: false,
  statsError:   null,

  fetchStats: async () => {
    const id = ++statsFetchId;
    set({ statsLoading: true, statsError: null });
    try {
      const stats = await api.getStats();
      if (id !== statsFetchId) return;
      set({ stats, statsLoading: false });
    } catch (err) {
      if (id !== statsFetchId) return;
      set({ statsError: err.message, statsLoading: false });
    }
  },

  // ── Mutations ─────────────────────────────────────────────────────
  addEntry: async (formData) => {
    const errors = validateEntry(formData);
    if (errors.length) throw new ValidationError(errors);

    // Use viewDate as the entry date — if user is looking at a past day,
    // the new entry belongs to that day, not today.
    const date     = get().viewDate;
    const time     = formatTime();          // locale-safe manual format
    const duration = parseManualTime(formData.manualTime);

    const entry = await api.createEntry({
      category:    formData.category,
      action:      formData.action,
      status:      formData.status,
      project:     formData.project,
      description: formData.description.trim(),
      duration,
      date,
      time,
    });

    // Optimistic insert — entry always belongs to viewDate, so always prepend
    set(s => ({ dailyEntries: [entry, ...s.dailyEntries] }));

    // Invalidate stats if they've been loaded
    if (get().stats !== null) get().fetchStats();

    get().addToast('Unos dodat ✓', 'success');
    return entry;
  },

  editEntry: async (id, data) => {
    const updated = await api.updateEntry(id, data);
    set(s => ({
      dailyEntries: s.dailyEntries.map(e => e.id === id ? updated : e),
    }));
    // Invalidate stats if they've been loaded
    if (get().stats !== null) get().fetchStats();
    get().addToast('Izmene sačuvane ✓', 'success');
    return updated;
  },

  removeEntry: async (id) => {
    // Optimistic removal
    const snapshot = get().dailyEntries;
    set(s => ({ dailyEntries: s.dailyEntries.filter(e => e.id !== id) }));
    try {
      await api.deleteEntry(id);
      // Invalidate stats if they've been loaded
      if (get().stats !== null) get().fetchStats();
      get().addToast('Unos obrisan', 'info');
    } catch (err) {
      // Revert on failure
      set({ dailyEntries: snapshot });
      get().addToast('Greška pri brisanju', 'error');
      throw err;
    }
  },

  // ── Team stats (manager) ──────────────────────────────────────────
  teamStats:        null,
  teamStatsLoading: false,
  teamStatsError:   null,

  fetchTeamStats: async (params = {}) => {
    set({ teamStatsLoading: true, teamStatsError: null });
    try {
      const data = await api.getTeamStats(params);
      set({ teamStats: data, teamStatsLoading: false });
    } catch (err) {
      set({ teamStatsError: err.message, teamStatsLoading: false });
    }
  },

  // ── Users management (manager) ────────────────────────────────────
  users:             [],
  usersLoading:      false,
  usersError:        null,
  pendingUsersCount: 0,

  fetchPendingCount: async () => {
    try {
      const { count } = await api.getPendingCount();
      set({ pendingUsersCount: count });
    } catch (_) {}
  },

  fetchUsers: async () => {
    set({ usersLoading: true, usersError: null });
    try {
      const data = await api.getUsers();
      set({ users: data, usersLoading: false });
    } catch (err) {
      set({ usersError: err.message, usersLoading: false });
    }
  },

  createUser: async (data) => {
    const user = await api.createUser(data);
    set(s => ({ users: [...s.users, user] }));
    return user;
  },

  toggleUser: async (id) => {
    const updated = await api.toggleUser(id);
    set(s => ({ users: s.users.map(u => u.id === id ? updated : u) }));
    return updated;
  },

  approveUser: async (id) => {
    const updated = await api.approveUser(id);
    set(s => ({
      users: s.users.map(u => u.id === id ? updated : u),
      pendingUsersCount: Math.max(0, s.pendingUsersCount - 1),
    }));
    return updated;
  },

  // ── Toast notifications ───────────────────────────────────────────
  toasts: [],

  addToast: (message, type = 'info') => {
    const id = Date.now() + Math.random();
    set(s => ({ toasts: [...s.toasts, { id, message, type }] }));
    setTimeout(() => {
      set(s => ({ toasts: s.toasts.filter(t => t.id !== id) }));
    }, 3200);
  },

  removeToast: (id) => set(s => ({ toasts: s.toasts.filter(t => t.id !== id) })),

}));
