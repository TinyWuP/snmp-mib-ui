
import React, { useState, useRef } from 'react';
import { Device, SNMPConfig } from '../types';
import { snmpApi, sshApi } from '../services/api';
import { PlusIcon, TrashIcon, ServerIcon, DownloadIcon, UploadIcon, ChevronRight } from './Icons';

// 简单的 Wifi/信号图标
const SignalIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M5 12.55a11 11 0 0 1 14.08 0M1.42 9a16 16 0 0 1 21.16 0M8.53 16.11a6 6 0 0 1 6.95 0M12 20h.01" />
  </svg>
);

interface DeviceManagerProps {
  devices: Device[];
  onAdd: (device: Device) => void;
  onAddBatch: (devices: Device[]) => void;
  onDelete: (id: string) => void;
}

const DeviceManager: React.FC<DeviceManagerProps> = ({ devices, onAdd, onAddBatch, onDelete }) => {
  const [showAdd, setShowAdd] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, { success: boolean; message: string }>>({});
  const importInputRef = useRef<HTMLInputElement>(null);
  const [newDevice, setNewDevice] = useState<Partial<Device>>({
    name: '', ip: '', port: 161, version: 'v2c', community: 'public',
    securityLevel: 'authPriv', authProtocol: 'SHA', privProtocol: 'AES'
  });

  // SSH related states
  const [showSSHModal, setShowSSHModal] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [sshCreds, setSshCreds] = useState({ username: '', password: '', port: 22 });
  const [snmpStatus, setSnmpStatus] = useState<any>(null);
  const [checkingSNMP, setCheckingSNMP] = useState(false);
  const [showSNMPConfig, setShowSNMPConfig] = useState(false);
  const [snmpConfig, setSnmpConfig] = useState<Partial<SNMPConfig>>({
    version: 'v2c',
    community: 'public',
    location: '',
    contact: '',
    sysName: ''
  });
  const [enablingSNMP, setEnablingSNMP] = useState(false);
  const [deviceBrand, setDeviceBrand] = useState<string>('generic');
  const [detectingBrand, setDetectingBrand] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newDevice.name && newDevice.ip) {
      onAdd({ ...newDevice as Device, id: crypto.randomUUID() });
      setShowAdd(false);
      setNewDevice({ 
        name: '', ip: '', port: 161, version: 'v2c', community: 'public',
        securityLevel: 'authPriv', authProtocol: 'SHA', privProtocol: 'AES'
      });
    }
  };

  const handleExportCSV = () => {
    if (devices.length === 0) return alert('No devices to export.');
    const headers = 'Name,IP,Port,Version,Community,v3User,v3Level,v3AuthProto,v3AuthPass,v3PrivProto,v3PrivPass\n';
    const csvContent = devices.map(d => 
      `${d.name},${d.ip},${d.port},${d.version},${d.community || ''},${d.securityName || ''},${d.securityLevel || ''},${d.authProtocol || ''},${d.authPassword || ''},${d.privProtocol || ''},${d.privPassword || ''}`
    ).join('\n');
    const blob = new Blob([headers + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `SNMP_Asset_Export_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
      const importedDevices: Device[] = [];
      const startIdx = (lines[0].toLowerCase().includes('name') || lines[0].includes('名称')) ? 1 : 0;

      for (let i = startIdx; i < lines.length; i++) {
        const parts = lines[i].split(',').map(p => p.trim());
        if (parts.length >= 2) {
          importedDevices.push({
            id: crypto.randomUUID(),
            name: parts[0] || `Imported-${i}`,
            ip: parts[1],
            port: parseInt(parts[2]) || 161,
            version: (parts[3] as any) || 'v2c',
            community: parts[4] || 'public',
            securityName: parts[5],
            securityLevel: parts[6] as any,
            authProtocol: parts[7] as any,
            authPassword: parts[8],
            privProtocol: parts[9] as any,
            privPassword: parts[10]
          });
        }
      }

      if (importedDevices.length > 0) {
        onAddBatch(importedDevices);
        alert(`Successfully imported ${importedDevices.length} SNMP entities.`);
      }
      if (importInputRef.current) importInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  const handleTestConnection = async (device: Device) => {
    setTestingId(device.id);
    try {
      const result = await snmpApi.test(device);
      setTestResults(prev => ({
        ...prev,
        [device.id]: {
          success: result.success,
          message: result.success ? '连接成功' : (result.error || '连接失败')
        }
      }));
    } catch (error) {
      setTestResults(prev => ({
        ...prev,
        [device.id]: {
          success: false,
          message: (error as Error).message || '测试失败'
        }
      }));
    } finally {
      setTestingId(null);
    }
  };

  const handleOpenSSH = (device: Device) => {
    setSelectedDevice(device);
    setSshCreds({
      username: device.sshUsername || '',
      password: device.sshPassword || '',
      port: device.sshPort || 22
    });
    setSnmpStatus(null);
    setShowSSHModal(true);
  };

  const handleTestSSH = async () => {
    if (!selectedDevice) return;
    try {
      const result = await sshApi.testConnection({
        host: selectedDevice.ip,
        port: sshCreds.port,
        username: sshCreds.username,
        password: sshCreds.password
      });
      if (result.success) {
        alert('SSH连接成功！');
      } else {
        alert('SSH连接失败：' + result.error);
      }
    } catch (error) {
      alert('SSH连接失败：' + (error as Error).message);
    }
  };

  const handleDetectBrand = async () => {
    if (!selectedDevice) return;
    setDetectingBrand(true);
    try {
      const result = await sshApi.detectBrand({
        host: selectedDevice.ip,
        port: sshCreds.port,
        username: sshCreds.username,
        password: sshCreds.password
      });
      if (result.success) {
        setDeviceBrand(result.brand);
        alert('设备品牌检测成功：' + result.brand);
      } else {
        alert('设备品牌检测失败');
      }
    } catch (error) {
      alert('设备品牌检测失败：' + (error as Error).message);
    } finally {
      setDetectingBrand(false);
    }
  };

  const handleCheckSNMPStatus = async () => {
    if (!selectedDevice) return;
    setCheckingSNMP(true);
    try {
      const status = await sshApi.checkSNMPStatus({
        host: selectedDevice.ip,
        port: sshCreds.port,
        username: sshCreds.username,
        password: sshCreds.password
      });
      setSnmpStatus(status);
    } catch (error) {
      alert('检查SNMP状态失败：' + (error as Error).message);
    } finally {
      setCheckingSNMP(false);
    }
  };

  const handleEnableSNMP = async () => {
    if (!selectedDevice) return;
    setEnablingSNMP(true);
    try {
      await sshApi.enableSNMP({
        host: selectedDevice.ip,
        port: sshCreds.port,
        username: sshCreds.username,
        password: sshCreds.password,
        config: {
          ...snmpConfig,
          sysName: snmpConfig.sysName || selectedDevice.ip
        },
        brand: deviceBrand
      });
      alert('SNMP服务已成功启用并配置！');
      setShowSNMPConfig(false);
      handleCheckSNMPStatus();
    } catch (error) {
      alert('启用SNMP失败：' + (error as Error).message);
    } finally {
      setEnablingSNMP(false);
    }
  };

  return (
    <div className="p-12 max-w-7xl mx-auto">
      <div className="flex justify-between items-end mb-12 border-b border-slate-900 pb-10">
        <div>
          <h2 className="text-5xl font-black text-white tracking-tighter mb-4">Device Assets</h2>
          <p className="text-slate-500 font-medium text-lg">统一管理 SNMP 实体池，深度适配 v1/v2c 及 v3 安全上下文。</p>
        </div>
        <div className="flex gap-4">
          <input type="file" ref={importInputRef} accept=".csv" className="hidden" onChange={handleImportCSV} />
          <button 
            onClick={() => importInputRef.current?.click()}
            className="px-6 py-4 rounded-2xl text-slate-400 border border-slate-800 hover:bg-slate-900 hover:text-white flex items-center gap-2 transition-all font-black text-xs uppercase tracking-widest"
          >
            <UploadIcon className="w-4 h-4" /> Import CSV
          </button>
          <button 
            onClick={handleExportCSV}
            className="px-6 py-4 rounded-2xl text-slate-400 border border-slate-800 hover:bg-slate-900 hover:text-white flex items-center gap-2 transition-all font-black text-xs uppercase tracking-widest"
          >
            <DownloadIcon className="w-4 h-4" /> Export
          </button>
          <button 
            onClick={() => setShowAdd(true)}
            className="bg-blue-600 hover:bg-blue-500 text-white px-10 py-4 rounded-2xl font-black flex items-center gap-3 transition-all shadow-2xl shadow-blue-600/30 uppercase tracking-widest text-xs"
          >
            <PlusIcon /> Add Entity
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
        {devices.map((device) => (
          <div key={device.id} className="bg-slate-900/40 border border-slate-800 rounded-[40px] p-10 group hover:border-blue-500/40 hover:bg-slate-900/60 transition-all duration-500 relative overflow-hidden backdrop-blur-sm">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/5 blur-[60px] rounded-full -mr-16 -mt-16 group-hover:bg-blue-600/10 transition-all"></div>
            
            <div className="flex justify-between items-start mb-10 relative z-10">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl flex items-center justify-center text-white shadow-xl shadow-blue-600/20">
                <ServerIcon className="w-8 h-8" />
              </div>
              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                <button
                  onClick={() => handleOpenSSH(device)}
                  className="text-slate-700 hover:text-green-400 p-3 hover:bg-green-400/10 rounded-2xl"
                  title="SSH连接"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M2 12h20M2 12l5-5M2 12l5 5M22 12l-5-5M22 12l-5 5" />
                  </svg>
                </button>
                <button
                  onClick={() => handleTestConnection(device)}
                  disabled={testingId === device.id}
                  className="text-slate-700 hover:text-blue-400 p-3 hover:bg-blue-400/10 rounded-2xl disabled:opacity-50"
                  title="测试连接"
                >
                  {testingId === device.id ? (
                    <div className="w-5 h-5 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin" />
                  ) : (
                    <SignalIcon className="w-5 h-5" />
                  )}
                </button>
                <button
                  onClick={() => onDelete(device.id)}
                  className="text-slate-700 hover:text-red-400 p-3 hover:bg-red-400/10 rounded-2xl"
                >
                  <TrashIcon />
                </button>
              </div>
            </div>

            {testResults[device.id] && (
              <div className={`mb-4 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest ${
                testResults[device.id].success
                  ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                  : 'bg-red-500/10 text-red-500 border border-red-500/20'
              }`}>
                {testResults[device.id].message}
              </div>
            )}

            <h3 className="text-2xl font-black text-white mb-3 truncate tracking-tight">{device.name}</h3>
            <div className="flex items-center gap-3 mb-8">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.4)]"></span>
              <p className="text-blue-500 font-mono text-sm font-bold tracking-tight">
                {device.ip}:{device.port}
              </p>
            </div>

            <div className="flex flex-wrap gap-2 relative z-10">
              <span className="bg-black/60 text-slate-500 text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl border border-slate-800">{device.version}</span>
              {device.version === 'v3' ? (
                <>
                  <span className="bg-blue-600/10 text-blue-500 text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl border border-blue-500/10">User: {device.securityName}</span>
                  <span className="bg-indigo-600/10 text-indigo-400 text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl border border-indigo-500/10">{device.securityLevel}</span>
                </>
              ) : (
                <span className="bg-black/60 text-slate-500 text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl border border-slate-800 truncate max-w-[150px]">Comm: {device.community}</span>
              )}
            </div>
          </div>
        ))}
        {devices.length === 0 && !showAdd && (
          <div className="col-span-full py-40 bg-slate-900/10 border-4 border-dashed border-slate-900 rounded-[60px] flex flex-col items-center justify-center text-slate-800 transition-all hover:bg-slate-900/20">
             <ServerIcon className="w-24 h-24 mb-8 opacity-20" />
             <p className="font-black tracking-[0.4em] uppercase text-sm mb-2">Registry Depleted</p>
             <p className="text-xs font-bold opacity-40">请通过 CSV 导入或手动添加 SNMP 实体资产</p>
          </div>
        )}
      </div>

      {showAdd && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-2xl z-[100] flex items-center justify-center p-8 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-[50px] w-full max-w-3xl my-auto overflow-hidden animate-in zoom-in-95 duration-500 shadow-[0_0_100px_rgba(37,99,235,0.1)]">
            <form onSubmit={handleSubmit} className="p-12">
              <div className="flex justify-between items-center mb-12">
                <div>
                  <h3 className="text-3xl font-black text-white tracking-tighter">Register New Entity</h3>
                  <p className="text-slate-500 text-sm mt-1 font-medium">输入 SNMP 通信上下文及凭据。</p>
                </div>
                <div className="w-16 h-1 bg-blue-600 rounded-full"></div>
              </div>

              <div className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                   <div className="space-y-3">
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Entity Identifier</label>
                    <input
                      required
                      value={newDevice.name}
                      onChange={e => setNewDevice({...newDevice, name: e.target.value})}
                      type="text"
                      placeholder="e.g. CORE-SW-01"
                      className="w-full bg-black/60 border border-slate-800 rounded-2xl px-6 py-5 text-sm text-white focus:border-blue-500 outline-none transition-all placeholder:text-slate-800 font-bold shadow-inner"
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Protocol Version</label>
                    <select
                      value={newDevice.version}
                      onChange={e => setNewDevice({...newDevice, version: e.target.value as any})}
                      className="w-full bg-black/60 border border-slate-800 rounded-2xl px-6 py-5 text-sm text-white focus:border-blue-500 outline-none appearance-none cursor-pointer font-bold shadow-inner"
                    >
                      <option value="v1">Legacy SNMP v1</option>
                      <option value="v2c">Standard SNMP v2c</option>
                      <option value="v3">Secure SNMP v3</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="md:col-span-2 space-y-3">
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Target IP / FQDN</label>
                    <input
                      required
                      value={newDevice.ip}
                      onChange={e => setNewDevice({...newDevice, ip: e.target.value})}
                      type="text"
                      placeholder="192.168.1.1"
                      className="w-full bg-black/60 border border-slate-800 rounded-2xl px-6 py-5 text-sm text-white focus:border-blue-500 outline-none transition-all font-mono font-bold shadow-inner"
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">UDP Port</label>
                    <input
                      required
                      value={newDevice.port}
                      onChange={e => setNewDevice({...newDevice, port: parseInt(e.target.value) || 161})}
                      type="number"
                      className="w-full bg-black/60 border border-slate-800 rounded-2xl px-6 py-5 text-sm text-white focus:border-blue-500 outline-none transition-all font-mono font-bold shadow-inner"
                    />
                  </div>
                </div>

                {newDevice.version !== 'v3' ? (
                  <div className="space-y-3 animate-in fade-in slide-in-from-top-4">
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Read Community String</label>
                    <input
                      value={newDevice.community}
                      onChange={e => setNewDevice({...newDevice, community: e.target.value})}
                      type="text"
                      placeholder="public"
                      className="w-full bg-black/60 border border-slate-800 rounded-2xl px-6 py-5 text-sm text-white focus:border-blue-500 outline-none transition-all font-bold shadow-inner"
                    />
                  </div>
                ) : (
                  <div className="space-y-8 p-8 bg-black/40 rounded-[32px] border border-slate-800 animate-in fade-in slide-in-from-bottom-4 shadow-inner">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-3">
                        <label className="block text-[10px] font-black text-blue-500 uppercase tracking-[0.2em]">Security Name (Username)</label>
                        <input
                          required
                          value={newDevice.securityName}
                          onChange={e => setNewDevice({...newDevice, securityName: e.target.value})}
                          type="text"
                          placeholder="snmp_user"
                          className="w-full bg-slate-900 border border-slate-700 rounded-2xl px-6 py-5 text-sm text-white focus:border-blue-500 outline-none transition-all font-bold"
                        />
                      </div>
                      <div className="space-y-3">
                        <label className="block text-[10px] font-black text-blue-500 uppercase tracking-[0.2em]">Security Level</label>
                        <select
                          value={newDevice.securityLevel}
                          onChange={e => setNewDevice({...newDevice, securityLevel: e.target.value as any})}
                          className="w-full bg-slate-900 border border-slate-700 rounded-2xl px-6 py-5 text-sm text-white focus:border-blue-500 outline-none font-bold"
                        >
                          <option value="noAuthNoPriv">noAuthNoPriv</option>
                          <option value="authNoPriv">authNoPriv</option>
                          <option value="authPriv">authPriv</option>
                        </select>
                      </div>
                    </div>

                    {(newDevice.securityLevel === 'authNoPriv' || newDevice.securityLevel === 'authPriv') && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in slide-in-from-top-2">
                        <div className="space-y-3">
                          <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Auth Protocol</label>
                          <select
                            value={newDevice.authProtocol}
                            onChange={e => setNewDevice({...newDevice, authProtocol: e.target.value as any})}
                            className="w-full bg-slate-900 border border-slate-700 rounded-2xl px-6 py-5 text-sm text-white focus:border-blue-500 outline-none font-bold"
                          >
                            <option value="MD5">MD5</option>
                            <option value="SHA">SHA-1</option>
                            <option value="SHA256">SHA-256</option>
                            <option value="SHA512">SHA-512</option>
                          </select>
                        </div>
                        <div className="space-y-3">
                          <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Auth Password</label>
                          <input
                            required
                            value={newDevice.authPassword}
                            onChange={e => setNewDevice({...newDevice, authPassword: e.target.value})}
                            type="password"
                            className="w-full bg-slate-900 border border-slate-700 rounded-2xl px-6 py-5 text-sm text-white focus:border-blue-500 outline-none font-bold"
                          />
                        </div>
                      </div>
                    )}

                    {newDevice.securityLevel === 'authPriv' && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in slide-in-from-top-2">
                        <div className="space-y-3">
                          <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Priv Protocol (Encryption)</label>
                          <select
                            value={newDevice.privProtocol}
                            onChange={e => setNewDevice({...newDevice, privProtocol: e.target.value as any})}
                            className="w-full bg-slate-900 border border-slate-700 rounded-2xl px-6 py-5 text-sm text-white focus:border-blue-500 outline-none font-bold"
                          >
                            <option value="DES">DES</option>
                            <option value="AES">AES-128</option>
                            <option value="AES192">AES-192</option>
                            <option value="AES256">AES-256</option>
                          </select>
                        </div>
                        <div className="space-y-3">
                          <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Priv Password</label>
                          <input
                            required
                            value={newDevice.privPassword}
                            onChange={e => setNewDevice({...newDevice, privPassword: e.target.value})}
                            type="password"
                            className="w-full bg-slate-900 border border-slate-700 rounded-2xl px-6 py-5 text-sm text-white focus:border-blue-500 outline-none font-bold"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex gap-6 mt-16">
                <button type="button" onClick={() => setShowAdd(false)} className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white font-black py-5 rounded-3xl transition-all uppercase tracking-[0.2em] text-xs">Dismiss</button>
                <button type="submit" className="flex-2 bg-blue-600 hover:bg-blue-500 text-white font-black py-5 rounded-3xl transition-all shadow-2xl shadow-blue-600/40 uppercase tracking-[0.2em] text-xs px-12">Commit Asset</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SSH Modal */}
      {showSSHModal && selectedDevice && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-2xl z-[100] flex items-center justify-center p-8 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-[50px] w-full max-w-4xl my-auto overflow-hidden animate-in zoom-in-95 duration-500 shadow-[0_0_100px_rgba(37,99,235,0.1)]">
            <div className="p-12">
              <div className="flex justify-between items-center mb-12">
                <div>
                  <h3 className="text-3xl font-black text-white tracking-tighter">SSH Connection</h3>
                  <p className="text-slate-500 text-sm mt-1 font-medium">连接到设备 {selectedDevice.name} ({selectedDevice.ip})</p>
                </div>
                <button
                  onClick={() => setShowSSHModal(false)}
                  className="text-slate-500 hover:text-white"
                >
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* SSH Credentials */}
              <div className="space-y-6 mb-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-3">
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">SSH Username</label>
                    <input
                      value={sshCreds.username}
                      onChange={e => setSshCreds({...sshCreds, username: e.target.value})}
                      type="text"
                      placeholder="root"
                      className="w-full bg-black/60 border border-slate-800 rounded-2xl px-6 py-4 text-sm text-white focus:border-blue-500 outline-none transition-all font-bold shadow-inner"
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">SSH Password</label>
                    <input
                      value={sshCreds.password}
                      onChange={e => setSshCreds({...sshCreds, password: e.target.value})}
                      type="password"
                      placeholder="••••••••"
                      className="w-full bg-black/60 border border-slate-800 rounded-2xl px-6 py-4 text-sm text-white focus:border-blue-500 outline-none transition-all font-bold shadow-inner"
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">SSH Port</label>
                    <input
                      value={sshCreds.port}
                      onChange={e => setSshCreds({...sshCreds, port: parseInt(e.target.value) || 22})}
                      type="number"
                      className="w-full bg-black/60 border border-slate-800 rounded-2xl px-6 py-4 text-sm text-white focus:border-blue-500 outline-none transition-all font-bold shadow-inner"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">设备品牌</label>
                  <div className="flex gap-4">
                    <select
                      value={deviceBrand}
                      onChange={e => setDeviceBrand(e.target.value)}
                      className="flex-1 bg-black/60 border border-slate-800 rounded-2xl px-6 py-4 text-sm text-white focus:border-blue-500 outline-none font-bold shadow-inner"
                    >
                      <option value="generic">通用 Linux</option>
                      <option value="huawei">华为 (Huawei)</option>
                      <option value="cisco">思科 (Cisco)</option>
                      <option value="h3c">H3C</option>
                      <option value="juniper">Juniper</option>
                      <option value="arista">Arista</option>
                      <option value="fortinet">Fortinet</option>
                      <option value="mikrotik">MikroTik</option>
                      <option value="dell">戴尔 (Dell)</option>
                      <option value="hp">惠普 (HP)</option>
                    </select>
                    <button
                      onClick={handleDetectBrand}
                      disabled={detectingBrand}
                      className="px-6 bg-blue-600 hover:bg-blue-500 text-white font-black py-4 rounded-2xl transition-all uppercase tracking-[0.2em] text-xs disabled:opacity-50"
                    >
                      {detectingBrand ? '检测中...' : '自动检测'}
                    </button>
                  </div>
                </div>

                <div className="flex gap-4">
                  <button
                    onClick={handleTestSSH}
                    className="flex-1 bg-green-600 hover:bg-green-500 text-white font-black py-4 rounded-2xl transition-all uppercase tracking-[0.2em] text-xs"
                  >
                    测试SSH连接
                  </button>
                  <button
                    onClick={handleCheckSNMPStatus}
                    disabled={checkingSNMP}
                    className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-black py-4 rounded-2xl transition-all uppercase tracking-[0.2em] text-xs disabled:opacity-50"
                  >
                    {checkingSNMP ? '检查中...' : '检查SNMP状态'}
                  </button>
                </div>
              </div>

              {/* SNMP Status Display */}
              {snmpStatus && (
                <div className={`p-6 rounded-2xl mb-8 ${
                  snmpStatus.running
                    ? 'bg-emerald-500/10 border border-emerald-500/20'
                    : 'bg-red-500/10 border border-red-500/20'
                }`}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`w-3 h-3 rounded-full ${snmpStatus.running ? 'bg-emerald-500' : 'bg-red-500'}`} />
                    <span className={`font-black text-sm uppercase tracking-widest ${snmpStatus.running ? 'text-emerald-500' : 'text-red-500'}`}>
                      {snmpStatus.message}
                    </span>
                  </div>
                  {snmpStatus.community && (
                    <div className="text-xs text-slate-400 font-mono mb-2">
                      Community: {snmpStatus.community}
                    </div>
                  )}
                  {snmpStatus.version && (
                    <div className="text-xs text-slate-400 font-mono mb-2">
                      Version: {snmpStatus.version}
                    </div>
                  )}
                  {!snmpStatus.running && (
                    <button
                      onClick={() => setShowSNMPConfig(true)}
                      className="mt-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black px-6 py-3 rounded-xl transition-all uppercase tracking-widest text-xs"
                    >
                      一键启用SNMP
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SNMP Configuration Modal */}
      {showSNMPConfig && selectedDevice && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-2xl z-[110] flex items-center justify-center p-8 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-[50px] w-full max-w-3xl my-auto overflow-hidden animate-in zoom-in-95 duration-500 shadow-[0_0_100px_rgba(37,99,235,0.1)]">
            <div className="p-12">
              <div className="flex justify-between items-center mb-12">
                <div>
                  <h3 className="text-3xl font-black text-white tracking-tighter">启用SNMP服务</h3>
                  <p className="text-slate-500 text-sm mt-1 font-medium">配置设备 {selectedDevice.name} 的SNMP服务</p>
                </div>
                <button
                  onClick={() => setShowSNMPConfig(false)}
                  className="text-slate-500 hover:text-white"
                >
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <label className="block text-[10px] font-black text-blue-500 uppercase tracking-[0.2em]">SNMP Version</label>
                    <select
                      value={snmpConfig.version}
                      onChange={e => setSnmpConfig({...snmpConfig, version: e.target.value as any})}
                      className="w-full bg-black/60 border border-slate-800 rounded-2xl px-6 py-4 text-sm text-white focus:border-blue-500 outline-none font-bold shadow-inner"
                    >
                      <option value="v2c">SNMP v2c</option>
                      <option value="v3">SNMP v3</option>
                    </select>
                  </div>
                  <div className="space-y-3">
                    <label className="block text-[10px] font-black text-blue-500 uppercase tracking-[0.2em]">Community String</label>
                    <input
                      value={snmpConfig.community}
                      onChange={e => setSnmpConfig({...snmpConfig, community: e.target.value})}
                      type="text"
                      placeholder="public"
                      className="w-full bg-black/60 border border-slate-800 rounded-2xl px-6 py-4 text-sm text-white focus:border-blue-500 outline-none font-bold shadow-inner"
                    />
                  </div>
                </div>

                {snmpConfig.version === 'v3' && (
                  <div className="space-y-8 p-8 bg-black/40 rounded-[32px] border border-slate-800">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-3">
                        <label className="block text-[10px] font-black text-blue-500 uppercase tracking-[0.2em]">Security Name</label>
                        <input
                          value={snmpConfig.securityName || ''}
                          onChange={e => setSnmpConfig({...snmpConfig, securityName: e.target.value})}
                          type="text"
                          placeholder="snmp_user"
                          className="w-full bg-slate-900 border border-slate-700 rounded-2xl px-6 py-4 text-sm text-white focus:border-blue-500 outline-none font-bold"
                        />
                      </div>
                      <div className="space-y-3">
                        <label className="block text-[10px] font-black text-blue-500 uppercase tracking-[0.2em]">Auth Protocol</label>
                        <select
                          value={snmpConfig.authProtocol || 'SHA'}
                          onChange={e => setSnmpConfig({...snmpConfig, authProtocol: e.target.value as any})}
                          className="w-full bg-slate-900 border border-slate-700 rounded-2xl px-6 py-4 text-sm text-white focus:border-blue-500 outline-none font-bold"
                        >
                          <option value="MD5">MD5</option>
                          <option value="SHA">SHA</option>
                          <option value="SHA256">SHA-256</option>
                          <option value="SHA512">SHA-512</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">System Name</label>
                    <input
                      value={snmpConfig.sysName || ''}
                      onChange={e => setSnmpConfig({...snmpConfig, sysName: e.target.value})}
                      type="text"
                      placeholder={selectedDevice.ip}
                      className="w-full bg-black/60 border border-slate-800 rounded-2xl px-6 py-4 text-sm text-white focus:border-blue-500 outline-none font-bold shadow-inner"
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Location</label>
                    <input
                      value={snmpConfig.location || ''}
                      onChange={e => setSnmpConfig({...snmpConfig, location: e.target.value})}
                      type="text"
                      placeholder="Unknown"
                      className="w-full bg-black/60 border border-slate-800 rounded-2xl px-6 py-4 text-sm text-white focus:border-blue-500 outline-none font-bold shadow-inner"
                    />
                  </div>
                </div>

                <div className="flex gap-6">
                  <button
                    onClick={() => setShowSNMPConfig(false)}
                    className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white font-black py-4 rounded-2xl transition-all uppercase tracking-[0.2em] text-xs"
                  >
                    取消
                  </button>
                  <button
                    onClick={handleEnableSNMP}
                    disabled={enablingSNMP}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-black py-4 rounded-2xl transition-all shadow-2xl shadow-emerald-600/40 uppercase tracking-[0.2em] text-xs disabled:opacity-50"
                  >
                    {enablingSNMP ? '配置中...' : '启用SNMP'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeviceManager;
