
import { MibNode } from '../types';

export interface MibPreset {
  id: string;
  category: 'Standard' | 'Vendor' | 'Cloud';
  name: string;
  description: string;
  nodes: MibNode[];
}

export const COMMON_PRESETS: MibPreset[] = [
  {
    id: 'rfc1213-mib',
    category: 'Standard',
    name: 'RFC1213-MIB (System)',
    description: '标准 SNMP MIB-II 核心节点，包含设备描述、运行时间及联系信息。',
    nodes: [
      {
        name: 'system',
        oid: '1.3.6.1.2.1.1',
        description: 'System-specific information',
        children: [
          { name: 'sysDescr', oid: '1.3.6.1.2.1.1.1', syntax: 'DisplayString', access: 'read-only', children: [] },
          { name: 'sysUpTime', oid: '1.3.6.1.2.1.1.3', syntax: 'TimeTicks', access: 'read-only', children: [] },
          { name: 'sysName', oid: '1.3.6.1.2.1.1.5', syntax: 'DisplayString', access: 'read-write', children: [] }
        ]
      },
      {
        name: 'interfaces',
        oid: '1.3.6.1.2.1.2',
        description: 'Interface table and statistics',
        children: [
          { name: 'ifNumber', oid: '1.3.6.1.2.1.2.1', syntax: 'Integer', access: 'read-only', children: [] },
          { name: 'ifTable', oid: '1.3.6.1.2.1.2.2', syntax: 'Sequence', access: 'not-accessible', children: [] }
        ]
      }
    ]
  },
  {
    id: 'host-resources',
    category: 'Standard',
    name: 'HOST-RESOURCES-MIB',
    description: '用于监控主机的 CPU、内存、存储使用率及进程列表。',
    nodes: [
      {
        name: 'hrSystem',
        oid: '1.3.6.1.2.1.25.1',
        children: [
          { name: 'hrSystemUptime', oid: '1.3.6.1.2.1.25.1.1', children: [] },
          { name: 'hrSystemNumUsers', oid: '1.3.6.1.2.1.25.1.5', children: [] }
        ]
      },
      {
        name: 'hrStorage',
        oid: '1.3.6.1.2.1.25.2',
        children: [
          { name: 'hrMemorySize', oid: '1.3.6.1.2.1.25.2.2', syntax: 'KBytes', children: [] }
        ]
      }
    ]
  },
  {
    id: 'cisco-envmon',
    category: 'Vendor',
    name: 'CISCO-ENVMON-MIB',
    description: 'Cisco 设备环境监控：温度、风扇状态及电源功率。',
    nodes: [
      {
        name: 'ciscoEnvMonObjects',
        oid: '1.3.6.1.4.1.9.9.13.1',
        children: [
          { name: 'ciscoEnvMonVoltageStatusTable', oid: '1.3.6.1.4.1.9.9.13.1.2', children: [] },
          { name: 'ciscoEnvMonFanStatusTable', oid: '1.3.6.1.4.1.9.9.13.1.3', children: [] },
          { name: 'ciscoEnvMonTemperatureStatusTable', oid: '1.3.6.1.4.1.9.9.13.1.4', children: [] }
        ]
      }
    ]
  }
];

export const QUICK_OIDS = [
  { name: 'CPU 负载 (5min)', oid: '1.3.6.1.4.1.9.9.109.1.1.1.1.7', vendor: 'Cisco' },
  { name: '接口入流量', oid: '1.3.6.1.2.1.2.2.1.10', vendor: 'Standard' },
  { name: '风扇状态', oid: '1.3.6.1.4.1.9.9.13.1.3.1.6', vendor: 'Cisco' },
  { name: '内存空闲率', oid: '1.3.6.1.4.1.2021.4.11', vendor: 'Linux/Net-SNMP' },
  { name: '设备序列号', oid: '1.3.6.1.2.1.47.1.1.1.1.11', vendor: 'Entity-MIB' }
];

// OID 分类 - 用于智能推荐
export interface OidCategory {
  id: string;
  name: string;
  icon: string;
  description: string;
  keywords: string[]; // 用于匹配的关键词
  color: string;
}

export const OID_CATEGORIES: OidCategory[] = [
  {
    id: 'cpu',
    name: 'CPU 性能',
    icon: 'cpu',
    description: '处理器使用率、负载、核心数等',
    keywords: ['cpu', 'processor', 'load', 'core', 'usage', 'utilization', 'cpmCPUTotal', 'hrProcessor'],
    color: 'text-red-500'
  },
  {
    id: 'memory',
    name: '内存',
    icon: 'memory',
    description: '内存使用率、可用内存、交换空间',
    keywords: ['memory', 'ram', 'swap', 'buffer', 'cache', 'mem', 'storage', 'hrStorage', 'ciscoMemoryPool'],
    color: 'text-amber-500'
  },
  {
    id: 'network',
    name: '网络接口',
    icon: 'network',
    description: '接口流量、错误率、连接状态',
    keywords: ['interface', 'if', 'port', 'ethernet', 'vlan', 'link', 'packet', 'byte', 'ifTable', 'ifXTable', 'etherStats'],
    color: 'text-blue-500'
  },
  {
    id: 'routing',
    name: '路由',
    icon: 'routing',
    description: '路由表、ARP 表、邻居状态',
    keywords: ['route', 'routing', 'arp', 'neighbor', 'bgp', 'ospf', 'ipRoute', 'ipNetToMedia', 'bgpPeer'],
    color: 'text-emerald-500'
  },
  {
    id: 'system',
    name: '系统信息',
    icon: 'system',
    description: '设备描述、运行时间、序列号',
    keywords: ['system', 'sys', 'uptime', 'serial', 'model', 'version', 'description', 'sysDescr', 'sysUpTime', 'entPhysical'],
    color: 'text-purple-500'
  },
  {
    id: 'environment',
    name: '环境监控',
    icon: 'environment',
    description: '温度、风扇、电源状态',
    keywords: ['temperature', 'temp', 'fan', 'power', 'voltage', 'env', 'ciscoEnvMon', 'entitySensor'],
    color: 'text-orange-500'
  },
  {
    id: 'storage',
    name: '存储',
    icon: 'storage',
    description: '磁盘使用率、文件系统、分区',
    keywords: ['disk', 'storage', 'filesystem', 'partition', 'hrStorage', 'dskTable'],
    color: 'text-cyan-500'
  },
  {
    id: 'security',
    name: '安全',
    icon: 'security',
    description: 'ACL、防火墙、认证状态',
    keywords: ['acl', 'firewall', 'security', 'auth', 'login', 'user', 'aaa', 'ipAccessControl'],
    color: 'text-rose-500'
  }
];

// 根据关键词匹配 OID 分类
export function matchCategory(nodeName: string, nodeDescription?: string): string | null {
  const searchText = `${nodeName} ${nodeDescription || ''}`.toLowerCase();

  for (const category of OID_CATEGORIES) {
    for (const keyword of category.keywords) {
      if (searchText.includes(keyword.toLowerCase())) {
        return category.id;
      }
    }
  }

  return null;
}
