
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
