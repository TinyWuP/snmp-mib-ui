
import { CollectorType } from '../types';

const API_BASE = '/api';

/**
 * 从后端代理获取采集组件的最新版本（避免 GitHub API 限制和 CORS 问题）
 */
export const fetchCollectorVersions = async (type: CollectorType): Promise<{ versions: string[], isFallback: boolean }> => {
  try {
    const response = await fetch(`${API_BASE}/versions/${type}`);
    if (!response.ok) {
      throw new Error('Backend API Error');
    }

    const data = await response.json();
    return {
      versions: data.versions || ['latest'],
      isFallback: data.isFallback || false
    };
  } catch (error) {
    console.warn("后端版本 API 获取失败，使用兜底数据:", error);

    // 兜底数据
    const fallback: Record<CollectorType, string[]> = {
      'snmp-exporter': ['v0.29.0', 'v0.28.0', 'v0.27.0', 'v0.26.0'],
      'telegraf': ['1.32.1', '1.31.0', '1.30.0', '1.29.0'],
      'categraf': ['v0.3.72', 'v0.3.71', 'v0.3.70', 'v0.3.60']
    };
    return {
      versions: fallback[type] || ['latest'],
      isFallback: true
    };
  }
};
