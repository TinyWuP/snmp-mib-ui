
import React, { useState, useMemo } from 'react';
import { Device, MibArchive, MibFile, MibNode, CollectorType } from '../types';
import { fetchCollectorVersions } from '../services/githubService';
import { mibApi, generatorApi } from '../services/api';
import MibTreeView from './MibTreeView';
import {
  ZapIcon, BoxIcon, CheckCircleIcon, CogIcon,
  ChevronRight, ClipboardIcon, SearchIcon,
  FolderIcon, FileIcon, XCircleIcon, TerminalIcon, DatabaseIcon, ServerIcon
} from './Icons';

interface ConfigGeneratorProps {
  devices: Device[];
  basket: MibNode[];
  archives: MibArchive[];
  mibRoot: string;
  onToggleBasket: (node: MibNode) => void;
}

const ConfigGenerator: React.FC<ConfigGeneratorProps> = ({ devices, basket, archives, mibRoot, onToggleBasket }) => {
  const [step, setStep] = useState(1);
  const [collector, setCollector] = useState<CollectorType | null>(null);
  const [versions, setVersions] = useState<string[]>([]);
  const [version, setVersion] = useState('');
  const [selectedArchiveId, setSelectedArchiveId] = useState<string | null>(null);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [configCode, setConfigCode] = useState('');
  const [scraperConfig, setScraperConfig] = useState('');  // Prometheus/VMAgent 配置
  const [prometheusConfig, setPrometheusConfig] = useState('');  // Prometheus 配置
  const [vmagentConfig, setVmagentConfig] = useState('');  // VMAgent 配置
  const [activeConfigTab, setActiveConfigTab] = useState<'exporter' | 'prometheus' | 'vmagent'>('exporter');
  const [archiveFiles, setArchiveFiles] = useState<MibFile[]>([]);
  const [currentParsedFile, setCurrentParsedFile] = useState<MibFile | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [selectedDeviceIds, setSelectedDeviceIds] = useState<string[]>([]);
  const [selectedScraper, setSelectedScraper] = useState<'prometheus' | 'vmagent' | null>(null);

  // SNMP Exporter 8步，其他 6步
  const totalSteps = collector === 'snmp-exporter' ? 8 : 6;

  const next = () => setStep(s => Math.min(s + 1, totalSteps));
  const back = () => setStep(s => Math.max(s - 1, 1));

  const handleSelectCollector = async (type: CollectorType) => {
    setCollector(type);
    setSelectedDeviceIds([]);
    const result = await fetchCollectorVersions(type);
    setVersions(result.versions);
    setVersion(result.versions[0] || 'latest');
    next();
  };

  const handleSelectArchive = async (archiveId: string) => {
    setSelectedArchiveId(archiveId);
    setSelectedFileId(null);
    setCurrentParsedFile(null);
    try {
      const detail = await mibApi.getArchiveDetail(archiveId);
      setArchiveFiles(detail.files || []);
    } catch (error) {
      console.error('Failed to load archive:', error);
      setArchiveFiles([]);
    }
    next();
  };

  const handleSelectFile = async (file: MibFile) => {
    setSelectedFileId(file.id);
    if (file.nodes && file.nodes.length > 0) {
      setCurrentParsedFile(file);
      return;
    }
    setIsParsing(true);
    try {
      const parsed = await mibApi.parseFile(file.path);
      const updatedFile = { ...file, nodes: parsed.nodes, isParsed: true };
      setCurrentParsedFile(updatedFile);
      setArchiveFiles(prev => prev.map(f => f.id === file.id ? updatedFile : f));
    } catch (error) {
      console.error('Failed to parse file:', error);
      setCurrentParsedFile(null);
    } finally {
      setIsParsing(false);
    }
  };

  const toggleDeviceSelection = (deviceId: string) => {
    setSelectedDeviceIds(prev =>
      prev.includes(deviceId)
        ? prev.filter(id => id !== deviceId)
        : [...prev, deviceId]
    );
  };

  const selectAllDevices = () => {
    if (selectedDeviceIds.length === devices.length) {
      setSelectedDeviceIds([]);
    } else {
      setSelectedDeviceIds(devices.map(d => d.id));
    }
  };

  // SNMP Exporter: 生成 snmp.yml (不需要设备)
  const handleGenerateSnmpYml = async () => {
    if (!collector) return;

    try {
      const response = await generatorApi.generateConfig({
        collector,
        version,
        nodes: basket,
        community: 'public',
        mibRoot,
        // @ts-ignore - devices field
        devices: []
      });
      setConfigCode(response.config);
    } catch {
      // 本地生成 snmp.yml
      const code = generateLocalConfig(collector, version, basket, []);
      setConfigCode(code);
    }
    next();
  };

  // SNMP Exporter: 生成采集器配置 (需要设备)
  const handleGenerateScraperConfig = () => {
    const selectedDevices = devices.filter(d => selectedDeviceIds.includes(d.id));
    const { prometheus, vmagent } = generateScraperConfigs(selectedDevices);
    setPrometheusConfig(prometheus);
    setVmagentConfig(vmagent);
    next();
  };

  // Telegraf/Categraf: 生成配置 (需要设备)
  const handleGenerate = async () => {
    if (!collector) return;

    const selectedDevices = devices.filter(d => selectedDeviceIds.includes(d.id));

    try {
      const response = await generatorApi.generateConfig({
        collector,
        version,
        nodes: basket,
        community: selectedDevices[0]?.community || 'public',
        mibRoot,
        // @ts-ignore - 新增字段
        devices: selectedDevices.map(d => ({
          name: d.name,
          ip: d.ip,
          port: d.port,
          community: d.community,
          version: d.version
        }))
      });
      setConfigCode(response.config);
    } catch {
      const code = generateLocalConfig(collector, version, basket, selectedDevices);
      setConfigCode(code);
    }
    next();
  };

  // 生成 Prometheus 和 VMAgent 采集配置（分开）
  const generateScraperConfigs = (selectedDevices: Device[]): { prometheus: string; vmagent: string } => {
    const timestamp = new Date().toLocaleString();

    // Prometheus 配置
    let prometheus = `# Prometheus SNMP 采集配置\n`;
    prometheus += `# Generated by SNMP MIB Explorer\n`;
    prometheus += `# Date: ${timestamp}\n`;
    prometheus += `# Devices: ${selectedDevices.length}\n`;
    prometheus += `# 将以下内容添加到 prometheus.yml 的 scrape_configs 部分\n\n`;
    prometheus += `  - job_name: 'snmp'\n`;
    prometheus += `    scrape_interval: 60s\n`;
    prometheus += `    scrape_timeout: 30s\n`;
    prometheus += `    static_configs:\n`;
    prometheus += `      - targets:\n`;
    selectedDevices.forEach(d => {
      prometheus += `          - ${d.ip}  # ${d.name}\n`;
    });
    prometheus += `    metrics_path: /snmp\n`;
    prometheus += `    params:\n`;
    prometheus += `      module: [default]\n`;
    prometheus += `    relabel_configs:\n`;
    prometheus += `      - source_labels: [__address__]\n`;
    prometheus += `        target_label: __param_target\n`;
    prometheus += `      - source_labels: [__param_target]\n`;
    prometheus += `        target_label: instance\n`;
    prometheus += `      - target_label: __address__\n`;
    prometheus += `        replacement: 127.0.0.1:9116  # SNMP Exporter 地址，请根据实际情况修改\n`;

    // VMAgent 配置
    let vmagent = `# VMAgent SNMP 采集配置\n`;
    vmagent += `# Generated by SNMP MIB Explorer\n`;
    vmagent += `# Date: ${timestamp}\n`;
    vmagent += `# Devices: ${selectedDevices.length}\n`;
    vmagent += `# 将以下内容添加到 vmagent 的 scrape_configs 部分\n\n`;
    vmagent += `  - job_name: 'snmp'\n`;
    vmagent += `    scrape_interval: 60s\n`;
    vmagent += `    scrape_timeout: 30s\n`;
    vmagent += `    static_configs:\n`;
    vmagent += `      - targets:\n`;
    selectedDevices.forEach(d => {
      vmagent += `          - ${d.ip}  # ${d.name}\n`;
    });
    vmagent += `    metrics_path: /snmp\n`;
    vmagent += `    params:\n`;
    vmagent += `      module: [default]\n`;
    vmagent += `    relabel_configs:\n`;
    vmagent += `      - source_labels: [__address__]\n`;
    vmagent += `        target_label: __param_target\n`;
    vmagent += `      - source_labels: [__param_target]\n`;
    vmagent += `        target_label: instance\n`;
    vmagent += `      - target_label: __address__\n`;
    vmagent += `        replacement: snmp-exporter:9116  # SNMP Exporter 服务地址，K8s/Docker 环境使用服务名\n`;

    return { prometheus, vmagent };
  };

  // 本地配置生成（带设备信息）
  const generateLocalConfig = (
    collector: CollectorType,
    version: string,
    nodes: MibNode[],
    selectedDevices: Device[]
  ): string => {
    const timestamp = new Date().toLocaleString();

    if (collector === 'snmp-exporter') {
      let output = `# SNMP Exporter Configuration\n`;
      output += `# Generated by SNMP MIB Explorer\n`;
      output += `# Version: ${version}\n`;
      output += `# Date: ${timestamp}\n`;
      output += `# Metrics: ${nodes.length}\n\n`;
      output += `modules:\n  default:\n    walk:\n`;
      nodes.forEach(node => {
        output += `      - ${node.oid}  # ${node.name}\n`;
      });
      output += `\n    metrics:\n`;
      nodes.forEach(node => {
        const safeName = node.name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
        output += `      - name: ${safeName}\n        oid: ${node.oid}\n        type: gauge\n`;
      });
      output += `\n    auth:\n      community: public\n`;
      output += `\n# 注意: SNMP Exporter 的目标设备在 Prometheus scrape_configs 中配置\n`;
      output += `# 示例:\n`;
      output += `# scrape_configs:\n`;
      output += `#   - job_name: 'snmp'\n`;
      output += `#     static_configs:\n`;
      output += `#       - targets: ['192.168.1.1']  # 目标设备IP\n`;
      output += `#     metrics_path: /snmp\n`;
      output += `#     params:\n`;
      output += `#       module: [default]\n`;
      return output;
    }

    if (collector === 'telegraf') {
      let output = `# Telegraf SNMP Input Configuration\n`;
      output += `# Generated by SNMP MIB Explorer\n`;
      output += `# Version: ${version}\n`;
      output += `# Date: ${timestamp}\n`;
      output += `# Devices: ${selectedDevices.length}\n`;
      output += `# Metrics: ${nodes.length}\n\n`;

      output += `[[inputs.snmp]]\n`;
      output += `  ## 目标设备列表\n`;
      const agents = selectedDevices.map(d => `"udp://${d.ip}:${d.port || 161}"`);
      output += `  agents = [${agents.join(', ')}]\n\n`;
      output += `  ## 超时设置\n`;
      output += `  timeout = "10s"\n\n`;
      output += `  ## SNMP 版本 (1, 2, 3)\n`;
      output += `  version = 2\n\n`;
      output += `  ## Community 字符串\n`;
      output += `  community = "${selectedDevices[0]?.community || 'public'}"\n\n`;
      output += `  ## 指标名称前缀\n`;
      output += `  name = "snmp"\n\n`;
      output += `  ## 采集的 OID 字段\n`;

      nodes.forEach(node => {
        const safeName = node.name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
        output += `\n  [[inputs.snmp.field]]\n`;
        output += `    name = "${safeName}"\n`;
        output += `    oid = "${node.oid}"\n`;
      });
      return output;
    }

    if (collector === 'categraf') {
      let output = `# Categraf SNMP Plugin Configuration\n`;
      output += `# Generated by SNMP MIB Explorer\n`;
      output += `# Version: ${version}\n`;
      output += `# Date: ${timestamp}\n`;
      output += `# Devices: ${selectedDevices.length}\n`;
      output += `# Metrics: ${nodes.length}\n\n`;

      output += `[[instances]]\n`;
      output += `  ## 采集间隔\n`;
      output += `  interval = "60s"\n\n`;
      output += `  ## 目标设备列表\n`;
      const agents = selectedDevices.map(d => `"${d.ip}:${d.port || 161}"`);
      output += `  agents = [${agents.join(', ')}]\n\n`;
      output += `  ## 超时设置\n`;
      output += `  timeout = "10s"\n\n`;
      output += `  ## SNMP 版本\n`;
      output += `  version = 2\n\n`;
      output += `  ## Community 字符串\n`;
      output += `  community = "${selectedDevices[0]?.community || 'public'}"\n\n`;
      output += `  ## 附加标签\n`;
      output += `  labels = { job = "snmp" }\n\n`;
      output += `  ## 采集的 OID 字段\n`;

      nodes.forEach(node => {
        const safeName = node.name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
        output += `\n  [[instances.field]]\n`;
        output += `    name = "${safeName}"\n`;
        output += `    oid = "${node.oid}"\n`;
      });
      return output;
    }

    return `# Unknown collector: ${collector}`;
  };

  // 动态步骤配置
  const steps = collector === 'snmp-exporter' ? [
    { n: 1, label: '选引擎' },
    { n: 2, label: '设版本' },
    { n: 3, label: '选品牌包' },
    { n: 4, label: '细选指标' },
    { n: 5, label: 'snmp.yml' },
    { n: 6, label: '选采集器' },
    { n: 7, label: '选设备' },
    { n: 8, label: '采集配置' }
  ] : [
    { n: 1, label: '选引擎' },
    { n: 2, label: '设版本' },
    { n: 3, label: '选品牌包' },
    { n: 4, label: '细选指标' },
    { n: 5, label: '选设备' },
    { n: 6, label: '生成' }
  ];

  // 判断当前步骤类型
  const isDeviceStep = collector === 'snmp-exporter' ? step === 7 : step === 5;
  const isSnmpYmlStep = collector === 'snmp-exporter' && step === 5;
  const isScraperSelectStep = collector === 'snmp-exporter' && step === 6;
  const isScraperConfigStep = collector === 'snmp-exporter' && step === 8;

  return (
    <div className="flex-1 flex flex-col bg-slate-950 overflow-hidden">
      {/* 步骤条 - 移动端可滚动 */}
      <div className="px-4 md:px-16 py-4 md:py-10 border-b border-slate-900 bg-black/20 flex justify-between items-center z-10 overflow-x-auto">
         <div className="flex items-center gap-3 md:gap-6 min-w-max">
            {steps.map(s => (
              <div key={s.n} className="flex items-center gap-1 md:gap-3">
                 <div className={`w-6 h-6 md:w-8 md:h-8 rounded-lg md:rounded-xl flex items-center justify-center text-[8px] md:text-[10px] font-black transition-all ${step === s.n ? 'bg-blue-600 text-white shadow-lg' : step > s.n ? 'bg-emerald-500/20 text-emerald-500' : 'bg-slate-900 text-slate-700'}`}>
                    {step > s.n ? '✓' : s.n}
                 </div>
                 <span className={`text-[8px] md:text-[10px] font-black uppercase tracking-widest hidden sm:inline ${step >= s.n ? 'text-white' : 'text-slate-700'}`}>{s.label}</span>
                 {s.n < totalSteps && <ChevronRight className="w-2 h-2 md:w-3 md:h-3 text-slate-800" />}
              </div>
            ))}
         </div>
         {step > 1 && step < 5 && (
           <button onClick={back} className="text-[8px] md:text-[10px] font-black text-slate-500 hover:text-white transition-colors uppercase border border-slate-800 px-2 md:px-4 py-1 md:py-2 rounded-lg md:rounded-xl ml-2 flex-shrink-0">返回</button>
         )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-16">
        {step === 1 && (
          <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-8 animate-in fade-in slide-in-from-bottom-4">
             {([
               { id: 'snmp-exporter', icon: ZapIcon, label: 'SNMP Exporter', desc: 'Prometheus 标准采集', color: 'text-blue-500' },
               { id: 'telegraf', icon: BoxIcon, label: 'Telegraf', desc: 'TICK Stack 数据采集', color: 'text-indigo-500' },
               { id: 'categraf', icon: CogIcon, label: 'Categraf', desc: '快猫星云高性能采集', color: 'text-amber-500' }
             ] as const).map(item => (
               <div key={item.id} onClick={() => handleSelectCollector(item.id)} className="p-6 md:p-10 bg-slate-900/30 border border-slate-800 rounded-2xl md:rounded-[48px] hover:border-blue-500/30 transition-all cursor-pointer group shadow-2xl">
                  <div className="w-12 h-12 md:w-16 md:h-16 bg-slate-800 rounded-xl md:rounded-2xl flex items-center justify-center mb-4 md:mb-8 group-hover:bg-blue-600 transition-colors">
                     <item.icon className={`w-6 h-6 md:w-8 md:h-8 ${item.color} group-hover:text-white`} />
                  </div>
                  <h3 className="text-lg md:text-2xl font-black text-white mb-2 md:mb-4">{item.label}</h3>
                  <p className="text-xs md:text-sm text-slate-500">{item.desc}</p>
               </div>
             ))}
          </div>
        )}

        {step === 2 && (
          <div className="max-w-xl mx-auto py-10 md:py-20 animate-in fade-in zoom-in-95">
             <div className="bg-slate-900/40 border border-slate-800 p-6 md:p-12 rounded-2xl md:rounded-[48px] space-y-6 md:space-y-10 shadow-2xl">
                <div className="space-y-4">
                    <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">探测到最新 Release 版本</label>
                    <select value={version} onChange={e => setVersion(e.target.value)} className="w-full bg-black/60 border border-slate-800 rounded-xl md:rounded-2xl px-4 md:px-8 py-4 md:py-6 text-sm text-white focus:border-blue-500 outline-none cursor-pointer font-mono">
                      {versions.map(v => <option key={v} value={v}>{v}</option>)}
                    </select>
                </div>
                <button onClick={next} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-4 md:py-6 rounded-2xl md:rounded-3xl text-[10px] uppercase tracking-widest shadow-2xl shadow-blue-600/30">确认版本</button>
             </div>
          </div>
        )}

        {step === 3 && (
          <div className="max-w-6xl mx-auto animate-in fade-in slide-in-from-right-8">
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8">
                {archives.map(arc => (
                  <div
                    key={arc.id}
                    onClick={() => handleSelectArchive(arc.id)}
                    className="p-6 md:p-10 bg-slate-900/40 border border-slate-800 rounded-2xl md:rounded-[48px] hover:border-blue-500/30 cursor-pointer transition-all group shadow-2xl"
                  >
                     <div className="w-10 h-10 md:w-14 md:h-14 bg-blue-600/10 rounded-xl md:rounded-2xl flex items-center justify-center mb-4 md:mb-8 group-hover:bg-blue-600 transition-all">
                        <FolderIcon className="w-5 h-5 md:w-7 md:h-7 text-blue-500 group-hover:text-white" />
                     </div>
                     <h3 className="text-lg md:text-2xl font-black text-white truncate">{arc.fileName}</h3>
                     <p className="text-[10px] text-slate-600 font-mono mt-2 md:mt-3 truncate">{arc.extractedPath}</p>
                     <div className="mt-4 md:mt-8 pt-4 md:pt-8 border-t border-slate-800 flex justify-between items-center">
                        <span className="text-[10px] font-black text-slate-500 uppercase">{arc.fileCount || 0} MIB 文件</span>
                        <ChevronRight className="w-4 h-4 text-slate-800 group-hover:text-blue-500" />
                     </div>
                  </div>
                ))}
                {archives.length === 0 && (
                  <div className="col-span-full py-48 border-4 border-dashed border-slate-900 rounded-[60px] text-center">
                    <DatabaseIcon className="w-20 h-20 mx-auto mb-6 opacity-20" />
                    <p className="text-[10px] font-black text-slate-800 uppercase tracking-widest">服务器暂无品牌包</p>
                  </div>
                )}
             </div>
          </div>
        )}

        {step === 4 && (
          <div className="h-full grid grid-cols-12 gap-8 animate-in fade-in">
             <div className="col-span-3 bg-black/20 border border-slate-900 rounded-[40px] overflow-hidden flex flex-col shadow-inner">
                <div className="p-6 border-b border-slate-900 bg-white/[0.02]"><span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">包内文件探测</span></div>
                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                   {archiveFiles.map(f => (
                     <div
                      key={f.id}
                      onClick={() => handleSelectFile(f)}
                      className={`p-4 rounded-3xl cursor-pointer transition-all flex items-center gap-3 border ${selectedFileId === f.id ? 'bg-blue-600/10 border-blue-500/30' : 'bg-transparent border-transparent hover:bg-white/5'}`}
                     >
                       <FileIcon className={`w-4 h-4 ${selectedFileId === f.id ? 'text-blue-500' : 'text-slate-700'}`} />
                       <span className={`text-[11px] font-bold truncate ${selectedFileId === f.id ? 'text-blue-400' : 'text-slate-500'}`}>{f.name}</span>
                       {f.isParsed && <span className="text-emerald-500 text-[10px]">✓</span>}
                     </div>
                   ))}
                </div>
             </div>

             <div className="col-span-5 bg-black/40 border border-slate-900 rounded-[48px] overflow-hidden flex flex-col shadow-2xl">
                {isParsing ? (
                  <div className="flex-1 flex flex-col items-center justify-center">
                    <div className="w-8 h-8 border-2 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mb-4"></div>
                    <p className="text-[10px] font-bold text-slate-500">正在解析 MIB 文件...</p>
                  </div>
                ) : currentParsedFile && currentParsedFile.nodes ? (
                   <MibTreeView
                    nodes={currentParsedFile.nodes}
                    onSelect={() => {}}
                    onToggleBasket={onToggleBasket}
                    basketOids={basket.map(b => b.oid)}
                   />
                ) : <div className="flex-1 flex flex-col items-center justify-center opacity-10 p-20 text-center">
                    <TerminalIcon className="w-16 h-16 mb-6" />
                    <p className="text-[10px] font-black uppercase tracking-widest">从左侧点击 MIB 文件探测 OID 树</p>
                </div>}
             </div>

             <div className="col-span-4 bg-slate-900/10 border border-slate-900 rounded-[48px] p-8 flex flex-col overflow-hidden shadow-inner">
                <div className="flex justify-between items-center mb-8">
                   <h3 className="text-[10px] font-black text-slate-600 uppercase tracking-widest">待配置指标 ({basket.length})</h3>
                </div>
                <div className="flex-1 overflow-y-auto space-y-4">
                   {basket.map(n => (
                     <div key={n.oid} className="p-5 bg-black/40 border border-slate-800 rounded-[32px] flex justify-between items-center group">
                        <div className="truncate pr-4">
                           <p className="text-[11px] font-black text-white truncate mb-1">{n.name}</p>
                           <code className="text-[9px] text-slate-600 font-mono truncate block">{n.oid}</code>
                        </div>
                        <button onClick={() => onToggleBasket(n)} className="text-slate-800 hover:text-red-500 transition-colors"><XCircleIcon className="w-5 h-5" /></button>
                     </div>
                   ))}
                </div>
                <button
                  disabled={basket.length === 0}
                  onClick={collector === 'snmp-exporter' ? handleGenerateSnmpYml : next}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-6 rounded-3xl text-[10px] uppercase tracking-widest shadow-2xl shadow-emerald-600/30 disabled:opacity-20 mt-8"
                >
                  {collector === 'snmp-exporter' ? '确认指标并生成 snmp.yml' : '确认指标并选择目标设备'}
                </button>
             </div>
          </div>
        )}

        {/* 设备选择步骤 (所有采集器都需要) */}
        {isDeviceStep && (
          <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-right-8">
            <div className="mb-8">
              <h2 className="text-3xl font-black text-white mb-4">选择目标设备</h2>
              <p className="text-slate-500 text-sm">
                {collector === 'snmp-exporter'
                  ? '选择目标设备，将自动生成 Prometheus/VMAgent 的采集配置'
                  : '选择要采集的网络设备，配置将自动填入设备的 IP、端口和 Community'}
              </p>
            </div>

            <div className="bg-slate-900/40 border border-slate-800 rounded-[48px] p-8 shadow-2xl">
              <div className="flex justify-between items-center mb-6">
                <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">
                  已选择 {selectedDeviceIds.length} / {devices.length} 台设备
                </span>
                <button
                  onClick={selectAllDevices}
                  className="text-[10px] font-black text-blue-500 hover:text-blue-400 uppercase"
                >
                  {selectedDeviceIds.length === devices.length ? '取消全选' : '全选'}
                </button>
              </div>

              {devices.length === 0 ? (
                <div className="py-20 text-center">
                  <ServerIcon className="w-16 h-16 mx-auto mb-6 opacity-20" />
                  <p className="text-slate-600 text-sm mb-4">暂无设备，请先在资产管理中添加设备</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {devices.map(device => (
                    <div
                      key={device.id}
                      onClick={() => toggleDeviceSelection(device.id)}
                      className={`p-5 rounded-2xl cursor-pointer transition-all flex items-center gap-4 border ${
                        selectedDeviceIds.includes(device.id)
                          ? 'bg-blue-600/10 border-blue-500/30'
                          : 'bg-black/20 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center ${
                        selectedDeviceIds.includes(device.id)
                          ? 'bg-blue-600 border-blue-500'
                          : 'border-slate-700'
                      }`}>
                        {selectedDeviceIds.includes(device.id) && (
                          <CheckCircleIcon className="w-3 h-3 text-white" />
                        )}
                      </div>
                      <ServerIcon className={`w-5 h-5 ${selectedDeviceIds.includes(device.id) ? 'text-blue-500' : 'text-slate-600'}`} />
                      <div className="flex-1">
                        <p className="text-sm font-bold text-white">{device.name}</p>
                        <p className="text-[10px] text-slate-500 font-mono">
                          {device.ip}:{device.port || 161} | {device.version || 'v2c'} | {device.community || 'public'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <button
                disabled={selectedDeviceIds.length === 0}
                onClick={collector === 'snmp-exporter' ? handleGenerateScraperConfig : handleGenerate}
                className="w-full mt-8 bg-emerald-600 hover:bg-emerald-500 text-white font-black py-6 rounded-3xl text-[10px] uppercase tracking-widest shadow-2xl shadow-emerald-600/30 disabled:opacity-20"
              >
                {collector === 'snmp-exporter' ? '确认设备并生成采集配置' : '确认设备并生成配置'}
              </button>
            </div>
          </div>
        )}

        {/* Step 6: SNMP Exporter 的 snmp.yml 结果 */}
        {isSnmpYmlStep && (
          <div className="h-full flex flex-col animate-in zoom-in-95 duration-700">
             <div className="flex justify-between items-end mb-6">
                <div>
                   <h2 className="text-5xl font-black text-white tracking-tighter">snmp.yml 配置</h2>
                   <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mt-4">
                     SNMP Exporter 主配置文件 | {basket.length} 指标
                   </p>
                </div>
                <div className="flex gap-4">
                   <button onClick={back} className="px-8 py-5 border border-slate-800 text-slate-400 rounded-3xl text-[10px] font-black uppercase tracking-widest hover:border-slate-600 transition-all">
                      返回修改
                   </button>
                   <button
                     onClick={() => {
                       navigator.clipboard.writeText(configCode);
                       alert('已复制 snmp.yml 到剪贴板！');
                     }}
                     className="px-8 py-5 bg-white text-black rounded-3xl text-[10px] font-black uppercase tracking-widest flex items-center gap-3 shadow-xl hover:scale-105 transition-all"
                   >
                     <ClipboardIcon className="w-4 h-4" /> 复制
                   </button>
                   <button onClick={next} className="px-8 py-5 bg-blue-600 text-white rounded-3xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:bg-blue-500 transition-all">
                      下一步：选择采集器
                   </button>
                </div>
             </div>
             <div className="flex-1 bg-black/60 border border-slate-800 rounded-[60px] overflow-hidden flex relative shadow-inner">
                <div className="w-20 bg-white/[0.01] border-r border-slate-900 py-12 flex flex-col items-center text-[10px] font-mono text-slate-800">
                   {configCode.split('\n').map((_, i) => <div key={i} className="leading-8 h-8">{i+1}</div>)}
                </div>
                <pre className="p-12 font-mono text-[13px] text-blue-400 leading-8 overflow-auto flex-1 custom-scrollbar">
                   <code>{configCode}</code>
                </pre>
             </div>
          </div>
        )}

        {/* Step 7: SNMP Exporter 选择采集器 */}
        {isScraperSelectStep && (
          <div className="max-w-4xl mx-auto py-10 animate-in fade-in slide-in-from-right-8">
            <div className="mb-8 text-center">
              <h2 className="text-4xl font-black text-white mb-4">选择采集器类型</h2>
              <p className="text-slate-500 text-sm">
                选择你的监控系统，生成对应的采集配置
              </p>
            </div>

            <div className="grid grid-cols-2 gap-8">
              <div
                onClick={() => { setSelectedScraper('prometheus'); next(); }}
                className="p-10 bg-slate-900/40 border border-slate-800 rounded-[48px] hover:border-orange-500/30 cursor-pointer transition-all group shadow-2xl"
              >
                <div className="w-16 h-16 bg-orange-600/10 rounded-2xl flex items-center justify-center mb-8 group-hover:bg-orange-600 transition-all">
                  <DatabaseIcon className="w-8 h-8 text-orange-500 group-hover:text-white" />
                </div>
                <h3 className="text-2xl font-black text-white mb-4">Prometheus</h3>
                <p className="text-sm text-slate-500">生成 prometheus.yml 的 scrape_configs 配置</p>
                <p className="text-[10px] text-slate-600 mt-4 font-mono">replacement: 127.0.0.1:9116</p>
              </div>

              <div
                onClick={() => { setSelectedScraper('vmagent'); next(); }}
                className="p-10 bg-slate-900/40 border border-slate-800 rounded-[48px] hover:border-purple-500/30 cursor-pointer transition-all group shadow-2xl"
              >
                <div className="w-16 h-16 bg-purple-600/10 rounded-2xl flex items-center justify-center mb-8 group-hover:bg-purple-600 transition-all">
                  <ServerIcon className="w-8 h-8 text-purple-500 group-hover:text-white" />
                </div>
                <h3 className="text-2xl font-black text-white mb-4">VMAgent</h3>
                <p className="text-sm text-slate-500">生成 vmagent 的 scrape_configs 配置</p>
                <p className="text-[10px] text-slate-600 mt-4 font-mono">replacement: snmp-exporter:9116</p>
              </div>
            </div>

            <button onClick={back} className="mt-8 text-[10px] font-black text-slate-500 hover:text-white transition-colors uppercase">
              ← 返回上一步
            </button>
          </div>
        )}

        {/* Step 8: SNMP Exporter 采集配置结果 */}
        {isScraperConfigStep && (
          <div className="h-full flex flex-col animate-in zoom-in-95 duration-700">
             <div className="flex justify-between items-end mb-6">
                <div>
                   <h2 className="text-5xl font-black text-white tracking-tighter">
                     {selectedScraper === 'prometheus' ? 'prometheus.yml' : 'vmagent.yml'} 配置
                   </h2>
                   <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mt-4">
                     {selectedScraper === 'prometheus' ? 'Prometheus' : 'VMAgent'} 采集配置 | {selectedDeviceIds.length} 台设备
                   </p>
                </div>
                <div className="flex gap-4">
                   <button onClick={back} className="px-8 py-5 border border-slate-800 text-slate-400 rounded-3xl text-[10px] font-black uppercase tracking-widest hover:border-slate-600 transition-all">
                      返回选择
                   </button>
                   <button
                     onClick={() => {
                       const code = selectedScraper === 'prometheus' ? prometheusConfig : vmagentConfig;
                       navigator.clipboard.writeText(code);
                       alert(`已复制 ${selectedScraper === 'prometheus' ? 'prometheus.yml' : 'vmagent.yml'} 到剪贴板！`);
                     }}
                     className="px-12 py-5 bg-white text-black rounded-3xl text-[10px] font-black uppercase tracking-widest flex items-center gap-4 shadow-2xl hover:scale-105 transition-all"
                   >
                     <ClipboardIcon className="w-5 h-5" /> 复制配置
                   </button>
                </div>
             </div>
             <div className="flex-1 bg-black/60 border border-slate-800 rounded-[60px] overflow-hidden flex relative shadow-inner">
                <div className="w-20 bg-white/[0.01] border-r border-slate-900 py-12 flex flex-col items-center text-[10px] font-mono text-slate-800">
                   {(selectedScraper === 'prometheus' ? prometheusConfig : vmagentConfig).split('\n').map((_, i) => <div key={i} className="leading-8 h-8">{i+1}</div>)}
                </div>
                <pre className="p-12 font-mono text-[13px] text-blue-400 leading-8 overflow-auto flex-1 custom-scrollbar">
                   <code>{selectedScraper === 'prometheus' ? prometheusConfig : vmagentConfig}</code>
                </pre>
             </div>
          </div>
        )}

        {/* Telegraf / Categraf 最终结果 */}
        {collector !== 'snmp-exporter' && step === 6 && (
          <div className="h-full flex flex-col animate-in zoom-in-95 duration-700">
             <div className="flex justify-between items-end mb-6">
                <div>
                   <h2 className="text-5xl font-black text-white tracking-tighter">生成结果</h2>
                   <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mt-4">
                     {collector} | {version} | {basket.length} 指标 | {selectedDeviceIds.length} 设备
                   </p>
                </div>
                <div className="flex gap-4">
                   <button onClick={back} className="px-8 py-5 border border-slate-800 text-slate-400 rounded-3xl text-[10px] font-black uppercase tracking-widest hover:border-slate-600 transition-all">
                      返回修改
                   </button>
                   <button
                     onClick={() => {
                       navigator.clipboard.writeText(configCode);
                       alert('已复制配置到剪贴板！');
                     }}
                     className="px-12 py-5 bg-white text-black rounded-3xl text-[10px] font-black uppercase tracking-widest flex items-center gap-4 shadow-2xl hover:scale-105 transition-all"
                   >
                     <ClipboardIcon className="w-5 h-5" /> 复制配置
                   </button>
                </div>
             </div>
             <div className="flex-1 bg-black/60 border border-slate-800 rounded-[60px] overflow-hidden flex relative shadow-inner">
                <div className="w-20 bg-white/[0.01] border-r border-slate-900 py-12 flex flex-col items-center text-[10px] font-mono text-slate-800">
                   {configCode.split('\n').map((_, i) => <div key={i} className="leading-8 h-8">{i+1}</div>)}
                </div>
                <pre className="p-12 font-mono text-[13px] text-blue-400 leading-8 overflow-auto flex-1 custom-scrollbar">
                   <code>{configCode}</code>
                </pre>
             </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ConfigGenerator;
