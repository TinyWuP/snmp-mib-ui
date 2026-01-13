import { describe, it, expect, vi, beforeEach } from 'vitest';
import { devicesApi, mibApi, configApi } from './api';

// Mock fetch globally
global.fetch = vi.fn();

describe('API Service', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('devicesApi', () => {
    it('should get all devices', async () => {
      const mockDevices = [
        { id: '1', name: 'Device 1', ip: '192.168.1.1' },
        { id: '2', name: 'Device 2', ip: '192.168.1.2' },
      ];

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockDevices,
      });

      const devices = await devicesApi.getAll();

      expect(devices).toEqual(mockDevices);
      expect(global.fetch).toHaveBeenCalledWith('/api/devices');
    });

    it('should create a device', async () => {
      const newDevice = { name: 'New Device', ip: '192.168.1.3' };
      const createdDevice = { id: '3', ...newDevice };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => createdDevice,
      });

      const result = await devicesApi.create(newDevice);

      expect(result).toEqual(createdDevice);
      expect(global.fetch).toHaveBeenCalledWith('/api/devices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newDevice),
      });
    });

    it('should delete a device', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: 'deleted' }),
      });

      await devicesApi.delete('1');

      expect(global.fetch).toHaveBeenCalledWith('/api/devices/1', {
        method: 'DELETE',
      });
    });

    it('should handle API errors', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Internal Server Error' }),
      });

      await expect(devicesApi.getAll()).rejects.toThrow('Internal Server Error');
    });
  });

  describe('mibApi', () => {
    it('should get all MIB archives', async () => {
      const mockArchives = [
        { id: '1', fileName: 'mib1.zip', fileCount: 10 },
        { id: '2', fileName: 'mib2.zip', fileCount: 15 },
      ];

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockArchives,
      });

      const archives = await mibApi.getArchives();

      expect(archives).toEqual(mockArchives);
      expect(global.fetch).toHaveBeenCalledWith('/api/mib/archives');
    });

    it('should upload a MIB file', async () => {
      const file = new File(['test'], 'test.zip', { type: 'application/zip' });
      const mockArchive = { id: '1', fileName: 'test.zip', fileCount: 5 };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockArchive,
      });

      const result = await mibApi.upload(file);

      expect(result).toEqual(mockArchive);
    });
  });

  describe('configApi', () => {
    it('should get system config', async () => {
      const mockConfig = {
        mibRootPath: '/opt/mibs',
        defaultCommunity: 'public',
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockConfig,
      });

      const config = await configApi.get();

      expect(config).toEqual(mockConfig);
      expect(global.fetch).toHaveBeenCalledWith('/api/config');
    });

    it('should update system config', async () => {
      const newConfig = {
        mibRootPath: '/custom/path',
        defaultCommunity: 'private',
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => newConfig,
      });

      const result = await configApi.update(newConfig);

      expect(result).toEqual(newConfig);
      expect(global.fetch).toHaveBeenCalledWith('/api/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newConfig),
      });
    });
  });
});