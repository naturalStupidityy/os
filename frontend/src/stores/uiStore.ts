import { create } from 'zustand';

type ToastVariant = 'default' | 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  title: string;
  description?: string;
  variant: ToastVariant;
  duration?: number;
}

interface UIStore {
  // Toasts
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
  clearToasts: () => void;

  // Sidebar
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;

  // Bottom Sheet (Mobile)
  activeSheet: string | null;
  sheetData: Record<string, unknown>;
  openSheet: (sheet: string, data?: Record<string, unknown>) => void;
  closeSheet: () => void;

  // Modal
  activeModal: string | null;
  modalData: Record<string, unknown>;
  openModal: (modal: string, data?: Record<string, unknown>) => void;
  closeModal: () => void;

  // Theme
  theme: 'light' | 'dark' | 'system';
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
}

export const useUIStore = create<UIStore>((set) => ({
  // Toasts
  toasts: [],
  addToast: (toast) =>
    set((state) => ({
      toasts: [
        ...state.toasts,
        { ...toast, id: Math.random().toString(36).substring(7) },
      ],
    })),
  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),
  clearToasts: () => set({ toasts: [] }),

  // Sidebar
  sidebarOpen: false,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),

  // Bottom Sheet
  activeSheet: null,
  sheetData: {},
  openSheet: (sheet, data) => set({ activeSheet: sheet, sheetData: data ?? {} }),
  closeSheet: () => set({ activeSheet: null, sheetData: {} }),

  // Modal
  activeModal: null,
  modalData: {},
  openModal: (modal, data) => set({ activeModal: modal, modalData: data ?? {} }),
  closeModal: () => set({ activeModal: null, modalData: {} }),

  // Theme
  theme: 'system',
  setTheme: (theme) => set({ theme }),
}));

// Helper to show toast
export const showToast = (title: string, options?: { description?: string; variant?: ToastVariant; duration?: number }) => {
  const { addToast } = useUIStore.getState();
  addToast({
    title,
    description: options?.description,
    variant: options?.variant ?? 'default',
    duration: options?.duration ?? 5000,
  });
};
