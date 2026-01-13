package snmp

import (
	"fmt"
	"strings"
	"time"

	"github.com/gosnmp/gosnmp"
	"snmp-mib-explorer/internal/model"
)

type Client struct {
	device *model.Device
}

func NewClient(device *model.Device) *Client {
	return &Client{device: device}
}

func (c *Client) buildGoSNMP() *gosnmp.GoSNMP {
	snmp := &gosnmp.GoSNMP{
		Target:    c.device.IP,
		Port:      uint16(c.device.Port),
		Community: c.device.Community,
		Timeout:   time.Duration(10) * time.Second,
		Retries:   2,
	}

	switch c.device.Version {
	case "v1":
		snmp.Version = gosnmp.Version1
	case "v2c":
		snmp.Version = gosnmp.Version2c
	case "v3":
		snmp.Version = gosnmp.Version3
		snmp.SecurityModel = gosnmp.UserSecurityModel
		snmp.MsgFlags = getMsgFlags(c.device.SecurityLevel)
		snmp.SecurityParameters = &gosnmp.UsmSecurityParameters{
			UserName:                 c.device.SecurityName,
			AuthenticationProtocol:   getAuthProtocol(c.device.AuthProtocol),
			AuthenticationPassphrase: c.device.AuthPassword,
			PrivacyProtocol:          getPrivProtocol(c.device.PrivProtocol),
			PrivacyPassphrase:        c.device.PrivPassword,
		}
	default:
		snmp.Version = gosnmp.Version2c
	}

	return snmp
}

func getMsgFlags(level string) gosnmp.SnmpV3MsgFlags {
	switch level {
	case "authNoPriv":
		return gosnmp.AuthNoPriv
	case "authPriv":
		return gosnmp.AuthPriv
	default:
		return gosnmp.NoAuthNoPriv
	}
}

func getAuthProtocol(proto string) gosnmp.SnmpV3AuthProtocol {
	switch proto {
	case "MD5":
		return gosnmp.MD5
	case "SHA":
		return gosnmp.SHA
	case "SHA256":
		return gosnmp.SHA256
	case "SHA512":
		return gosnmp.SHA512
	default:
		return gosnmp.NoAuth
	}
}

func getPrivProtocol(proto string) gosnmp.SnmpV3PrivProtocol {
	switch proto {
	case "DES":
		return gosnmp.DES
	case "AES":
		return gosnmp.AES
	case "AES192":
		return gosnmp.AES192
	case "AES256":
		return gosnmp.AES256
	default:
		return gosnmp.NoPriv
	}
}

type SnmpResult struct {
	OID      string `json:"oid"`
	Type     string `json:"type"`
	Value    string `json:"value"`
	RawValue any    `json:"rawValue,omitempty"`
}

func (c *Client) Get(oids []string) ([]SnmpResult, error) {
	snmp := c.buildGoSNMP()
	if err := snmp.Connect(); err != nil {
		return nil, fmt.Errorf("connect failed: %w", err)
	}
	defer snmp.Conn.Close()

	result, err := snmp.Get(oids)
	if err != nil {
		return nil, fmt.Errorf("get failed: %w", err)
	}

	return parseVariables(result.Variables), nil
}

func (c *Client) Walk(oid string) ([]SnmpResult, error) {
	snmp := c.buildGoSNMP()
	if err := snmp.Connect(); err != nil {
		return nil, fmt.Errorf("connect failed: %w", err)
	}
	defer snmp.Conn.Close()

	var results []SnmpResult
	err := snmp.Walk(oid, func(pdu gosnmp.SnmpPDU) error {
		results = append(results, parsePDU(pdu))
		return nil
	})
	if err != nil {
		return nil, fmt.Errorf("walk failed: %w", err)
	}

	return results, nil
}

func (c *Client) BulkWalk(oid string) ([]SnmpResult, error) {
	snmp := c.buildGoSNMP()
	if snmp.Version == gosnmp.Version1 {
		return c.Walk(oid)
	}

	if err := snmp.Connect(); err != nil {
		return nil, fmt.Errorf("connect failed: %w", err)
	}
	defer snmp.Conn.Close()

	var results []SnmpResult
	err := snmp.BulkWalk(oid, func(pdu gosnmp.SnmpPDU) error {
		results = append(results, parsePDU(pdu))
		return nil
	})
	if err != nil {
		return nil, fmt.Errorf("bulk walk failed: %w", err)
	}

	return results, nil
}

func parseVariables(variables []gosnmp.SnmpPDU) []SnmpResult {
	results := make([]SnmpResult, 0, len(variables))
	for _, v := range variables {
		results = append(results, parsePDU(v))
	}
	return results
}

func parsePDU(pdu gosnmp.SnmpPDU) SnmpResult {
	result := SnmpResult{
		OID:      pdu.Name,
		RawValue: pdu.Value,
	}

	switch pdu.Type {
	case gosnmp.OctetString:
		result.Type = "OctetString"
		if bytes, ok := pdu.Value.([]byte); ok {
			if isPrintable(bytes) {
				result.Value = string(bytes)
			} else {
				result.Value = fmt.Sprintf("0x%X", bytes)
			}
		}
	case gosnmp.Integer:
		result.Type = "Integer"
		result.Value = fmt.Sprintf("%d", pdu.Value)
	case gosnmp.Counter32:
		result.Type = "Counter32"
		result.Value = fmt.Sprintf("%d", pdu.Value)
	case gosnmp.Counter64:
		result.Type = "Counter64"
		result.Value = fmt.Sprintf("%d", pdu.Value)
	case gosnmp.Gauge32:
		result.Type = "Gauge32"
		result.Value = fmt.Sprintf("%d", pdu.Value)
	case gosnmp.TimeTicks:
		result.Type = "TimeTicks"
		result.Value = fmt.Sprintf("%d", pdu.Value)
	case gosnmp.ObjectIdentifier:
		result.Type = "OID"
		result.Value = fmt.Sprintf("%v", pdu.Value)
	case gosnmp.IPAddress:
		result.Type = "IPAddress"
		result.Value = fmt.Sprintf("%s", pdu.Value)
	case gosnmp.Null:
		result.Type = "Null"
		result.Value = ""
	case gosnmp.NoSuchObject:
		result.Type = "NoSuchObject"
		result.Value = "No Such Object"
	case gosnmp.NoSuchInstance:
		result.Type = "NoSuchInstance"
		result.Value = "No Such Instance"
	default:
		result.Type = fmt.Sprintf("Unknown(%d)", pdu.Type)
		result.Value = fmt.Sprintf("%v", pdu.Value)
	}

	return result
}

func isPrintable(bytes []byte) bool {
	for _, b := range bytes {
		if b < 32 || b > 126 {
			if b != '\n' && b != '\r' && b != '\t' {
				return false
			}
		}
	}
	return true
}

// TestConnection tests if the device is reachable via SNMP
func (c *Client) TestConnection() error {
	snmp := c.buildGoSNMP()
	if err := snmp.Connect(); err != nil {
		if strings.Contains(err.Error(), "timeout") || strings.Contains(err.Error(), "i/o timeout") {
			return fmt.Errorf("连接超时 - 设备 %s:%d 无法访问，请检查网络连接和防火墙设置", c.device.IP, c.device.Port)
		}
		if strings.Contains(err.Error(), "connection refused") {
			return fmt.Errorf("连接被拒绝 - 设备 %s:%d 可能未启用 SNMP 服务或端口配置错误", c.device.IP, c.device.Port)
		}
		if strings.Contains(err.Error(), "no route to host") {
			return fmt.Errorf("无法到达主机 - 设备 %s:%d 网络不可达，请检查路由配置", c.device.IP, c.device.Port)
		}
		return fmt.Errorf("连接失败: %w", err)
	}
	defer snmp.Conn.Close()

	// Try to get sysDescr
	oids := []string{".1.3.6.1.2.1.1.1.0"}
	result, err := snmp.Get(oids)
	if err != nil {
		if strings.Contains(err.Error(), "timeout") {
			return fmt.Errorf("SNMP 请求超时 - 设备 %s:%d 响应超时，可能是设备负载过高或网络延迟", c.device.IP, c.device.Port)
		}
		if strings.Contains(err.Error(), "authentication failure") || strings.Contains(err.Error(), "auth") {
			if c.device.Version == "v3" {
				return fmt.Errorf("认证失败 - SNMP v3 认证信息不正确，请检查用户名、密码和加密协议配置")
			}
			return fmt.Errorf("认证失败 - Community 字符串 '%s' 不正确", c.device.Community)
		}
		if strings.Contains(err.Error(), "authorization") {
			return fmt.Errorf("授权失败 - 设备 %s:%d 拒绝访问，请检查 SNMP 访问控制列表配置", c.device.IP, c.device.Port)
		}
		return fmt.Errorf("SNMP 查询失败: %w", err)
	}

	// 检查返回结果
	if len(result.Variables) == 0 || result.Variables[0].Type == gosnmp.NoSuchObject || result.Variables[0].Type == gosnmp.NoSuchInstance {
		return fmt.Errorf("设备响应异常 - 设备 %s:%d 不支持 sysDescr OID，可能是非标准 SNMP 设备", c.device.IP, c.device.Port)
	}

	return nil
}
