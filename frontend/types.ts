
export interface MibNode {
  name: string;
  oid: string;
  type?: string;
  access?: string;
  status?: string;
  description?: string;
  syntax?: string;
  parentOid?: string;
  children: MibNode[];
}

export interface MibFile {
  id: string;
  name: string;
  path: string;
  content: string;
  nodes: MibNode[];
  isParsed: boolean;
}

export interface MibArchive {
  id: string;
  fileName: string;
  size: string;
  status: 'pending' | 'extracting' | 'extracted' | 'error';
  extractedPath: string; 
  files: MibFile[];
  timestamp: number;
}

export interface SystemConfig {
  mibRootPath: string;
  defaultCommunity: string;
  enableAi: boolean;
}

export interface Device {
  id: string;
  name: string;
  ip: string;
  port: number;
  version: 'v1' | 'v2c' | 'v3';
  community: string;
  securityName?: string;
  securityLevel?: 'noAuthNoPriv' | 'authNoPriv' | 'authPriv';
  authProtocol?: 'MD5' | 'SHA' | 'SHA256' | 'SHA512';
  authPassword?: string;
  privProtocol?: 'DES' | 'AES' | 'AES192' | 'AES256';
  privPassword?: string;
  // SSH credentials
  sshUsername?: string;
  sshPassword?: string;
  sshPort?: number;
}

export type ViewState = 'dashboard' | 'mibs' | 'devices' | 'generator' | 'settings';
export type CollectorType = 'snmp-exporter' | 'telegraf' | 'categraf';

export enum DetailTab {
  OVERVIEW = 'overview',
  CODE_GEN = 'code_gen',
  SIMULATOR = 'simulator'
}

// SSH related types
export type DeviceBrand = 'generic' | 'huawei' | 'cisco' | 'h3c' | 'juniper' | 'arista' | 'fortinet' | 'mikrotik' | 'dell' | 'hp';

export interface SSHTestRequest {
  host: string;
  port?: number;
  username: string;
  password: string;
}

export interface SNMPStatus {
  running: boolean;
  message: string;
  config: string;
  community?: string;
  version?: string;
  securityName?: string;
}

export interface SNMPConfig {
  version: 'v2c' | 'v3';
  community: string;
  securityName?: string;
  authProtocol?: 'MD5' | 'SHA' | 'SHA256' | 'SHA512';
  authPassword?: string;
  privProtocol?: 'DES' | 'AES' | 'AES192' | 'AES256';
  privPassword?: string;
  location?: string;
  contact?: string;
  sysName?: string;
}
