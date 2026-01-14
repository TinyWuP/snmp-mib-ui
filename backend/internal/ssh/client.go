package ssh

import (
	"bytes"
	"fmt"
	"strings"
	"time"

	"golang.org/x/crypto/ssh"
)

// DeviceBrand 设备品牌枚举
type DeviceBrand string

const (
	BrandGeneric  DeviceBrand = "generic"  // 通用Linux
	BrandHuawei   DeviceBrand = "huawei"   // 华为
	BrandCisco    DeviceBrand = "cisco"    // 思科
	BrandH3C      DeviceBrand = "h3c"      // H3C
	BrandJuniper  DeviceBrand = "juniper"  // Juniper
	BrandArista   DeviceBrand = "arista"   // Arista
	BrandFortinet DeviceBrand = "fortinet" // Fortinet
	BrandMikroTik DeviceBrand = "mikrotik" // MikroTik
	BrandDell     DeviceBrand = "dell"     // 戴尔
	BrandHP       DeviceBrand = "hp"       // 惠普
)

// Client SSH客户端
type Client struct {
	host     string
	port     int
	username string
	password string
	brand    DeviceBrand
	client   *ssh.Client
}

// NewClient 创建SSH客户端
func NewClient(host, username, password string, port int) *Client {
	if port == 0 {
		port = 22
	}
	return &Client{
		host:     host,
		port:     port,
		username: username,
		password: password,
		brand:    BrandGeneric,
	}
}

// NewClientWithBrand 创建带品牌的SSH客户端
func NewClientWithBrand(host, username, password string, port int, brand DeviceBrand) *Client {
	if port == 0 {
		port = 22
	}
	return &Client{
		host:     host,
		port:     port,
		username: username,
		password: password,
		brand:    brand,
	}
}

// DetectBrand 检测设备品牌
func (c *Client) DetectBrand() (DeviceBrand, error) {
	if c.client == nil {
		return BrandGeneric, fmt.Errorf("SSH客户端未连接")
	}

	// 尝试获取系统信息
	stdout, _, err := c.Execute("show version 2>/dev/null || display version 2>/dev/null || cat /etc/os-release 2>/dev/null || uname -a")
	if err != nil {
		return BrandGeneric, nil
	}

	lowerOutput := strings.ToLower(stdout)

	// 检测华为设备
	if strings.Contains(lowerOutput, "huawei") || strings.Contains(lowerOutput, "vrp") {
		return BrandHuawei, nil
	}

	// 检测思科设备
	if strings.Contains(lowerOutput, "cisco") || strings.Contains(lowerOutput, "ios") {
		return BrandCisco, nil
	}

	// 检测H3C设备
	if strings.Contains(lowerOutput, "h3c") || strings.Contains(lowerOutput, "comware") {
		return BrandH3C, nil
	}

	// 检测Juniper设备
	if strings.Contains(lowerOutput, "juniper") || strings.Contains(lowerOutput, "junos") {
		return BrandJuniper, nil
	}

	// 检测Arista设备
	if strings.Contains(lowerOutput, "arista") || strings.Contains(lowerOutput, "eos") {
		return BrandArista, nil
	}

	// 检测Fortinet设备
	if strings.Contains(lowerOutput, "fortinet") || strings.Contains(lowerOutput, "fortios") {
		return BrandFortinet, nil
	}

	// 检测MikroTik设备
	if strings.Contains(lowerOutput, "mikrotik") || strings.Contains(lowerOutput, "routeros") {
		return BrandMikroTik, nil
	}

	// 检测戴尔设备
	if strings.Contains(lowerOutput, "dell") || strings.Contains(lowerOutput, "powerconnect") {
		return BrandDell, nil
	}

	// 检测惠普设备
	if strings.Contains(lowerOutput, "hp") || strings.Contains(lowerOutput, "hpe") {
		return BrandHP, nil
	}

	return BrandGeneric, nil
}

// Connect 连接到SSH服务器
func (c *Client) Connect() error {
	config := &ssh.ClientConfig{
		User: c.username,
		Auth: []ssh.AuthMethod{
			ssh.Password(c.password),
		},
		HostKeyCallback: ssh.InsecureIgnoreHostKey(),
		Timeout:         15 * time.Second,
	}

	address := fmt.Sprintf("%s:%d", c.host, c.port)
	client, err := ssh.Dial("tcp", address, config)
	if err != nil {
		return fmt.Errorf("SSH连接失败: %w", err)
	}

	c.client = client
	return nil
}

// Close 关闭SSH连接
func (c *Client) Close() error {
	if c.client != nil {
		return c.client.Close()
	}
	return nil
}

// Execute 执行命令并返回输出
func (c *Client) Execute(command string) (string, string, error) {
	if c.client == nil {
		return "", "", fmt.Errorf("SSH客户端未连接")
	}

	session, err := c.client.NewSession()
	if err != nil {
		return "", "", fmt.Errorf("创建SSH会话失败: %w", err)
	}
	defer session.Close()

	var stdout, stderr bytes.Buffer
	session.Stdout = &stdout
	session.Stderr = &stderr

	err = session.Run(command)
	return stdout.String(), stderr.String(), err
}

// CheckSNMPStatus 检查SNMP服务状态
func (c *Client) CheckSNMPStatus() (*SNMPStatus, error) {
	// 根据品牌选择检查方法
	switch c.brand {
	case BrandHuawei, BrandH3C:
		return c.checkSNMPStatusNetworkDevice()
	case BrandCisco:
		return c.checkSNMPStatusCisco()
	case BrandJuniper:
		return c.checkSNMPStatusJuniper()
	case BrandArista, BrandDell, BrandHP:
		return c.checkSNMPStatusNetworkDevice()
	case BrandFortinet:
		return c.checkSNMPStatusFortinet()
	case BrandMikroTik:
		return c.checkSNMPStatusMikroTik()
	default:
		return c.checkSNMPStatusGeneric()
	}
}

// checkSNMPStatusGeneric 通用Linux设备SNMP状态检查
func (c *Client) checkSNMPStatusGeneric() (*SNMPStatus, error) {
	// 检查SNMP服务是否运行
	stdout, stderr, err := c.Execute("systemctl is-active snmpd 2>/dev/null || service snmpd status 2>/dev/null || ps aux | grep snmpd | grep -v grep")
	if err != nil && stderr == "" {
		return &SNMPStatus{
			Running: false,
			Message: "SNMP服务未运行",
		}, nil
	}

	running := false
	message := "SNMP服务状态未知"

	if strings.Contains(stdout, "active") || strings.Contains(stdout, "running") {
		running = true
		message = "SNMP服务正在运行"
	}

	if !running && strings.Contains(stdout, "inactive") || strings.Contains(stdout, "stopped") {
		running = false
		message = "SNMP服务已停止"
	}

	// 获取SNMP配置
	configOutput, _, _ := c.Execute("cat /etc/snmp/snmpd.conf 2>/dev/null || cat /etc/snmp/snmp.conf 2>/dev/null")

	status := &SNMPStatus{
		Running: running,
		Message: message,
		Config:  strings.TrimSpace(configOutput),
	}

	// 解析配置信息
	status.parseConfig(configOutput)

	return status, nil
}

// checkSNMPStatusNetworkDevice 网络设备SNMP状态检查（通用）
func (c *Client) checkSNMPStatusNetworkDevice() (*SNMPStatus, error) {
	// 检查SNMP是否启用
	stdout, _, err := c.Execute("display snmp-agent status 2>/dev/null || show snmp 2>/dev/null || show snmp status 2>/dev/null")
	if err != nil {
		return &SNMPStatus{
			Running: false,
			Message: "SNMP服务未运行或未配置",
		}, nil
	}

	running := strings.Contains(stdout, "enabled") || strings.Contains(stdout, "running") || strings.Contains(stdout, "active")
	message := "SNMP服务" + map[bool]string{true: "正在运行", false: "未运行"}[running]

	// 获取SNMP配置
	configOutput, _, _ := c.Execute("display snmp-agent community 2>/dev/null || show snmp community 2>/dev/null || show running-config | include snmp")

	status := &SNMPStatus{
		Running: running,
		Message: message,
		Config:  strings.TrimSpace(configOutput),
	}

	// 解析配置信息
	status.parseConfig(configOutput)

	return status, nil
}

// checkSNMPStatusCisco 思科设备SNMP状态检查
func (c *Client) checkSNMPStatusCisco() (*SNMPStatus, error) {
	// 检查SNMP是否启用
	stdout, _, err := c.Execute("show snmp 2>/dev/null")
	if err != nil {
		return &SNMPStatus{
			Running: false,
			Message: "SNMP服务未运行或未配置",
		}, nil
	}

	running := strings.Contains(stdout, "SNMP agent enabled")
	message := "SNMP服务" + map[bool]string{true: "正在运行", false: "未运行"}[running]

	// 获取SNMP配置
	configOutput, _, _ := c.Execute("show running-config | include snmp")

	status := &SNMPStatus{
		Running: running,
		Message: message,
		Config:  strings.TrimSpace(configOutput),
	}

	// 解析配置信息
	status.parseConfig(configOutput)

	return status, nil
}

// checkSNMPStatusJuniper Juniper设备SNMP状态检查
func (c *Client) checkSNMPStatusJuniper() (*SNMPStatus, error) {
	// 检查SNMP是否启用
	stdout, _, err := c.Execute("show snmp status 2>/dev/null")
	if err != nil {
		return &SNMPStatus{
			Running: false,
			Message: "SNMP服务未运行或未配置",
		}, nil
	}

	running := strings.Contains(stdout, "enabled") || strings.Contains(stdout, "active")
	message := "SNMP服务" + map[bool]string{true: "正在运行", false: "未运行"}[running]

	// 获取SNMP配置
	configOutput, _, _ := c.Execute("show configuration snmp")

	status := &SNMPStatus{
		Running: running,
		Message: message,
		Config:  strings.TrimSpace(configOutput),
	}

	// 解析配置信息
	status.parseConfig(configOutput)

	return status, nil
}

// checkSNMPStatusFortinet Fortinet设备SNMP状态检查
func (c *Client) checkSNMPStatusFortinet() (*SNMPStatus, error) {
	// 检查SNMP是否启用
	stdout, _, err := c.Execute("get system snmp 2>/dev/null")
	if err != nil {
		return &SNMPStatus{
			Running: false,
			Message: "SNMP服务未运行或未配置",
		}, nil
	}

	running := strings.Contains(stdout, "set status=enable")
	message := "SNMP服务" + map[bool]string{true: "正在运行", false: "未运行"}[running]

	status := &SNMPStatus{
		Running: running,
		Message: message,
		Config:  strings.TrimSpace(stdout),
	}

	// 解析配置信息
	status.parseConfig(stdout)

	return status, nil
}

// checkSNMPStatusMikroTik MikroTik设备SNMP状态检查
func (c *Client) checkSNMPStatusMikroTik() (*SNMPStatus, error) {
	// 检查SNMP是否启用
	stdout, _, err := c.Execute("/snmp print 2>/dev/null")
	if err != nil {
		return &SNMPStatus{
			Running: false,
			Message: "SNMP服务未运行或未配置",
		}, nil
	}

	running := strings.Contains(stdout, "enabled=yes")
	message := "SNMP服务" + map[bool]string{true: "正在运行", false: "未运行"}[running]

	status := &SNMPStatus{
		Running: running,
		Message: message,
		Config:  strings.TrimSpace(stdout),
	}

	// 解析配置信息
	status.parseConfig(stdout)

	return status, nil
}

// EnableSNMP 启用SNMP服务
func (c *Client) EnableSNMP(config *SNMPConfig) error {
	// 根据品牌选择配置方法
	switch c.brand {
	case BrandHuawei:
		return c.enableSNMPHuawei(config)
	case BrandCisco:
		return c.enableSNMPCisco(config)
	case BrandH3C:
		return c.enableSNMPH3C(config)
	case BrandJuniper:
		return c.enableSNMPJuniper(config)
	case BrandArista:
		return c.enableSNMPArista(config)
	case BrandFortinet:
		return c.enableSNMPFortinet(config)
	case BrandMikroTik:
		return c.enableSNMPMikroTik(config)
	case BrandDell:
		return c.enableSNMPDell(config)
	case BrandHP:
		return c.enableSNMPHP(config)
	default:
		return c.enableSNMPGeneric(config)
	}
}

// enableSNMPGeneric 通用Linux设备SNMP配置
func (c *Client) enableSNMPGeneric(config *SNMPConfig) error {
	// 1. 安装SNMP（如果未安装）
	_, _, err := c.Execute("which snmpd || (apt-get update -qq && apt-get install -y -qq snmp snmpd 2>/dev/null) || (yum install -y -q net-snmp net-snmp-utils 2>/dev/null) || (dnf install -y -q net-snmp net-snmp-utils 2>/dev/null)")
	if err != nil && !strings.Contains(err.Error(), "exit status") {
		return fmt.Errorf("安装SNMP失败: %w", err)
	}

	// 2. 生成配置文件
	configContent := c.generateConfigFile(config)

	// 3. 备份现有配置并写入新配置
	_, _, err = c.Execute("mkdir -p /etc/snmp && cp /etc/snmp/snmpd.conf /etc/snmp/snmpd.conf.bak 2>/dev/null; echo '" + escapeSingleQuote(configContent) + "' > /etc/snmp/snmpd.conf")
	if err != nil {
		return fmt.Errorf("写入SNMP配置失败: %w", err)
	}

	// 4. 重启SNMP服务
	_, stderr, err := c.Execute("systemctl restart snmpd 2>/dev/null || service snmpd restart 2>/dev/null || /etc/init.d/snmpd restart 2>/dev/null")
	if err != nil {
		return fmt.Errorf("重启SNMP服务失败: %w (stderr: %s)", err, stderr)
	}

	// 5. 启用开机自启动
	_, _, _ = c.Execute("systemctl enable snmpd 2>/dev/null || chkconfig snmpd on 2>/dev/null")

	return nil
}

// enableSNMPHuawei 华为设备SNMP配置
func (c *Client) enableSNMPHuawei(config *SNMPConfig) error {
	// 华为VRP命令
	commands := []string{
		"system-view",
	}

	if config.Version == "v2c" {
		commands = append(commands,
			fmt.Sprintf("snmp-agent community read %s", config.Community),
			fmt.Sprintf("snmp-agent community write %s", config.Community),
		)
	} else if config.Version == "v3" {
		commands = append(commands,
			fmt.Sprintf("snmp-agent mib-view included iso-view iso"),
			fmt.Sprintf("snmp-agent usm-user v3 %s authentication-mode %s %s privacy-mode %s %s",
				config.SecurityName, config.AuthProtocol, config.AuthPassword, config.PrivProtocol, config.PrivPassword),
			fmt.Sprintf("snmp-agent group v3 %s privacy read-view iso-view write-view iso-view", config.SecurityName),
		)
	}

	commands = append(commands,
		"snmp-agent target-host trap address udp-domain 127.0.0.1 params securityname public",
		"snmp-agent trap enable",
		"snmp-agent",
		"return",
		"save",
	)

	// 执行配置命令
	for _, cmd := range commands {
		_, stderr, err := c.Execute(cmd)
		if err != nil && !strings.Contains(stderr, "already exists") && !strings.Contains(stderr, "already enabled") {
			return fmt.Errorf("执行命令失败 '%s': %w (stderr: %s)", cmd, err, stderr)
		}
	}

	return nil
}

// enableSNMPCisco 思科设备SNMP配置
func (c *Client) enableSNMPCisco(config *SNMPConfig) error {
	// 思科IOS命令
	commands := []string{
		"configure terminal",
	}

	if config.Version == "v2c" {
		commands = append(commands,
			fmt.Sprintf("snmp-server community %s RO", config.Community),
			fmt.Sprintf("snmp-server community %s RW", config.Community),
		)
	} else if config.Version == "v3" {
		commands = append(commands,
			fmt.Sprintf("snmp-server user %s %s auth %s %s priv %s %s",
				config.SecurityName, config.SecurityName, config.AuthProtocol, config.AuthPassword, config.PrivProtocol, config.PrivPassword),
			"snmp-server group %s v3 priv read iso-view write iso-view",
		)
	}

	commands = append(commands,
		fmt.Sprintf("snmp-server location %s", config.Location),
		fmt.Sprintf("snmp-server contact %s", config.Contact),
		"snmp-server enable traps",
		"end",
		"write memory",
	)

	// 执行配置命令
	for _, cmd := range commands {
		_, stderr, err := c.Execute(cmd)
		if err != nil && !strings.Contains(stderr, "already exists") {
			return fmt.Errorf("执行命令失败 '%s': %w (stderr: %s)", cmd, err, stderr)
		}
	}

	return nil
}

// enableSNMPH3C H3C设备SNMP配置
func (c *Client) enableSNMPH3C(config *SNMPConfig) error {
	// H3C Comware命令
	commands := []string{
		"system-view",
	}

	if config.Version == "v2c" {
		commands = append(commands,
			fmt.Sprintf("snmp-agent community read %s", config.Community),
			fmt.Sprintf("snmp-agent community write %s", config.Community),
		)
	} else if config.Version == "v3" {
		commands = append(commands,
			fmt.Sprintf("snmp-agent mib-view included iso-view iso"),
			fmt.Sprintf("snmp-agent usm-user v3 %s authentication-mode %s %s privacy-mode %s %s",
				config.SecurityName, config.AuthProtocol, config.AuthPassword, config.PrivProtocol, config.PrivPassword),
			fmt.Sprintf("snmp-agent group v3 %s privacy read-view iso-view write-view iso-view", config.SecurityName),
		)
	}

	commands = append(commands,
		"snmp-agent trap enable",
		"snmp-agent",
		"return",
		"save force",
	)

	// 执行配置命令
	for _, cmd := range commands {
		_, stderr, err := c.Execute(cmd)
		if err != nil && !strings.Contains(stderr, "already exists") && !strings.Contains(stderr, "already enabled") {
			return fmt.Errorf("执行命令失败 '%s': %w (stderr: %s)", cmd, err, stderr)
		}
	}

	return nil
}

// enableSNMPJuniper Juniper设备SNMP配置
func (c *Client) enableSNMPJuniper(config *SNMPConfig) error {
	// Juniper JunOS命令
	commands := []string{
		"configure",
		"set system snmp community public authorization read-only",
		"set system snmp location " + config.Location,
		"set system snmp contact " + config.Contact,
		"set system snmp trap-group public targets 127.0.0.1",
		"commit",
		"exit",
	}

	// 执行配置命令
	for _, cmd := range commands {
		_, stderr, err := c.Execute(cmd)
		if err != nil && !strings.Contains(stderr, "already exists") {
			return fmt.Errorf("执行命令失败 '%s': %w (stderr: %s)", cmd, err, stderr)
		}
	}

	return nil
}

// enableSNMPArista Arista设备SNMP配置
func (c *Client) enableSNMPArista(config *SNMPConfig) error {
	// Arista EOS命令
	commands := []string{
		"configure",
	}

	if config.Version == "v2c" {
		commands = append(commands,
			fmt.Sprintf("snmp-server community %s ro", config.Community),
		)
	}

	commands = append(commands,
		fmt.Sprintf("snmp-server location %s", config.Location),
		fmt.Sprintf("snmp-server contact %s", config.Contact),
		"end",
		"write memory",
	)

	// 执行配置命令
	for _, cmd := range commands {
		_, stderr, err := c.Execute(cmd)
		if err != nil && !strings.Contains(stderr, "already exists") {
			return fmt.Errorf("执行命令失败 '%s': %w (stderr: %s)", cmd, err, stderr)
		}
	}

	return nil
}

// enableSNMPFortinet Fortinet设备SNMP配置
func (c *Client) enableSNMPFortinet(config *SNMPConfig) error {
	// Fortinet FortiOS命令
	commands := []string{
		"config system global",
		fmt.Sprintf("set snmp-community %s", config.Community),
		fmt.Sprintf("set snmp-syslocation %s", config.Location),
		fmt.Sprintf("set snmp-syscontact %s", config.Contact),
		"end",
	}

	// 执行配置命令
	for _, cmd := range commands {
		_, stderr, err := c.Execute(cmd)
		if err != nil && !strings.Contains(stderr, "already exists") {
			return fmt.Errorf("执行命令失败 '%s': %w (stderr: %s)", cmd, err, stderr)
		}
	}

	return nil
}

// enableSNMPMikroTik MikroTik设备SNMP配置
func (c *Client) enableSNMPMikroTik(config *SNMPConfig) error {
	// MikroTik RouterOS命令
	commands := []string{
		"/snmp set enabled=yes",
		fmt.Sprintf("/snmp set community=%s", config.Community),
		fmt.Sprintf("/snmp set location=%s", config.Location),
		fmt.Sprintf("/snmp set contact=%s", config.Contact),
	}

	// 执行配置命令
	for _, cmd := range commands {
		_, stderr, err := c.Execute(cmd)
		if err != nil && !strings.Contains(stderr, "already exists") {
			return fmt.Errorf("执行命令失败 '%s': %w (stderr: %s)", cmd, err, stderr)
		}
	}

	return nil
}

// enableSNMPDell 戴尔设备SNMP配置
func (c *Client) enableSNMPDell(config *SNMPConfig) error {
	// 戴尔PowerConnect命令
	commands := []string{
		"configure",
	}

	if config.Version == "v2c" {
		commands = append(commands,
			fmt.Sprintf("snmp-server community %s ro", config.Community),
		)
	}

	commands = append(commands,
		fmt.Sprintf("snmp-server location %s", config.Location),
		fmt.Sprintf("snmp-server contact %s", config.Contact),
		"end",
		"copy running-config startup-config",
	)

	// 执行配置命令
	for _, cmd := range commands {
		_, stderr, err := c.Execute(cmd)
		if err != nil && !strings.Contains(stderr, "already exists") {
			return fmt.Errorf("执行命令失败 '%s': %w (stderr: %s)", cmd, err, stderr)
		}
	}

	return nil
}

// enableSNMPHP 惠普设备SNMP配置
func (c *Client) enableSNMPHP(config *SNMPConfig) error {
	// 惠普ProCurve命令
	commands := []string{
		"configure",
	}

	if config.Version == "v2c" {
		commands = append(commands,
			fmt.Sprintf("snmp-server community %s ro", config.Community),
		)
	}

	commands = append(commands,
		fmt.Sprintf("snmp-server location %s", config.Location),
		fmt.Sprintf("snmp-server contact %s", config.Contact),
		"end",
		"write memory",
	)

	// 执行配置命令
	for _, cmd := range commands {
		_, stderr, err := c.Execute(cmd)
		if err != nil && !strings.Contains(stderr, "already exists") {
			return fmt.Errorf("执行命令失败 '%s': %w (stderr: %s)", cmd, err, stderr)
		}
	}

	return nil
}

// generateConfigFile 生成SNMP配置文件内容
func (c *Client) generateConfigFile(config *SNMPConfig) string {
	var sb strings.Builder

	sb.WriteString("# SNMP Configuration generated by SNMP MIB Explorer Pro\n")
	sb.WriteString("# Generated at: " + time.Now().Format("2006-01-02 15:04:05") + "\n\n")

	// 基本配置
	sb.WriteString("agentAddress udp:161\n")
	sb.WriteString("master agentx\n\n")

	// 系统信息
	sb.WriteString("sysLocation " + config.Location + "\n")
	sb.WriteString("sysContact " + config.Contact + "\n")
	sb.WriteString("sysName " + config.SysName + "\n\n")

	// 访问控制
	sb.WriteString("# Access Control\n")
	sb.WriteString("rocommunity " + config.Community + " default\n\n")

	// 如果是v3，添加v3配置
	if config.Version == "v3" && config.SecurityName != "" {
		sb.WriteString("# SNMPv3 Configuration\n")
		sb.WriteString("createUser " + config.SecurityName)

		if config.AuthProtocol != "" && config.AuthPassword != "" {
			sb.WriteString(" " + config.AuthProtocol + " " + config.AuthPassword)
		}

		if config.PrivProtocol != "" && config.PrivPassword != "" {
			sb.WriteString(" " + config.PrivProtocol + " " + config.PrivPassword)
		}

		sb.WriteString("\n")
		sb.WriteString("rwuser " + config.SecurityName + "\n")
	}

	// 允许所有主机访问
	sb.WriteString("\n# Allow access from all hosts\n")
	sb.WriteString("com2sec readonly default " + config.Community + "\n")
	sb.WriteString("group MyROGroup v1 readonly\n")
	sb.WriteString("group MyROGroup v2c readonly\n")
	sb.WriteString("view all included .1 80\n")
	sb.WriteString("access MyROGroup \"\" any noauth exact all none none\n")

	return sb.String()
}

// escapeSingleQuote 转义单引号
func escapeSingleQuote(s string) string {
	return strings.ReplaceAll(s, "'", "'\\''")
}

// SNMPStatus SNMP状态信息
type SNMPStatus struct {
	Running      bool   `json:"running"`
	Message      string `json:"message"`
	Config       string `json:"config"`
	Community    string `json:"community,omitempty"`
	Version      string `json:"version,omitempty"`
	SecurityName string `json:"securityName,omitempty"`
}

// parseConfig 解析SNMP配置
func (s *SNMPStatus) parseConfig(config string) {
	lines := strings.Split(config, "\n")
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if strings.HasPrefix(line, "rocommunity") {
			parts := strings.Fields(line)
			if len(parts) >= 2 {
				s.Community = parts[1]
			}
		}
		if strings.Contains(line, "createUser") {
			parts := strings.Fields(line)
			if len(parts) >= 2 {
				s.SecurityName = parts[1]
				s.Version = "v3"
			}
		}
	}
}

// SNMPConfig SNMP配置
type SNMPConfig struct {
	Version        string `json:"version"`         // v2c or v3
	Community      string `json:"community"`       // v2c community string
	SecurityName   string `json:"securityName"`    // v3 username
	AuthProtocol   string `json:"authProtocol"`    // MD5, SHA, SHA256, SHA512
	AuthPassword   string `json:"authPassword"`    // v3 auth password
	PrivProtocol   string `json:"privProtocol"`    // DES, AES, AES192, AES256
	PrivPassword   string `json:"privPassword"`    // v3 priv password
	Location       string `json:"location"`        // System location
	Contact        string `json:"contact"`         // System contact
	SysName        string `json:"sysName"`         // System name
}

// TestConnection 测试SSH连接
func (c *Client) TestConnection() error {
	if err := c.Connect(); err != nil {
		if strings.Contains(err.Error(), "timeout") {
			return fmt.Errorf("SSH连接超时 - 设备 %s:%d 无法访问，请检查网络连接和防火墙设置", c.host, c.port)
		}
		if strings.Contains(err.Error(), "connection refused") {
			return fmt.Errorf("SSH连接被拒绝 - 设备 %s:%d 可能未启用SSH服务或端口配置错误", c.host, c.port)
		}
		if strings.Contains(err.Error(), "no route to host") {
			return fmt.Errorf("无法到达主机 - 设备 %s:%d 网络不可达，请检查路由配置", c.host, c.port)
		}
		return fmt.Errorf("SSH连接失败: %w", err)
	}
	defer c.Close()

	// 执行简单命令测试
	_, _, err := c.Execute("echo 'SSH连接测试成功'")
	if err != nil {
		return fmt.Errorf("SSH命令执行失败: %w", err)
	}

	return nil
}
