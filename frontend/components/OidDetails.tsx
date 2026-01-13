
import React, { useState, useEffect } from 'react';
import { MibNode, DetailTab, Device } from '../types';
import { CodeIcon, TerminalIcon, FileIcon, PlayIcon, ZapIcon, ClipboardIcon } from './Icons';
import { generateCodeFromBackend, generateLocalSnmpCode } from '../services/localConfigService';
import { snmpApi } from '../services/api';

interface OidDetailsProps {
  node: MibNode | null;
  devices: Device[];
}

const DetailRow: React.FC<{ label: string; value: string | undefined; mono?: boolean }> = ({ label, value, mono }) => {
  if (!value) return null;
  return (
    <div className="flex flex-col py-4 border-b border-slate-900/50 last:border-0">
      <span className="text-[9px] font-black text-slate-600 uppercase tracking-[0.2em] mb-2">{label}</span>
      <span className={`text-slate-300 break-all leading-relaxed ${mono ? 'font-mono text-blue-400 text-xs bg-black/40 px-3 py-1.5 rounded-lg border border-white/5' : 'text-[13px] font-medium'}`}>{value}</span>
    </div>
  );
};

const OidDetails: React.FC<OidDetailsProps> = ({ node, devices }) => {
  const [activeTab, setActiveTab] = useState<DetailTab>(DetailTab.OVERVIEW);
  const [codeSnippet, setCodeSnippet] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lang, setLang] = useState('python');
  const [testDeviceId, setTestDeviceId] = useState('');
  const [testResult, setTestResult] = useState<string | null>(null);

  useEffect(() => {
    setCodeSnippet(null);
    setTestResult(null);
    setActiveTab(DetailTab.OVERVIEW);
  }, [node]);

  const handleCodeGen = async (language: string) => {
    if (!node) return;
    setIsProcessing(true);
    setLang(language);
    try {
      const result = await generateCodeFromBackend(node, language as any);
      setCodeSnippet(result);
    } catch {
      const result = generateLocalSnmpCode(node, language);
      setCodeSnippet(result);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRunTest = async () => {
    const device = devices.find(d => d.id === testDeviceId);
    if (!device || !node) return;

    setIsProcessing(true);
    setTestResult(null);

    const startTime = Date.now();

    try {
      const results = await snmpApi.get(testDeviceId, [node.oid]);
      const elapsed = Date.now() - startTime;

      if (results && results.length > 0) {
        const r = results[0];
        setTestResult(
          `[SNMP GET - ${new Date().toLocaleTimeString()}]\n` +
          `Target: ${device.ip}:${device.port}\n` +
          `OID: ${r.oid}\n` +
          `-----------------------------------\n` +
          `Type: ${r.type}\n` +
          `Value: ${r.value}\n` +
          `Elapsed: ${elapsed}ms\n` +
          `Status: Success`
        );
      } else {
        setTestResult(
          `[SNMP GET - ${new Date().toLocaleTimeString()}]\n` +
          `Target: ${device.ip}:${device.port}\n` +
          `OID: ${node.oid}\n` +
          `-----------------------------------\n` +
          `Status: No data returned`
        );
      }
    } catch (error) {
      setTestResult(
        `[SNMP GET - ${new Date().toLocaleTimeString()}]\n` +
        `Target: ${device.ip}:${device.port}\n` +
        `OID: ${node.oid}\n` +
        `-----------------------------------\n` +
        `Status: Failed\n` +
        `Error: ${(error as Error).message}`
      );
    } finally {
      setIsProcessing(false);
    }
  };

  if (!node) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-20 text-center opacity-30 animate-in fade-in duration-1000">
        <div className="w-32 h-32 bg-slate-900 rounded-[48px] flex items-center justify-center mb-8 border border-slate-800 shadow-inner">
          <ZapIcon className="w-12 h-12 text-slate-700" />
        </div>
        <h2 className="text-xl font-black uppercase tracking-[0.4em] text-slate-500">Node Inspector</h2>
        <p className="text-xs text-slate-600 mt-4 max-w-xs leading-relaxed">Probe the MIB tree on the left to reveal deep OID metadata and generate SDK code.</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-slate-950 animate-in fade-in slide-in-from-right-4 duration-500">
      <div className="p-10 border-b border-slate-900 bg-white/[0.01]">
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-4">
             <span className="text-[9px] font-black text-blue-500 uppercase tracking-[0.3em] bg-blue-500/10 px-3 py-1.5 rounded-xl border border-blue-500/20 shadow-inner">OID Context</span>
             {node.access && <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest border border-slate-800 px-3 py-1.5 rounded-xl">{node.access}</span>}
          </div>
          <h2 className="text-4xl font-black text-white tracking-tighter mt-4 truncate leading-tight">{node.name}</h2>
          <div className="mt-3 flex items-center gap-3">
             <code className="text-xs text-slate-500 font-mono tracking-tight bg-black/40 px-3 py-1.5 rounded-xl border border-white/5">{node.oid}</code>
          </div>
        </div>

        <div className="flex gap-10">
          {[
            { id: DetailTab.OVERVIEW, label: 'Definitions', icon: FileIcon },
            { id: DetailTab.CODE_GEN, label: 'SDK Examples', icon: CodeIcon },
            { id: DetailTab.SIMULATOR, label: 'SNMP Probe', icon: TerminalIcon },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as DetailTab)}
              className={`flex items-center gap-3 pb-4 text-[10px] font-black uppercase tracking-[0.2em] transition-all border-b-2 ${activeTab === tab.id ? 'border-blue-500 text-blue-500' : 'border-transparent text-slate-600 hover:text-slate-400'}`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-10">
        {activeTab === DetailTab.OVERVIEW && (
          <div className="space-y-12 max-w-4xl animate-in fade-in duration-500">
            <div className="grid grid-cols-2 gap-x-16 bg-slate-900/20 p-10 rounded-[48px] border border-slate-800/50 shadow-inner">
              <DetailRow label="Object Identity" value={node.name} />
              <DetailRow label="OID Serial" value={node.oid} mono />
              <DetailRow label="ASN.1 Syntax" value={node.syntax} mono />
              <DetailRow label="Read/Write Status" value={node.status || 'current'} />
            </div>
            <div className="space-y-4">
              <span className="text-[9px] font-black text-slate-700 uppercase tracking-[0.4em] block ml-1">Documentation Summary</span>
              <div className="bg-slate-900/40 rounded-[32px] p-10 border border-slate-800 text-slate-400 leading-8 italic text-[14px] shadow-2xl">
                "{node.description || 'No descriptive metadata was extracted from the MIB source definitions.'}"
              </div>
            </div>
          </div>
        )}

        {activeTab === DetailTab.CODE_GEN && (
          <div className="animate-in slide-in-from-bottom-4 duration-500 flex flex-col h-full space-y-8">
            <div className="flex justify-between items-center">
               <div className="flex gap-3">
                {['python', 'javascript', 'go'].map((l) => (
                  <button key={l} onClick={() => handleCodeGen(l)} className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${lang === l ? 'bg-white text-black shadow-xl scale-105' : 'bg-slate-900 text-slate-600 hover:bg-slate-800'}`}>{l}</button>
                ))}
               </div>
               {codeSnippet && (
                 <button onClick={() => {navigator.clipboard.writeText(codeSnippet); alert('Copied!');}} className="p-3 bg-slate-900 border border-slate-800 rounded-2xl text-slate-500 hover:text-white transition-all">
                    <ClipboardIcon className="w-4 h-4" />
                 </button>
               )}
            </div>
            <div className="flex-1 min-h-[400px] bg-black border border-slate-800 rounded-[48px] overflow-hidden shadow-2xl relative">
               <div className="absolute top-0 right-0 p-6 text-[10px] font-black uppercase text-slate-800 tracking-widest pointer-events-none">Template Build</div>
               <pre className="p-10 font-mono text-[12px] text-blue-300 leading-relaxed overflow-auto h-full custom-scrollbar">
                <code>{isProcessing ? "// Generating module template..." : codeSnippet || "// Select target SDK language above"}</code>
              </pre>
            </div>
          </div>
        )}

        {activeTab === DetailTab.SIMULATOR && (
           <div className="animate-in slide-in-from-bottom-6 duration-500 max-w-2xl mx-auto py-10">
             {/* 使用向导 */}
             <div className="mb-8 bg-gradient-to-r from-blue-600/10 to-emerald-600/10 border border-blue-500/20 rounded-[40px] p-8">
               <div className="flex items-start gap-4 mb-4">
                 <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-blue-600/40">
                   <TerminalIcon className="w-5 h-5 text-white" />
                 </div>
                 <div>
                   <h3 className="text-sm font-black text-white mb-2">SNMP 实时测试向导</h3>
                   <p className="text-xs text-slate-400 leading-relaxed">在实际设备上测试 OID，验证数据采集是否正常</p>
                 </div>
               </div>
               <div className="grid grid-cols-3 gap-4 mt-6">
                 <div className="flex flex-col items-center text-center p-4 bg-black/40 rounded-3xl border border-slate-800/50">
                   <div className="w-8 h-8 bg-blue-600/20 rounded-xl flex items-center justify-center mb-2">
                     <span className="text-blue-500 font-black text-sm">1</span>
                   </div>
                   <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">选择设备</span>
                 </div>
                 <div className="flex flex-col items-center text-center p-4 bg-black/40 rounded-3xl border border-slate-800/50">
                   <div className="w-8 h-8 bg-blue-600/20 rounded-xl flex items-center justify-center mb-2">
                     <span className="text-blue-500 font-black text-sm">2</span>
                   </div>
                   <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">执行查询</span>
                 </div>
                 <div className="flex flex-col items-center text-center p-4 bg-black/40 rounded-3xl border border-slate-800/50">
                   <div className="w-8 h-8 bg-blue-600/20 rounded-xl flex items-center justify-center mb-2">
                     <span className="text-blue-500 font-black text-sm">3</span>
                   </div>
                   <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">查看结果</span>
                 </div>
               </div>
               {devices.length === 0 && (
                 <div className="mt-4 p-4 bg-amber-600/10 border border-amber-500/20 rounded-2xl">
                   <p className="text-[10px] text-amber-400 font-medium flex items-center gap-2">
                     <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse"></span>
                     提示：还没有设备？请先在"资产管理"页面添加 SNMP 设备
                   </p>
                 </div>
               )}
             </div>

             <div className="bg-slate-900/40 border border-slate-800 rounded-[56px] p-12 shadow-[0_0_100px_rgba(37,99,235,0.05)] flex flex-col gap-10 backdrop-blur-md">
               <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] ml-2">Select Target Device</label>
                    <span className="text-[9px] text-slate-700 font-mono">{devices.length} devices available</span>
                  </div>
                  <select value={testDeviceId} onChange={(e) => setTestDeviceId(e.target.value)} className="w-full bg-black/60 border border-slate-800 rounded-3xl px-8 py-6 text-sm text-white focus:border-blue-500 outline-none appearance-none cursor-pointer font-bold shadow-inner transition-all hover:border-slate-700">
                    <option value="">-- Choose Device from Registry --</option>
                    {devices.map(d => <option key={d.id} value={d.id}>{d.name} ({d.ip}:{d.port}) - {d.version}</option>)}
                  </select>
                  {testDeviceId && (
                    <div className="flex items-center gap-2 p-3 bg-blue-600/10 border border-blue-500/20 rounded-2xl">
                      <ZapIcon className="w-4 h-4 text-blue-500" />
                      <span className="text-[10px] text-blue-400 font-medium">
                        将向 {devices.find(d => d.id === testDeviceId)?.ip} 发送 SNMP GET 请求
                      </span>
                    </div>
                  )}
               </div>
               <button onClick={handleRunTest} disabled={!testDeviceId || isProcessing} className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-20 text-white font-black py-6 rounded-3xl text-[10px] uppercase tracking-[0.4em] shadow-2xl shadow-blue-600/40 flex items-center justify-center gap-4 transition-all active:scale-95 disabled:cursor-not-allowed">
                 {isProcessing ? <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div> : <PlayIcon className="w-5 h-5" />}
                 {isProcessing ? 'Querying...' : 'Execute SNMP GET'}
               </button>
               <div className="bg-black/80 rounded-[40px] p-10 font-mono text-[11px] text-emerald-500 border border-slate-800 min-h-[200px] whitespace-pre-wrap leading-relaxed shadow-inner">
                 {testResult || "// Select a device and click Execute to perform real SNMP query\n// Results will appear here with response time and value"}
               </div>
             </div>
           </div>
        )}
      </div>
    </div>
  );
};

export default OidDetails;
