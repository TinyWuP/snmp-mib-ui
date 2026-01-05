
import React, { useState, useEffect, useRef } from 'react';
import { MibNode, MibArchive, MibFile, Device, ViewState, SystemConfig } from './types';
import MibTreeView from './components/MibTreeView';
import OidDetails from './components/OidDetails';
import DeviceManager from './components/DeviceManager';
import ConfigGenerator from './components/ConfigGenerator';
import { devicesApi, mibApi, configApi, presetsApi, QuickOID, ServerZipFile, ScanResult } from './services/api';
import {
  DatabaseIcon, ServerIcon, ZapIcon, BoxIcon, FolderIcon,
  CogIcon, TrashIcon, UploadIcon, PlusIcon,
  HomeIcon, ChevronRight, SearchIcon, TerminalIcon, FileIcon, XCircleIcon
} from './components/Icons';

const App: React.FC = () => {
  const [activeView, setActiveView] = useState<ViewState>('dashboard');
  const [archives, setArchives] = useState<MibArchive[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [config, setConfig] = useState<SystemConfig>({
    mibRootPath: '/opt/mibs',
    defaultCommunity: 'public',
    enableAi: false
  });

  const [selectedArchiveId, setSelectedArchiveId] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<MibFile | null>(null);
  const [selectedNode, setSelectedNode] = useState<MibNode | null>(null);
  const [basket, setBasket] = useState<MibNode[]>([]);
  const [quickOids, setQuickOids] = useState<QuickOID[]>([]);
  const [isExtracting, setIsExtracting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [serverZipFiles, setServerZipFiles] = useState<ServerZipFile[]>([]);
  const [scanError, setScanError] = useState<string | null>(null);
  const [loadedArchiveFiles, setLoadedArchiveFiles] = useState<MibFile[]>([]);
  const [isParsing, setIsParsing] = useState(false);

  // 搜索相关状态
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<MibNode[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);

  const archiveInputRef = useRef<HTMLInputElement>(null);

  // Load data from backend on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const [devicesData, archivesData, configData, quickOidsData] = await Promise.all([
          devicesApi.getAll().catch(() => []),
          mibApi.getArchives().catch(() => []),
          configApi.get().catch(() => ({ mibRootPath: '/opt/mibs', defaultCommunity: 'public' })),
          presetsApi.getQuickOIDs().catch(() => [])
        ]);
        setDevices(devicesData || []);
        setArchives(archivesData || []);
        setConfig({ ...configData, enableAi: false });
        setQuickOids(quickOidsData || []);
      } catch (error) {
        console.error('Failed to load data:', error);
      }
    };
    loadData();

    // Load basket from localStorage (client-side only)
    const savedBasket = localStorage.getItem('mib_basket');
    if (savedBasket) setBasket(JSON.parse(savedBasket));
  }, []);

  // Save basket to localStorage
  useEffect(() => {
    localStorage.setItem('mib_basket', JSON.stringify(basket));
  }, [basket]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsExtracting(true);
    setProgress(0);

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.name.endsWith('.zip')) {
          setProgress(Math.round(((i + 0.5) / files.length) * 100));
          const newArchive = await mibApi.upload(file);
          setArchives(prev => [newArchive, ...prev]);
        }
        setProgress(Math.round(((i + 1) / files.length) * 100));
      }
      setActiveView('mibs');
    } catch (error) {
      console.error('Upload failed:', error);
      alert('上传失败: ' + (error as Error).message);
    } finally {
      setIsExtracting(false);
      setProgress(0);
      if (archiveInputRef.current) {
        archiveInputRef.current.value = '';
      }
    }
  };

  const handleAddDevice = async (device: Device) => {
    try {
      const newDevice = await devicesApi.create(device);
      setDevices(prev => [...prev, newDevice]);
    } catch (error) {
      console.error('Failed to add device:', error);
      alert('添加设备失败: ' + (error as Error).message);
    }
  };

  const handleAddDevicesBatch = async (newDevices: Device[]) => {
    try {
      const created = await devicesApi.createBatch(newDevices);
      setDevices(prev => [...prev, ...created]);
    } catch (error) {
      console.error('Failed to add devices:', error);
      alert('批量添加设备失败: ' + (error as Error).message);
    }
  };

  const handleDeleteDevice = async (id: string) => {
    try {
      await devicesApi.delete(id);
      setDevices(prev => prev.filter(d => d.id !== id));
    } catch (error) {
      console.error('Failed to delete device:', error);
      alert('删除设备失败: ' + (error as Error).message);
    }
  };

  const handleUpdateConfig = async (newConfig: SystemConfig) => {
    try {
      await configApi.update(newConfig);
      setConfig(newConfig);
    } catch (error) {
      console.error('Failed to update config:', error);
      alert('更新配置失败: ' + (error as Error).message);
    }
  };

  const toggleBasket = (node: MibNode) => {
    setBasket(prev => {
      const exists = prev.find(n => n.oid === node.oid);
      if (exists) return prev.filter(n => n.oid !== node.oid);
      return [...prev, node];
    });
  };

  // Scan server directory for zip files
  const handleScanDirectory = async () => {
    try {
      setScanError(null);
      const result = await mibApi.scanDirectory(config.mibRootPath);
      setServerZipFiles(result.files || []);
      if (result.error) {
        setScanError(result.error);
      }
    } catch (error) {
      setScanError((error as Error).message);
      setServerZipFiles([]);
    }
  };

  // Extract zip from server path
  const handleExtractFromPath = async (path: string) => {
    setIsExtracting(true);
    setProgress(50);
    try {
      const newArchive = await mibApi.extractFromPath(path);
      setArchives(prev => [newArchive, ...prev]);
      // Remove from serverZipFiles list
      setServerZipFiles(prev => prev.filter(f => f.path !== path));
      setActiveView('mibs');
    } catch (error) {
      alert('解压失败: ' + (error as Error).message);
    } finally {
      setIsExtracting(false);
      setProgress(0);
    }
  };

  // Load archive detail when selected
  const handleSelectArchive = async (archiveId: string) => {
    if (selectedArchiveId === archiveId) {
      setSelectedArchiveId(null);
      setLoadedArchiveFiles([]);
      return;
    }
    setSelectedArchiveId(archiveId);
    setSelectedFile(null);
    setSelectedNode(null);
    try {
      const detail = await mibApi.getArchiveDetail(archiveId);
      setLoadedArchiveFiles(detail.files || []);
    } catch (error) {
      console.error('Failed to load archive detail:', error);
      setLoadedArchiveFiles([]);
    }
  };

  // Parse MIB file on demand when clicked
  const handleSelectMibFile = async (file: MibFile) => {
    setSelectedNode(null);

    // If already parsed (has nodes), just select it
    if (file.nodes && file.nodes.length > 0) {
      setSelectedFile(file);
      return;
    }

    // Parse on demand
    setIsParsing(true);
    try {
      const parsed = await mibApi.parseFile(file.path);
      const updatedFile = { ...file, nodes: parsed.nodes, isParsed: true };
      setSelectedFile(updatedFile);
      // Update in the list
      setLoadedArchiveFiles(prev => prev.map(f => f.id === file.id ? updatedFile : f));
    } catch (error) {
      console.error('Failed to parse MIB file:', error);
      alert('解析失败: ' + (error as Error).message);
    } finally {
      setIsParsing(false);
    }
  };

  // 搜索 OID - 递归搜索所有节点
  const searchNodes = (nodes: MibNode[], query: string): MibNode[] => {
    const results: MibNode[] = [];
    const lowerQuery = query.toLowerCase();

    nodes.forEach(node => {
      // 检查当前节点是否匹配
      const nameMatch = node.name.toLowerCase().includes(lowerQuery);
      const oidMatch = node.oid.toLowerCase().includes(lowerQuery);
      const descMatch = node.description?.toLowerCase().includes(lowerQuery);
      const syntaxMatch = node.syntax?.toLowerCase().includes(lowerQuery);

      if (nameMatch || oidMatch || descMatch || syntaxMatch) {
        results.push(node);
      }

      // 递归搜索子节点
      if (node.children && node.children.length > 0) {
        const childResults = searchNodes(node.children, query);
        results.push(...childResults);
      }
    });

    return results;
  };

  // 处理搜索
  const handleSearch = async (query: string) => {
    setSearchQuery(query);

    if (query.length < 2) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    setIsSearching(true);
    setShowSearchResults(true);

    try {
      // 从所有已解析的 MIB 文件中搜索
      const allResults: MibNode[] = [];

      // 搜索已加载的文件
      for (const file of loadedArchiveFiles) {
        if (file.nodes && file.nodes.length > 0) {
          const results = searchNodes(file.nodes, query);
          allResults.push(...results);
        }
      }

      // 如果结果太少，尝试解析其他文件
      if (allResults.length < 5) {
        for (const archive of archives) {
          try {
            const detail = await mibApi.getArchiveDetail(archive.id);
            for (const file of detail.files || []) {
              if (!file.isParsed) {
                try {
                  const parsed = await mibApi.parseFile(file.path);
                  const results = searchNodes(parsed.nodes, query);
                  allResults.push(...results);
                } catch (err) {
                  console.error('Failed to parse file during search:', err);
                }
              }
            }
          } catch (err) {
            console.error('Failed to get archive detail:', err);
          }
        }
      }

      // 去重
      const uniqueResults = allResults.filter((node, index, self) =>
        index === self.findIndex(n => n.oid === node.oid)
      );

      setSearchResults(uniqueResults.slice(0, 20)); // 限制结果数量
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setIsSearching(false);
    }
  };

  // 选择搜索结果
  const handleSelectSearchResult = (node: MibNode) => {
    setSelectedNode(node);
    setShowSearchResults(false);
    setSearchQuery('');
    // 如果在 MIB 库视图，可以导航到对应的文件
    if (activeView === 'mibs') {
      // 可以在这里添加逻辑来高亮显示选中的节点
    }
  };

  return (
    <div className="flex h-screen bg-[#020617] text-slate-200 overflow-hidden font-sans">
      {/* 侧边导航 */}
      <nav className="w-20 bg-black/40 border-r border-slate-900 flex flex-col items-center py-8 gap-8 z-50 backdrop-blur-xl">
        <div onClick={() => setActiveView('dashboard')} className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-blue-600/40 cursor-pointer hover:scale-110 transition-all">
          <ZapIcon className="text-white w-6 h-6" />
        </div>
        <div className="flex flex-col gap-5">
          {[
            { id: 'dashboard', icon: HomeIcon, label: '概览' },
            { id: 'mibs', icon: DatabaseIcon, label: 'MIB 库' },
            { id: 'devices', icon: ServerIcon, label: '资产管理' },
            { id: 'generator', icon: CogIcon, label: '配置生成' },
            { id: 'settings', icon: TerminalIcon, label: '系统设置' }
          ].map(item => (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id as ViewState)}
              className={`p-3.5 rounded-2xl transition-all relative group ${activeView === item.id ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-600 hover:bg-white/5 hover:text-slate-400'}`}
            >
              <item.icon className="w-6 h-6" />
              <div className="absolute left-full ml-4 px-3 py-2 bg-slate-900 text-[10px] font-black uppercase tracking-widest rounded-xl opacity-0 group-hover:opacity-100 whitespace-nowrap z-50 shadow-2xl border border-slate-800 transition-all">
                {item.label}
              </div>
            </button>
          ))}
        </div>
        {/* 搜索按钮 */}
        <div className="mt-auto relative">
          <button
            onClick={() => {
              const searchInput = document.getElementById('global-search') as HTMLInputElement;
              searchInput?.focus();
            }}
            className="p-3.5 rounded-2xl transition-all relative group hover:bg-white/5 text-slate-600 hover:text-slate-400"
          >
            <SearchIcon className="w-6 h-6" />
            <div className="absolute left-full ml-4 px-3 py-2 bg-slate-900 text-[10px] font-black uppercase tracking-widest rounded-xl opacity-0 group-hover:opacity-100 whitespace-nowrap z-50 shadow-2xl border border-slate-800 transition-all">
              全局搜索
            </div>
          </button>
        </div>
      </nav>

      <main className="flex-1 flex overflow-hidden relative">
        {/* 全局搜索框 */}
        <div className="absolute top-4 right-4 z-40 w-96">
          <div className="relative">
            <input
              id="global-search"
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="搜索 OID 名称、描述、语法..."
              className="w-full bg-black/80 backdrop-blur-xl border border-slate-800 rounded-2xl px-5 py-3 text-sm text-white placeholder-slate-600 focus:border-blue-500 outline-none shadow-2xl transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSearchResults([]);
                  setShowSearchResults(false);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 hover:text-white transition-colors"
              >
                <XCircleIcon className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* 搜索结果下拉框 */}
          {showSearchResults && searchResults.length > 0 && (
            <div className="absolute top-full mt-2 w-full bg-slate-900/95 backdrop-blur-xl border border-slate-800 rounded-2xl shadow-2xl overflow-hidden z-50 max-h-96 overflow-y-auto">
              <div className="p-3 border-b border-slate-800">
                <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">
                  找到 {searchResults.length} 个结果
                </span>
              </div>
              {searchResults.map((node, index) => (
                <div
                  key={`${node.oid}-${index}`}
                  onClick={() => handleSelectSearchResult(node)}
                  className="p-4 hover:bg-blue-600/10 cursor-pointer transition-all border-b border-slate-800/50 last:border-0"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-bold text-blue-400">{node.name}</span>
                    <code className="text-xs text-slate-600 font-mono">{node.oid}</code>
                  </div>
                  {node.description && (
                    <p className="text-xs text-slate-500 truncate">{node.description}</p>
                  )}
                  {node.syntax && (
                    <span className="text-[10px] text-slate-700 font-mono mt-1 inline-block bg-slate-800 px-2 py-0.5 rounded">
                      {node.syntax}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          {showSearchResults && searchResults.length === 0 && searchQuery.length >= 2 && (
            <div className="absolute top-full mt-2 w-full bg-slate-900/95 backdrop-blur-xl border border-slate-800 rounded-2xl shadow-2xl overflow-hidden z-50 p-6 text-center">
              {isSearching ? (
                <div className="flex items-center justify-center gap-3">
                  <div className="w-4 h-4 border-2 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
                  <span className="text-sm text-slate-500">搜索中...</span>
                </div>
              ) : (
                <div>
                  <SearchIcon className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p className="text-sm text-slate-600">未找到匹配的 OID</p>
                  <p className="text-xs text-slate-700 mt-1">尝试其他关键词</p>
                </div>
              )}
            </div>
          )}
        </div>

        {activeView === 'dashboard' && (
          <div className="flex-1 p-16 overflow-y-auto bg-gradient-to-br from-blue-600/5 to-transparent">
            <div className="max-w-6xl mx-auto">
              <header className="mb-16">
                <h1 className="text-6xl font-black text-white tracking-tighter mb-4">SNMP Console</h1>
                <p className="text-slate-500 font-medium text-lg">当前服务器根目录: <code className="text-blue-400 bg-blue-400/10 px-3 py-1 rounded-lg border border-blue-500/10">{config.mibRootPath}</code></p>
              </header>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                 <div onClick={() => setActiveView('mibs')} className="bg-slate-900/40 border border-slate-800 p-10 rounded-[48px] hover:border-blue-500/30 transition-all cursor-pointer shadow-2xl">
                    <DatabaseIcon className="w-8 h-8 text-blue-500 mb-6" />
                    <h3 className="text-2xl font-black text-white mb-2">MIB Explorer</h3>
                    <p className="text-sm text-slate-500">浏览已上传并解压的品牌 MIB 包，管理 OID 指标。</p>
                 </div>
                 <div onClick={() => archiveInputRef.current?.click()} className="bg-slate-900/40 border border-slate-800 p-10 rounded-[48px] hover:border-emerald-500/30 transition-all cursor-pointer shadow-2xl">
                    <UploadIcon className="w-8 h-8 text-emerald-500 mb-6" />
                    <h3 className="text-2xl font-black text-white mb-2">导入 ZIP 包</h3>
                    <p className="text-sm text-slate-500">上传品牌压缩包，系统将模拟服务器路径自动解压。</p>
                 </div>
                 <div onClick={() => setActiveView('generator')} className="bg-slate-900/40 border border-slate-800 p-10 rounded-[48px] hover:border-amber-500/30 transition-all cursor-pointer shadow-2xl">
                    <CogIcon className="w-8 h-8 text-amber-500 mb-6" />
                    <h3 className="text-2xl font-black text-white mb-2">配置向导</h3>
                    <p className="text-sm text-slate-500">严格的五步配置生成流程，适配多种主流采集器。</p>
                 </div>
              </div>

              {/* 快速 OID 预设 */}
              {quickOids.length > 0 && (
                <div className="mt-12">
                  <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-6">常用 OID 快速添加</h3>
                  <div className="flex flex-wrap gap-3">
                    {quickOids.slice(0, 10).map((item, idx) => (
                      <button
                        key={idx}
                        onClick={() => toggleBasket({ name: item.name, oid: item.oid, children: [] })}
                        className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all border ${
                          basket.some(b => b.oid === item.oid)
                            ? 'bg-blue-600 text-white border-blue-500'
                            : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:border-blue-500/50'
                        }`}
                      >
                        {item.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* 当前篮子状态 */}
              {basket.length > 0 && (
                <div className="mt-8 p-6 bg-blue-600/10 border border-blue-500/20 rounded-3xl">
                  <div className="flex justify-between items-center">
                    <span className="text-blue-400 text-sm font-bold">已选择 {basket.length} 个 OID 指标</span>
                    <button
                      onClick={() => setActiveView('generator')}
                      className="px-6 py-2 bg-blue-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-blue-500 transition-all"
                    >
                      去生成配置
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeView === 'generator' && (
          <ConfigGenerator
            devices={devices}
            basket={basket}
            archives={archives}
            mibRoot={config.mibRootPath}
            onToggleBasket={toggleBasket}
          />
        )}

        {activeView === 'settings' && (
          <div className="flex-1 p-20 bg-gradient-to-br from-indigo-600/5 to-transparent">
             <div className="max-w-2xl mx-auto">
                <h2 className="text-5xl font-black text-white mb-12 tracking-tighter">环境设置</h2>
                <div className="space-y-10">
                   <div className="bg-slate-900/40 border border-slate-800 p-10 rounded-[40px] space-y-8 shadow-2xl">
                      <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">服务器 MIB 存储根路径</label>
                        <input
                          type="text"
                          value={config.mibRootPath}
                          onChange={(e) => setConfig({...config, mibRootPath: e.target.value})}
                          className="w-full bg-black/60 border border-slate-800 rounded-2xl px-8 py-5 text-sm text-blue-400 font-mono focus:border-blue-500 outline-none transition-all"
                          placeholder="/usr/share/snmp/mibs"
                        />
                        <p className="text-[10px] text-slate-600 italic">配置文件中的 mibdirs 将以此作为基点生成的完整路径。</p>
                      </div>
                      <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">默认 Community</label>
                        <input
                          type="text"
                          value={config.defaultCommunity}
                          onChange={(e) => setConfig({...config, defaultCommunity: e.target.value})}
                          className="w-full bg-black/60 border border-slate-800 rounded-2xl px-8 py-5 text-sm text-white focus:border-blue-500 outline-none"
                        />
                      </div>
                      <button
                        onClick={() => handleUpdateConfig(config)}
                        className="w-full py-5 bg-blue-600 hover:bg-blue-500 text-white rounded-3xl text-[10px] font-black uppercase tracking-widest transition-all"
                      >
                        保存配置
                      </button>
                   </div>
                   <button onClick={() => {if(confirm('清空本地缓存？')) {localStorage.clear(); window.location.reload();}}} className="w-full py-5 bg-red-600/10 border border-red-500/20 text-red-500 rounded-3xl text-[10px] font-black uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all">重置本地缓存</button>
                </div>
             </div>
          </div>
        )}

        {activeView === 'mibs' && (
          <div className="flex-1 flex overflow-hidden animate-in fade-in duration-500">
             <aside className="w-80 bg-black/20 border-r border-slate-900 flex flex-col">
                <div className="p-8 border-b border-slate-900">
                  <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">服务器 MIB 目录</h3>
                  <div className="flex gap-2 mb-3">
                    <input
                      type="text"
                      value={config.mibRootPath}
                      onChange={(e) => setConfig({...config, mibRootPath: e.target.value})}
                      className="flex-1 bg-black/60 border border-slate-800 rounded-xl px-3 py-2 text-xs text-blue-400 font-mono focus:border-blue-500 outline-none"
                      placeholder="/path/to/mibs"
                    />
                    <button
                      onClick={handleScanDirectory}
                      className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-[10px] font-bold"
                    >
                      扫描
                    </button>
                  </div>
                  <button
                    onClick={() => archiveInputRef.current?.click()}
                    className="w-full py-2 bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 rounded-xl text-[10px] font-bold hover:bg-emerald-600 hover:text-white transition-all flex items-center justify-center gap-2"
                  >
                    <UploadIcon className="w-4 h-4" />
                    上传 ZIP 包
                  </button>
                  {scanError && <p className="text-red-400 text-[10px] mt-2">{scanError}</p>}
                </div>

                {/* 服务器扫描结果：文件夹和 ZIP 文件 */}
                {serverZipFiles.length > 0 && (
                  <div className="p-4 border-b border-slate-900">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-[10px] font-black text-amber-500 uppercase tracking-widest">
                        扫描结果 ({serverZipFiles.length})
                      </h4>
                      {config.mibRootPath !== '/opt/mibs' && (
                        <button
                          onClick={() => {
                            // 返回上一级目录
                            const parentPath = config.mibRootPath.substring(0, config.mibRootPath.lastIndexOf('/'));
                            const newPath = parentPath || '/';
                            setConfig({...config, mibRootPath: newPath});
                            handleScanDirectory();
                          }}
                          className="text-[10px] text-blue-400 hover:text-blue-300"
                        >
                          ← 返回上一级
                        </button>
                      )}
                    </div>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {serverZipFiles.map((item, idx) => (
                        <div
                          key={idx}
                          className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                            item.type === 'directory'
                              ? 'bg-blue-600/10 border-blue-500/20 hover:bg-blue-600/20 cursor-pointer'
                              : 'bg-amber-600/10 border-amber-500/20'
                          }`}
                          onClick={() => {
                            if (item.type === 'directory') {
                              // 进入文件夹
                              setConfig({...config, mibRootPath: item.path});
                              handleScanDirectory();
                            }
                          }}
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            {item.type === 'directory' ? (
                              <FolderIcon className="w-4 h-4 text-blue-400 flex-shrink-0" />
                            ) : (
                              <FileIcon className="w-4 h-4 text-amber-400 flex-shrink-0" />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className={`text-[11px] font-bold truncate ${
                                item.type === 'directory' ? 'text-blue-400' : 'text-amber-400'
                              }`}>
                                {item.name}
                              </p>
                              <p className="text-[10px] text-slate-500">
                                {item.type === 'directory' ? '文件夹' : item.size}
                              </p>
                            </div>
                          </div>
                          {item.type === 'file' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleExtractFromPath(item.path);
                              }}
                              className="ml-2 px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-[10px] font-bold flex-shrink-0"
                            >
                              解压
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="p-4 border-b border-slate-900"><h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">已解析的品牌包</h3></div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                   {archives.map(arc => (
                     <div key={arc.id} className={`p-4 rounded-3xl border transition-all cursor-pointer ${selectedArchiveId === arc.id ? 'bg-blue-600/10 border-blue-500/30' : 'bg-slate-900/20 border-slate-800 hover:bg-slate-900/40'}`}>
                        <div className="flex items-center gap-3 mb-2" onClick={() => handleSelectArchive(arc.id)}>
                           <FolderIcon className={`w-5 h-5 ${selectedArchiveId === arc.id ? 'text-blue-500' : 'text-slate-600'}`} />
                           <div className="flex-1 min-w-0">
                             <p className="text-[11px] font-black truncate">{arc.fileName}</p>
                             <p className="text-[10px] text-slate-500">{arc.fileCount || 0} 个 MIB 文件</p>
                           </div>
                        </div>
                        {selectedArchiveId === arc.id && loadedArchiveFiles.length > 0 && (
                          <div className="space-y-1 mt-2 border-t border-slate-800 pt-3 max-h-60 overflow-y-auto">
                             {loadedArchiveFiles.map(f => (
                               <button
                                key={f.id}
                                onClick={() => handleSelectMibFile(f)}
                                className={`w-full text-left px-3 py-2 rounded-xl text-[10px] truncate transition-all ${selectedFile?.id === f.id ? 'bg-blue-600/20 text-blue-400' : 'text-slate-500 hover:bg-slate-800'}`}
                               >
                                 {f.name}
                                 {f.isParsed && <span className="ml-1 text-emerald-500">✓</span>}
                               </button>
                             ))}
                          </div>
                        )}
                     </div>
                   ))}
                   {archives.length === 0 && (
                     <div className="text-center py-10 text-slate-600 text-[10px]">
                       <p>暂无已解析的 MIB 包</p>
                       <p className="mt-2">请扫描目录并解压 ZIP 文件</p>
                     </div>
                   )}
                </div>
             </aside>
             <aside className="w-96 border-r border-slate-900 flex flex-col bg-black/40">
                <div className="p-8 border-b border-slate-900"><h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">OID 树</h3></div>
                <div className="flex-1 overflow-y-auto">
                   {isParsing ? (
                     <div className="p-20 text-center">
                       <div className="w-8 h-8 border-2 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
                       <p className="text-[10px] font-bold text-slate-500">正在解析 MIB 文件...</p>
                     </div>
                   ) : selectedFile ? (
                     <MibTreeView
                        nodes={selectedFile.nodes}
                        onSelect={setSelectedNode}
                        onToggleBasket={toggleBasket}
                        selectedOid={selectedNode?.oid}
                        basketOids={basket.map(n => n.oid)}
                     />
                   ) : <div className="p-20 text-center opacity-10 text-[10px] font-black uppercase">请从左侧选择 MIB 文件</div>}
                </div>
             </aside>
             <section className="flex-1 overflow-y-auto">
                <OidDetails node={selectedNode} devices={devices} />
             </section>
          </div>
        )}

        {activeView === 'devices' && <DeviceManager devices={devices} onAdd={handleAddDevice} onAddBatch={handleAddDevicesBatch} onDelete={handleDeleteDevice} />}
      </main>

      <input type="file" ref={archiveInputRef} multiple accept=".zip" onChange={handleFileUpload} className="hidden" />

      {isExtracting && (
        <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-2xl flex items-center justify-center">
           <div className="text-center space-y-8">
              <div className="w-20 h-20 border-4 border-blue-500/10 border-t-blue-500 rounded-full animate-spin mx-auto"></div>
              <p className="text-xs font-black uppercase tracking-widest text-slate-500">正在上传并解析 MIB 包: {progress}%</p>
           </div>
        </div>
      )}
    </div>
  );
};

export default App;
