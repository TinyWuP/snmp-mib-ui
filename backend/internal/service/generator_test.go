package service

import (
	"strings"
	"testing"

	"snmp-mib-explorer/internal/model"
)

func TestGenerateConfig_SnmpExporter(t *testing.T) {
	service := NewGeneratorService()

	req := &GenerateConfigRequest{
		Collector: "snmp-exporter",
		Version:   "v2c",
		Nodes: []model.MibNode{
			{
				Name:        "sysDescr",
				OID:         "1.3.6.1.2.1.1.1",
				Description: "System description",
				Type:        "OctetString",
			},
			{
				Name:        "sysUpTime",
				OID:         "1.3.6.1.2.1.1.3",
				Description: "System uptime",
				Type:        "TimeTicks",
			},
		},
		Community: "public",
		MibRoot:   "/usr/share/snmp/mibs",
	}

	result := service.GenerateConfig(req)

	// Verify basic structure
	if !strings.Contains(result, "modules:") {
		t.Error("Expected 'modules:' in output")
	}
	if !strings.Contains(result, "default:") {
		t.Error("Expected 'default:' in output")
	}
	if !strings.Contains(result, "walk:") {
		t.Error("Expected 'walk:' in output")
	}
	if !strings.Contains(result, "metrics:") {
		t.Error("Expected 'metrics:' in output")
	}

	// Verify OID entries
	if !strings.Contains(result, "1.3.6.1.2.1.1.1") {
		t.Error("Expected OID 1.3.6.1.2.1.1.1 in output")
	}
	if !strings.Contains(result, "1.3.6.1.2.1.1.3") {
		t.Error("Expected OID 1.3.6.1.2.1.1.3 in output")
	}

	// Verify metric names
	if !strings.Contains(result, "name: sysdescr") {
		t.Error("Expected metric name 'sysdescr' in output")
	}
	if !strings.Contains(result, "name: sysuptime") {
		t.Error("Expected metric name 'sysuptime' in output")
	}

	// Verify community
	if !strings.Contains(result, "community: public") {
		t.Error("Expected 'community: public' in output")
	}
}

func TestGenerateConfig_Telegraf(t *testing.T) {
	service := NewGeneratorService()

	req := &GenerateConfigRequest{
		Collector: "telegraf",
		Version:   "v2c",
		Nodes: []model.MibNode{
			{
				Name:        "ifInOctets",
				OID:         "1.3.6.1.2.1.2.2.1.10",
				Description: "Interface input octets",
			},
		},
		Community: "private",
		Devices: []DeviceInfo{
			{
				Name:      "router1",
				IP:        "192.168.1.1",
				Port:      161,
				Community: "private",
				Version:   "v2c",
			},
		},
	}

	result := service.GenerateConfig(req)

	// Verify basic structure
	if !strings.Contains(result, "[[inputs.snmp]]") {
		t.Error("Expected '[[inputs.snmp]]' in output")
	}

	// Verify device configuration
	if !strings.Contains(result, "192.168.1.1") {
		t.Error("Expected device IP 192.168.1.1 in output")
	}

	// Verify community
	if !strings.Contains(result, `community = "private"`) {
		t.Error("Expected community 'private' in output")
	}

	// Verify OID field
	if !strings.Contains(result, "1.3.6.1.2.1.2.2.1.10") {
		t.Error("Expected OID in output")
	}
}

func TestGenerateConfig_Categraf(t *testing.T) {
	service := NewGeneratorService()

	req := &GenerateConfigRequest{
		Collector: "categraf",
		Version:   "v2c",
		Nodes: []model.MibNode{
			{
				Name: "cpuUsage",
				OID:  "1.3.6.1.4.1.2011.6.3.4.1.2",
			},
		},
		Community: "public",
		Devices: []DeviceInfo{
			{
				Name: "switch1",
				IP:   "10.0.0.1",
				Port: 161,
			},
		},
	}

	result := service.GenerateConfig(req)

	// Verify basic structure
	if !strings.Contains(result, "[[instances]]") {
		t.Error("Expected '[[instances]]' in output")
	}

	// Verify device configuration
	if !strings.Contains(result, "10.0.0.1") {
		t.Error("Expected device IP 10.0.0.1 in output")
	}

	// Verify community
	if !strings.Contains(result, `community = "public"`) {
		t.Error("Expected community 'public' in output")
	}
}

func TestGenerateConfig_UnknownCollector(t *testing.T) {
	service := NewGeneratorService()

	req := &GenerateConfigRequest{
		Collector: "unknown-collector",
		Version:   "v2c",
		Nodes:     []model.MibNode{},
	}

	result := service.GenerateConfig(req)

	expected := "# Unknown collector type: unknown-collector"
	if result != expected {
		t.Errorf("Expected '%s', got '%s'", expected, result)
	}
}

func TestGenerateConfig_DefaultCommunity(t *testing.T) {
	service := NewGeneratorService()

	req := &GenerateConfigRequest{
		Collector: "snmp-exporter",
		Version:   "v2c",
		Nodes: []model.MibNode{
			{Name: "test", OID: "1.2.3"},
		},
		Community: "", // Empty community should default to "public"
	}

	result := service.GenerateConfig(req)

	if !strings.Contains(result, "community: public") {
		t.Error("Expected default community 'public' when empty string is provided")
	}
}

func TestGenerateCode_Python(t *testing.T) {
	service := NewGeneratorService()

	req := &GenerateCodeRequest{
		Node: model.MibNode{
			Name:        "sysDescr",
			OID:         "1.3.6.1.2.1.1.1",
			Description: "System description",
		},
		Language: "python",
	}

	result := service.GenerateCode(req)

	// Verify Python code structure
	if !strings.Contains(result, "pysnmp.hlapi") {
		t.Error("Expected pysnmp import in Python code")
	}
	if !strings.Contains(result, "def snmp_get") {
		t.Error("Expected snmp_get function in Python code")
	}
	if !strings.Contains(result, req.Node.OID) {
		t.Error("Expected OID in Python code")
	}
	if !strings.Contains(result, req.Node.Name) {
		t.Error("Expected node name in Python code")
	}
}

func TestGenerateCode_JavaScript(t *testing.T) {
	service := NewGeneratorService()

	req := &GenerateCodeRequest{
		Node: model.MibNode{
			Name: "sysUpTime",
			OID:  "1.3.6.1.2.1.1.3",
		},
		Language: "javascript",
	}

	result := service.GenerateCode(req)

	// Verify JavaScript code structure
	if !strings.Contains(result, "net-snmp") {
		t.Error("Expected net-snmp import in JavaScript code")
	}
	if !strings.Contains(result, "function snmpGet") {
		t.Error("Expected snmpGet function in JavaScript code")
	}
	if !strings.Contains(result, req.Node.OID) {
		t.Error("Expected OID in JavaScript code")
	}
}

func TestGenerateCode_Go(t *testing.T) {
	service := NewGeneratorService()

	req := &GenerateCodeRequest{
		Node: model.MibNode{
			Name: "ifInOctets",
			OID:  "1.3.6.1.2.1.2.2.1.10",
		},
		Language: "go",
	}

	result := service.GenerateCode(req)

	// Verify Go code structure
	if !strings.Contains(result, "github.com/gosnmp/gosnmp") {
		t.Error("Expected gosnmp import in Go code")
	}
	if !strings.Contains(result, "package main") {
		t.Error("Expected package main in Go code")
	}
	if !strings.Contains(result, "func main()") {
		t.Error("Expected main function in Go code")
	}
	if !strings.Contains(result, req.Node.OID) {
		t.Error("Expected OID in Go code")
	}
}

func TestGenerateCode_Java(t *testing.T) {
	service := NewGeneratorService()

	req := &GenerateCodeRequest{
		Node: model.MibNode{
			Name: "cpuUsage",
			OID:  "1.3.6.1.4.1.2011.6.3.4.1.2",
		},
		Language: "java",
	}

	result := service.GenerateCode(req)

	// Verify Java code structure
	if !strings.Contains(result, "org.snmp4j") {
		t.Error("Expected snmp4j import in Java code")
	}
	if !strings.Contains(result, "public class SnmpQuery") {
		t.Error("Expected SnmpQuery class in Java code")
	}
	if !strings.Contains(result, "public static void main") {
		t.Error("Expected main method in Java code")
	}
	if !strings.Contains(result, req.Node.OID) {
		t.Error("Expected OID in Java code")
	}
}

func TestGenerateCode_Shell(t *testing.T) {
	service := NewGeneratorService()

	req := &GenerateCodeRequest{
		Node: model.MibNode{
			Name: "sysDescr",
			OID:  "1.3.6.1.2.1.1.1",
		},
		Language: "shell",
	}

	result := service.GenerateCode(req)

	// Verify Shell code structure
	if !strings.Contains(result, "snmpget") {
		t.Error("Expected snmpget command in Shell code")
	}
	if !strings.Contains(result, "snmpwalk") {
		t.Error("Expected snmpwalk command in Shell code")
	}
	if !strings.Contains(result, req.Node.OID) {
		t.Error("Expected OID in Shell code")
	}
}

func TestGenerateCode_UnknownLanguage(t *testing.T) {
	service := NewGeneratorService()

	req := &GenerateCodeRequest{
		Node:     model.MibNode{Name: "test", OID: "1.2.3"},
		Language: "unknown",
	}

	result := service.GenerateCode(req)

	expected := "// Unsupported language: unknown"
	if result != expected {
		t.Errorf("Expected '%s', got '%s'", expected, result)
	}
}

func TestSanitizeName(t *testing.T) {
	tests := []struct {
		input    string
		expected string
	}{
		{"sysDescr", "sysdescr"},
		{"ifInOctets", "ifinoctets"},
		{"cpu-usage", "cpu_usage"},
		{"memory.total", "memory_total"},
		{"disk_IO", "disk_io"},
		{"special!@#$%^&*()", "special"},
		{"__test__", "test"},
		{"multiple___underscores", "multiple_underscores"},
	}

	for _, tt := range tests {
		result := sanitizeName(tt.input)
		if result != tt.expected {
			t.Errorf("sanitizeName(%q) = %q, expected %q", tt.input, result, tt.expected)
		}
	}
}

func TestGenerateConfig_SpecialCharactersInDescription(t *testing.T) {
	service := NewGeneratorService()

	req := &GenerateConfigRequest{
		Collector: "snmp-exporter",
		Version:   "v2c",
		Nodes: []model.MibNode{
			{
				Name:        "testMetric",
				OID:         "1.2.3.4",
				Description: `Test "description" with "quotes"`,
			},
		},
		Community: "public",
	}

	result := service.GenerateConfig(req)

	// Verify quotes are escaped
	if !strings.Contains(result, `Test \"description\" with \"quotes\"`) {
		t.Error("Expected quotes to be escaped in description")
	}
}
