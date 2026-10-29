'use client';

/**
 * Kiểm tra trạng thái Chế độ Bảo trì (Maintenance Mode) của hệ thống FPREP.
 * Ưu tiên:
 * 1. Giá trị ghi đè trong localStorage (nếu Admin thao tác trực tiếp trên giao diện)
 * 2. Biến môi trường NEXT_PUBLIC_MAINTENANCE_MODE
 */
export function getMaintenanceStatus(): boolean {
  if (typeof window !== 'undefined') {
    const override = localStorage.getItem('fprep_maintenance_mode');
    if (override !== null) {
      return override === 'true';
    }
  }
  return process.env.NEXT_PUBLIC_MAINTENANCE_MODE === 'true';
}

export function setMaintenanceStatus(enabled: boolean): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('fprep_maintenance_mode', enabled ? 'true' : 'false');
    window.dispatchEvent(new Event('maintenance_status_changed'));
  }
}

export function clearMaintenanceOverride(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('fprep_maintenance_mode');
    window.dispatchEvent(new Event('maintenance_status_changed'));
  }
}
