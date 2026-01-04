import { MibNode, CollectorType } from '../types';

const API_BASE = '/api';

export interface ApiResponse<T> {
  data?: T;
  error?: string;
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

// Devices API
export const devicesApi = {
  getAll: () => request<any[]>('/devices'),
  create: (device: any) => request<any>('/devices', {
    method: 'POST',
    body: JSON.stringify(device),
  }),
  createBatch: (devices: any[]) => request<any[]>('/devices/batch', {
    method: 'POST',
    body: JSON.stringify(devices),
  }),
  delete: (id: string) => request<void>(`/devices/${id}`, { method: 'DELETE' }),
};

// MIB Archives API
export interface ServerZipFile {
  type: 'file' | 'directory';
  name: string;
  path: string;
  size?: string;
}

export interface ScanResult {
  path: string;
  files: ServerZipFile[];
  error?: string;
}

export const mibApi = {
  getArchives: () => request<any[]>('/mib/archives'),
  getArchiveDetail: (id: string) => request<any>(`/mib/archives/${id}`),
  upload: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await fetch(`${API_BASE}/mib/upload`, {
      method: 'POST',
      body: formData,
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Upload failed' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }
    return response.json();
  },
  deleteArchive: (id: string) => request<void>(`/mib/archives/${id}`, { method: 'DELETE' }),
  scanDirectory: (path: string) => request<ScanResult>(`/mib/scan?path=${encodeURIComponent(path)}`),
  extractFromPath: (path: string) => request<any>('/mib/extract', {
    method: 'POST',
    body: JSON.stringify({ path }),
  }),
  parseFile: (path: string) => request<any>('/mib/parse', {
    method: 'POST',
    body: JSON.stringify({ path }),
  }),
};

// SNMP API
export const snmpApi = {
  get: (deviceId: string, oids: string[]) => request<any[]>('/snmp/get', {
    method: 'POST',
    body: JSON.stringify({ deviceId, oids }),
  }),
  walk: (deviceId: string, oid: string) => request<any[]>('/snmp/walk', {
    method: 'POST',
    body: JSON.stringify({ deviceId, oid }),
  }),
  test: (device: any) => request<{ success: boolean; error?: string; message?: string }>('/snmp/test', {
    method: 'POST',
    body: JSON.stringify(device),
  }),
};

// Config API
export const configApi = {
  get: () => request<any>('/config'),
  update: (config: any) => request<any>('/config', {
    method: 'PUT',
    body: JSON.stringify(config),
  }),
};

// ===== New APIs =====

// Presets API
export interface MibPreset {
  id: string;
  category: 'Standard' | 'Vendor' | 'Cloud';
  name: string;
  description: string;
  nodes: MibNode[];
}

export interface QuickOID {
  name: string;
  oid: string;
  vendor: string;
}

export const presetsApi = {
  getPresets: () => request<MibPreset[]>('/presets'),
  getQuickOIDs: () => request<QuickOID[]>('/presets/quick-oids'),
};

// Generator API
export interface GenerateConfigRequest {
  collector: CollectorType;
  version: string;
  nodes: MibNode[];
  community?: string;
  mibRoot?: string;
}

export interface GenerateConfigResponse {
  config: string;
  collector: string;
  version: string;
  count: number;
}

export interface GenerateCodeRequest {
  node: MibNode;
  language: 'python' | 'javascript' | 'go' | 'java' | 'shell';
}

export interface GenerateCodeResponse {
  code: string;
  language: string;
  oid: string;
  name: string;
}

export const generatorApi = {
  generateConfig: (req: GenerateConfigRequest) => request<GenerateConfigResponse>('/generate/config', {
    method: 'POST',
    body: JSON.stringify(req),
  }),
  generateCode: (req: GenerateCodeRequest) => request<GenerateCodeResponse>('/generate/code', {
    method: 'POST',
    body: JSON.stringify(req),
  }),
};

// Export History API
export interface ExportHistory {
  id: string;
  collector: string;
  version: string;
  count: number;
  timestamp: number;
}

export const exportApi = {
  getHistory: () => request<ExportHistory[]>('/export/history'),
  saveHistory: (history: Omit<ExportHistory, 'id'>) => request<ExportHistory>('/export/history', {
    method: 'POST',
    body: JSON.stringify({ ...history, id: crypto.randomUUID() }),
  }),
};

// Versions API (GitHub proxy)
export const versionsApi = {
  getVersions: (collector: CollectorType) => request<{ versions: string[]; isFallback: boolean }>(`/versions/${collector}`),
};
