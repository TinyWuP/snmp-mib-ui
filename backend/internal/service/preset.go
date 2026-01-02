package service

import "snmp-mib-explorer/internal/model"

type PresetService struct{}

func NewPresetService() *PresetService {
	return &PresetService{}
}

type MibPreset struct {
	ID          string           `json:"id"`
	Category    string           `json:"category"` // Standard, Vendor, Cloud
	Name        string           `json:"name"`
	Description string           `json:"description"`
	Nodes       []model.MibNode  `json:"nodes"`
}

type QuickOID struct {
	Name   string `json:"name"`
	OID    string `json:"oid"`
	Vendor string `json:"vendor"`
}

func (s *PresetService) GetPresets() []MibPreset {
	return []MibPreset{
		{
			ID:          "rfc1213-mib",
			Category:    "Standard",
			Name:        "RFC1213-MIB (System)",
			Description: "标准 SNMP MIB-II 核心节点，包含设备描述、运行时间及联系信息。",
			Nodes: []model.MibNode{
				{
					Name:        "system",
					OID:         "1.3.6.1.2.1.1",
					Description: "System-specific information",
					Children: []model.MibNode{
						{Name: "sysDescr", OID: "1.3.6.1.2.1.1.1", Syntax: "DisplayString", Access: "read-only", Children: []model.MibNode{}},
						{Name: "sysObjectID", OID: "1.3.6.1.2.1.1.2", Syntax: "OBJECT IDENTIFIER", Access: "read-only", Children: []model.MibNode{}},
						{Name: "sysUpTime", OID: "1.3.6.1.2.1.1.3", Syntax: "TimeTicks", Access: "read-only", Children: []model.MibNode{}},
						{Name: "sysContact", OID: "1.3.6.1.2.1.1.4", Syntax: "DisplayString", Access: "read-write", Children: []model.MibNode{}},
						{Name: "sysName", OID: "1.3.6.1.2.1.1.5", Syntax: "DisplayString", Access: "read-write", Children: []model.MibNode{}},
						{Name: "sysLocation", OID: "1.3.6.1.2.1.1.6", Syntax: "DisplayString", Access: "read-write", Children: []model.MibNode{}},
						{Name: "sysServices", OID: "1.3.6.1.2.1.1.7", Syntax: "INTEGER", Access: "read-only", Children: []model.MibNode{}},
					},
				},
				{
					Name:        "interfaces",
					OID:         "1.3.6.1.2.1.2",
					Description: "Interface table and statistics",
					Children: []model.MibNode{
						{Name: "ifNumber", OID: "1.3.6.1.2.1.2.1", Syntax: "Integer", Access: "read-only", Children: []model.MibNode{}},
						{Name: "ifTable", OID: "1.3.6.1.2.1.2.2", Syntax: "SEQUENCE OF IfEntry", Access: "not-accessible", Children: []model.MibNode{}},
					},
				},
			},
		},
		{
			ID:          "if-mib",
			Category:    "Standard",
			Name:        "IF-MIB (Interfaces)",
			Description: "网络接口扩展 MIB，提供详细的接口统计信息。",
			Nodes: []model.MibNode{
				{
					Name:        "ifMIBObjects",
					OID:         "1.3.6.1.2.1.31.1",
					Description: "Interface MIB objects",
					Children: []model.MibNode{
						{Name: "ifXTable", OID: "1.3.6.1.2.1.31.1.1", Description: "Extended interface table", Children: []model.MibNode{
							{Name: "ifName", OID: "1.3.6.1.2.1.31.1.1.1.1", Syntax: "DisplayString", Access: "read-only", Children: []model.MibNode{}},
							{Name: "ifHCInOctets", OID: "1.3.6.1.2.1.31.1.1.1.6", Syntax: "Counter64", Access: "read-only", Children: []model.MibNode{}},
							{Name: "ifHCOutOctets", OID: "1.3.6.1.2.1.31.1.1.1.10", Syntax: "Counter64", Access: "read-only", Children: []model.MibNode{}},
							{Name: "ifHighSpeed", OID: "1.3.6.1.2.1.31.1.1.1.15", Syntax: "Gauge32", Access: "read-only", Children: []model.MibNode{}},
							{Name: "ifAlias", OID: "1.3.6.1.2.1.31.1.1.1.18", Syntax: "DisplayString", Access: "read-write", Children: []model.MibNode{}},
						}},
					},
				},
			},
		},
		{
			ID:          "host-resources",
			Category:    "Standard",
			Name:        "HOST-RESOURCES-MIB",
			Description: "用于监控主机的 CPU、内存、存储使用率及进程列表。",
			Nodes: []model.MibNode{
				{
					Name: "hrSystem",
					OID:  "1.3.6.1.2.1.25.1",
					Children: []model.MibNode{
						{Name: "hrSystemUptime", OID: "1.3.6.1.2.1.25.1.1", Syntax: "TimeTicks", Access: "read-only", Children: []model.MibNode{}},
						{Name: "hrSystemDate", OID: "1.3.6.1.2.1.25.1.2", Syntax: "DateAndTime", Access: "read-write", Children: []model.MibNode{}},
						{Name: "hrSystemNumUsers", OID: "1.3.6.1.2.1.25.1.5", Syntax: "Gauge32", Access: "read-only", Children: []model.MibNode{}},
						{Name: "hrSystemProcesses", OID: "1.3.6.1.2.1.25.1.6", Syntax: "Gauge32", Access: "read-only", Children: []model.MibNode{}},
						{Name: "hrSystemMaxProcesses", OID: "1.3.6.1.2.1.25.1.7", Syntax: "INTEGER", Access: "read-only", Children: []model.MibNode{}},
					},
				},
				{
					Name: "hrStorage",
					OID:  "1.3.6.1.2.1.25.2",
					Children: []model.MibNode{
						{Name: "hrMemorySize", OID: "1.3.6.1.2.1.25.2.2", Syntax: "KBytes", Access: "read-only", Children: []model.MibNode{}},
						{Name: "hrStorageTable", OID: "1.3.6.1.2.1.25.2.3", Description: "Storage table", Children: []model.MibNode{
							{Name: "hrStorageDescr", OID: "1.3.6.1.2.1.25.2.3.1.3", Syntax: "DisplayString", Access: "read-only", Children: []model.MibNode{}},
							{Name: "hrStorageAllocationUnits", OID: "1.3.6.1.2.1.25.2.3.1.4", Syntax: "INTEGER", Access: "read-only", Children: []model.MibNode{}},
							{Name: "hrStorageSize", OID: "1.3.6.1.2.1.25.2.3.1.5", Syntax: "INTEGER", Access: "read-only", Children: []model.MibNode{}},
							{Name: "hrStorageUsed", OID: "1.3.6.1.2.1.25.2.3.1.6", Syntax: "INTEGER", Access: "read-only", Children: []model.MibNode{}},
						}},
					},
				},
				{
					Name: "hrDevice",
					OID:  "1.3.6.1.2.1.25.3",
					Children: []model.MibNode{
						{Name: "hrProcessorTable", OID: "1.3.6.1.2.1.25.3.3", Description: "CPU processor table", Children: []model.MibNode{
							{Name: "hrProcessorLoad", OID: "1.3.6.1.2.1.25.3.3.1.2", Syntax: "INTEGER (0..100)", Access: "read-only", Description: "CPU utilization percentage", Children: []model.MibNode{}},
						}},
					},
				},
			},
		},
		{
			ID:          "cisco-envmon",
			Category:    "Vendor",
			Name:        "CISCO-ENVMON-MIB",
			Description: "Cisco 设备环境监控：温度、风扇状态及电源功率。",
			Nodes: []model.MibNode{
				{
					Name: "ciscoEnvMonObjects",
					OID:  "1.3.6.1.4.1.9.9.13.1",
					Children: []model.MibNode{
						{Name: "ciscoEnvMonVoltageStatusTable", OID: "1.3.6.1.4.1.9.9.13.1.2", Description: "Voltage sensor table", Children: []model.MibNode{}},
						{Name: "ciscoEnvMonTemperatureStatusTable", OID: "1.3.6.1.4.1.9.9.13.1.3", Description: "Temperature sensor table", Children: []model.MibNode{
							{Name: "ciscoEnvMonTemperatureStatusValue", OID: "1.3.6.1.4.1.9.9.13.1.3.1.3", Syntax: "Gauge32", Access: "read-only", Children: []model.MibNode{}},
							{Name: "ciscoEnvMonTemperatureState", OID: "1.3.6.1.4.1.9.9.13.1.3.1.6", Syntax: "CiscoEnvMonState", Access: "read-only", Children: []model.MibNode{}},
						}},
						{Name: "ciscoEnvMonFanStatusTable", OID: "1.3.6.1.4.1.9.9.13.1.4", Description: "Fan status table", Children: []model.MibNode{
							{Name: "ciscoEnvMonFanState", OID: "1.3.6.1.4.1.9.9.13.1.4.1.3", Syntax: "CiscoEnvMonState", Access: "read-only", Children: []model.MibNode{}},
						}},
						{Name: "ciscoEnvMonSupplyStatusTable", OID: "1.3.6.1.4.1.9.9.13.1.5", Description: "Power supply table", Children: []model.MibNode{}},
					},
				},
			},
		},
		{
			ID:          "cisco-process",
			Category:    "Vendor",
			Name:        "CISCO-PROCESS-MIB",
			Description: "Cisco 设备 CPU 和内存使用率监控。",
			Nodes: []model.MibNode{
				{
					Name: "cpmCPUTotalTable",
					OID:  "1.3.6.1.4.1.9.9.109.1.1.1",
					Description: "CPU usage table",
					Children: []model.MibNode{
						{Name: "cpmCPUTotal5sec", OID: "1.3.6.1.4.1.9.9.109.1.1.1.1.3", Syntax: "Gauge32", Access: "read-only", Description: "CPU busy % in last 5 seconds", Children: []model.MibNode{}},
						{Name: "cpmCPUTotal1min", OID: "1.3.6.1.4.1.9.9.109.1.1.1.1.4", Syntax: "Gauge32", Access: "read-only", Description: "CPU busy % in last 1 minute", Children: []model.MibNode{}},
						{Name: "cpmCPUTotal5min", OID: "1.3.6.1.4.1.9.9.109.1.1.1.1.5", Syntax: "Gauge32", Access: "read-only", Description: "CPU busy % in last 5 minutes", Children: []model.MibNode{}},
						{Name: "cpmCPUMemoryUsed", OID: "1.3.6.1.4.1.9.9.109.1.1.1.1.12", Syntax: "Gauge32", Access: "read-only", Description: "Memory used in bytes", Children: []model.MibNode{}},
						{Name: "cpmCPUMemoryFree", OID: "1.3.6.1.4.1.9.9.109.1.1.1.1.13", Syntax: "Gauge32", Access: "read-only", Description: "Memory free in bytes", Children: []model.MibNode{}},
					},
				},
			},
		},
		{
			ID:          "huawei-entity",
			Category:    "Vendor",
			Name:        "HUAWEI-ENTITY-EXTENT-MIB",
			Description: "华为设备实体扩展 MIB，包含 CPU、内存、温度等。",
			Nodes: []model.MibNode{
				{
					Name: "hwEntityExtObjects",
					OID:  "1.3.6.1.4.1.2011.5.25.31.1",
					Children: []model.MibNode{
						{Name: "hwEntityExtCpuUsage", OID: "1.3.6.1.4.1.2011.5.25.31.1.1.1.1.5", Syntax: "INTEGER", Access: "read-only", Description: "CPU usage percentage", Children: []model.MibNode{}},
						{Name: "hwEntityExtMemUsage", OID: "1.3.6.1.4.1.2011.5.25.31.1.1.1.1.7", Syntax: "INTEGER", Access: "read-only", Description: "Memory usage percentage", Children: []model.MibNode{}},
						{Name: "hwEntityExtTemperature", OID: "1.3.6.1.4.1.2011.5.25.31.1.1.1.1.11", Syntax: "INTEGER", Access: "read-only", Description: "Temperature in Celsius", Children: []model.MibNode{}},
					},
				},
			},
		},
		{
			ID:          "ucd-snmp",
			Category:    "Vendor",
			Name:        "UCD-SNMP-MIB (Net-SNMP)",
			Description: "Linux/Unix Net-SNMP 扩展，用于系统负载、内存、磁盘监控。",
			Nodes: []model.MibNode{
				{
					Name: "memory",
					OID:  "1.3.6.1.4.1.2021.4",
					Description: "Memory statistics",
					Children: []model.MibNode{
						{Name: "memTotalSwap", OID: "1.3.6.1.4.1.2021.4.3", Syntax: "INTEGER", Access: "read-only", Children: []model.MibNode{}},
						{Name: "memAvailSwap", OID: "1.3.6.1.4.1.2021.4.4", Syntax: "INTEGER", Access: "read-only", Children: []model.MibNode{}},
						{Name: "memTotalReal", OID: "1.3.6.1.4.1.2021.4.5", Syntax: "INTEGER", Access: "read-only", Children: []model.MibNode{}},
						{Name: "memAvailReal", OID: "1.3.6.1.4.1.2021.4.6", Syntax: "INTEGER", Access: "read-only", Children: []model.MibNode{}},
						{Name: "memTotalFree", OID: "1.3.6.1.4.1.2021.4.11", Syntax: "INTEGER", Access: "read-only", Children: []model.MibNode{}},
						{Name: "memBuffer", OID: "1.3.6.1.4.1.2021.4.14", Syntax: "INTEGER", Access: "read-only", Children: []model.MibNode{}},
						{Name: "memCached", OID: "1.3.6.1.4.1.2021.4.15", Syntax: "INTEGER", Access: "read-only", Children: []model.MibNode{}},
					},
				},
				{
					Name: "laTable",
					OID:  "1.3.6.1.4.1.2021.10",
					Description: "Load average table",
					Children: []model.MibNode{
						{Name: "laLoad", OID: "1.3.6.1.4.1.2021.10.1.3", Syntax: "DisplayString", Access: "read-only", Description: "Load average (1, 5, 15 min)", Children: []model.MibNode{}},
					},
				},
				{
					Name: "dskTable",
					OID:  "1.3.6.1.4.1.2021.9",
					Description: "Disk usage table",
					Children: []model.MibNode{
						{Name: "dskPath", OID: "1.3.6.1.4.1.2021.9.1.2", Syntax: "DisplayString", Access: "read-only", Children: []model.MibNode{}},
						{Name: "dskTotal", OID: "1.3.6.1.4.1.2021.9.1.6", Syntax: "INTEGER", Access: "read-only", Children: []model.MibNode{}},
						{Name: "dskAvail", OID: "1.3.6.1.4.1.2021.9.1.7", Syntax: "INTEGER", Access: "read-only", Children: []model.MibNode{}},
						{Name: "dskUsed", OID: "1.3.6.1.4.1.2021.9.1.8", Syntax: "INTEGER", Access: "read-only", Children: []model.MibNode{}},
						{Name: "dskPercent", OID: "1.3.6.1.4.1.2021.9.1.9", Syntax: "INTEGER", Access: "read-only", Children: []model.MibNode{}},
					},
				},
			},
		},
	}
}

func (s *PresetService) GetQuickOIDs() []QuickOID {
	return []QuickOID{
		{Name: "系统描述", OID: "1.3.6.1.2.1.1.1.0", Vendor: "Standard"},
		{Name: "系统运行时间", OID: "1.3.6.1.2.1.1.3.0", Vendor: "Standard"},
		{Name: "系统名称", OID: "1.3.6.1.2.1.1.5.0", Vendor: "Standard"},
		{Name: "接口数量", OID: "1.3.6.1.2.1.2.1.0", Vendor: "Standard"},
		{Name: "接口入流量", OID: "1.3.6.1.2.1.2.2.1.10", Vendor: "Standard"},
		{Name: "接口出流量", OID: "1.3.6.1.2.1.2.2.1.16", Vendor: "Standard"},
		{Name: "CPU负载(5min)", OID: "1.3.6.1.4.1.9.9.109.1.1.1.1.5", Vendor: "Cisco"},
		{Name: "内存使用", OID: "1.3.6.1.4.1.9.9.109.1.1.1.1.12", Vendor: "Cisco"},
		{Name: "风扇状态", OID: "1.3.6.1.4.1.9.9.13.1.4.1.3", Vendor: "Cisco"},
		{Name: "温度值", OID: "1.3.6.1.4.1.9.9.13.1.3.1.3", Vendor: "Cisco"},
		{Name: "内存空闲", OID: "1.3.6.1.4.1.2021.4.11.0", Vendor: "Linux/Net-SNMP"},
		{Name: "系统负载(1min)", OID: "1.3.6.1.4.1.2021.10.1.3.1", Vendor: "Linux/Net-SNMP"},
		{Name: "磁盘使用率", OID: "1.3.6.1.4.1.2021.9.1.9", Vendor: "Linux/Net-SNMP"},
		{Name: "CPU使用率", OID: "1.3.6.1.4.1.2011.5.25.31.1.1.1.1.5", Vendor: "Huawei"},
		{Name: "设备序列号", OID: "1.3.6.1.2.1.47.1.1.1.1.11", Vendor: "Entity-MIB"},
	}
}
