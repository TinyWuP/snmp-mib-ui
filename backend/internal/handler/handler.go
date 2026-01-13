package handler

import (
	"archive/zip"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"snmp-mib-explorer/internal/model"
	"snmp-mib-explorer/internal/snmp"
)

type Handler struct {
	db      *model.DB
	mibPath string
}

func NewHandler(db *model.DB, mibPath string) *Handler {
	return &Handler{db: db, mibPath: mibPath}
}

// Device handlers

// GetDevices godoc
// @Summary      获取所有设备
// @Description  获取系统中所有已配置的 SNMP 设备列表
// @Tags         devices
// @Accept       json
// @Produce      json
// @Success      200  {array}   model.Device
// @Failure      500  {object}  map[string]string
// @Router       /devices [get]
func (h *Handler) GetDevices(c *gin.Context) {
	devices, err := h.db.GetDevices()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if devices == nil {
		devices = []model.Device{}
	}
	c.JSON(http.StatusOK, devices)
}

// CreateDevice godoc
// @Summary      创建新设备
// @Description  添加一个新的 SNMP 设备到系统中
// @Tags         devices
// @Accept       json
// @Produce      json
// @Param        device  body      model.Device  true  "设备信息"
// @Success      201     {object}  model.Device
// @Failure      400     {object}  map[string]string
// @Failure      500     {object}  map[string]string
// @Router       /devices [post]
func (h *Handler) CreateDevice(c *gin.Context) {
	var device model.Device
	if err := c.ShouldBindJSON(&device); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if device.Port == 0 {
		device.Port = 161
	}
	if device.Version == "" {
		device.Version = "v2c"
	}

	if err := h.db.CreateDevice(&device); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, device)
}

// CreateDevicesBatch godoc
// @Summary      批量创建设备
// @Description  一次性添加多个 SNMP 设备到系统中
// @Tags         devices
// @Accept       json
// @Produce      json
// @Param        devices  body      []model.Device  true  "设备列表"
// @Success      201      {array}   model.Device
// @Failure      400      {object}  map[string]string
// @Failure      500      {object}  map[string]string
// @Router       /devices/batch [post]
func (h *Handler) CreateDevicesBatch(c *gin.Context) {
	var devices []model.Device
	if err := c.ShouldBindJSON(&devices); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	for i := range devices {
		if devices[i].Port == 0 {
			devices[i].Port = 161
		}
		if devices[i].Version == "" {
			devices[i].Version = "v2c"
		}
		if err := h.db.CreateDevice(&devices[i]); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
	}

	c.JSON(http.StatusCreated, devices)
}

// DeleteDevice godoc
// @Summary      删除设备
// @Description  根据设备 ID 删除指定的 SNMP 设备
// @Tags         devices
// @Accept       json
// @Produce      json
// @Param        id   path      string  true  "设备 ID"
// @Success      200  {object}  map[string]string
// @Failure      500  {object}  map[string]string
// @Router       /devices/{id} [delete]
func (h *Handler) DeleteDevice(c *gin.Context) {
	id := c.Param("id")
	if err := h.db.DeleteDevice(id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "deleted"})
}

// MIB Archive handlers

// GetArchives godoc
// @Summary      获取所有 MIB 归档
// @Description  获取系统中所有已上传的 MIB 归档文件列表
// @Tags         mib
// @Accept       json
// @Produce      json
// @Success      200  {array}   model.MibArchive
// @Failure      500  {object}  map[string]string
// @Router       /mib/archives [get]
func (h *Handler) GetArchives(c *gin.Context) {
	archives, err := h.db.GetArchives()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if archives == nil {
		archives = []model.MibArchive{}
	}
	c.JSON(http.StatusOK, archives)
}

// UploadMib godoc
// @Summary      上传 MIB 文件
// @Description  上传一个包含 MIB 文件的 ZIP 压缩包
// @Tags         mib
// @Accept       multipart/form-data
// @Produce      json
// @Param        file  formData  file  true  "MIB ZIP 文件"
// @Success      201   {object}  model.MibArchive
// @Failure      400   {object}  map[string]string
// @Failure      500   {object}  map[string]string
// @Router       /mib/upload [post]
func (h *Handler) UploadMib(c *gin.Context) {
	file, header, err := c.Request.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "no file uploaded"})
		return
	}
	defer file.Close()

	if !strings.HasSuffix(header.Filename, ".zip") {
		c.JSON(http.StatusBadRequest, gin.H{"error": "only .zip files are supported"})
		return
	}

	// Save temp file
	tmpFile, err := os.CreateTemp("", "mib-*.zip")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer os.Remove(tmpFile.Name())

	if _, err := io.Copy(tmpFile, file); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	tmpFile.Close()

	// Extract and parse
	archive, err := h.extractAndParseMib(tmpFile.Name(), header.Filename, header.Size)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Save to DB
	if err := h.db.CreateArchive(archive); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, archive)
}

func (h *Handler) extractAndParseMib(zipPath, fileName string, size int64) (*model.MibArchive, error) {
	reader, err := zip.OpenReader(zipPath)
	if err != nil {
		return nil, err
	}
	defer reader.Close()

	archiveID := uuid.New().String()
	extractDir := filepath.Join(h.mibPath, strings.TrimSuffix(fileName, ".zip"))

	// Create extract directory
	if err := os.MkdirAll(extractDir, 0755); err != nil {
		return nil, err
	}

	var fileCount int

	for _, f := range reader.File {
		if f.FileInfo().IsDir() {
			continue
		}

		rc, err := f.Open()
		if err != nil {
			continue
		}

		content, err := io.ReadAll(rc)
		rc.Close()
		if err != nil {
			continue
		}

		contentStr := string(content)
		upperContent := strings.ToUpper(contentStr)

		// Check if it's a MIB file
		if !strings.Contains(upperContent, "DEFINITIONS") && !strings.Contains(contentStr, "OBJECT IDENTIFIER") {
			continue
		}

		// Save file to disk only (no parsing yet - lazy parse on demand)
		destPath := filepath.Join(extractDir, filepath.Base(f.Name))
		if err := os.WriteFile(destPath, content, 0644); err != nil {
			continue
		}

		fileCount++
	}

	return &model.MibArchive{
		ID:            archiveID,
		FileName:      fileName,
		Size:          fmt.Sprintf("%.1f KB", float64(size)/1024),
		Status:        "extracted",
		ExtractedPath: extractDir,
		Timestamp:     time.Now().UnixMilli(),
		FileCount:     fileCount,
	}, nil
}

// Standard OID mappings - only truly standard IETF/ISO OIDs
var standardOIDs = map[string]string{
	// ISO tree
	"iso":          "1",
	"org":          "1.3",
	"dod":          "1.3.6",
	"internet":     "1.3.6.1",
	"directory":    "1.3.6.1.1",
	"mgmt":         "1.3.6.1.2",
	"mib-2":        "1.3.6.1.2.1",
	"system":       "1.3.6.1.2.1.1",
	"interfaces":   "1.3.6.1.2.1.2",
	"at":           "1.3.6.1.2.1.3",
	"ip":           "1.3.6.1.2.1.4",
	"icmp":         "1.3.6.1.2.1.5",
	"tcp":          "1.3.6.1.2.1.6",
	"udp":          "1.3.6.1.2.1.7",
	"egp":          "1.3.6.1.2.1.8",
	"transmission": "1.3.6.1.2.1.10",
	"snmp":         "1.3.6.1.2.1.11",
	"ifMIB":        "1.3.6.1.2.1.31",
	"entityMIB":    "1.3.6.1.2.1.47",
	"experimental": "1.3.6.1.3",
	"private":      "1.3.6.1.4",
	"enterprises":  "1.3.6.1.4.1",
	"security":     "1.3.6.1.5",
	"snmpV2":       "1.3.6.1.6",
	"snmpModules":  "1.3.6.1.6.3",
}

// resolveOIDRecursive resolves symbolic OID to numeric, with recursion
func resolveOIDRecursive(oidMap map[string]string, name string, subIndex string, depth int) string {
	if depth > 20 {
		// Prevent infinite recursion
		if subIndex != "" {
			return name + "." + subIndex
		}
		return name
	}

	// Check standard OIDs first
	if baseOID, ok := standardOIDs[name]; ok {
		if subIndex != "" {
			return baseOID + "." + subIndex
		}
		return baseOID
	}

	// Check if we have this OID in our map
	if parentOID, exists := oidMap[name]; exists {
		// Check if parentOID is numeric
		if len(parentOID) > 0 && parentOID[0] >= '0' && parentOID[0] <= '9' {
			if subIndex != "" {
				return parentOID + "." + subIndex
			}
			return parentOID
		}
		// Parent OID is still symbolic, need to resolve it
		parts := strings.SplitN(parentOID, ".", 2)
		parentName := parts[0]
		parentSub := ""
		if len(parts) > 1 {
			parentSub = parts[1]
		}
		resolved := resolveOIDRecursive(oidMap, parentName, parentSub, depth+1)
		if subIndex != "" {
			return resolved + "." + subIndex
		}
		return resolved
	}

	// Return symbolic if can't resolve
	if subIndex != "" {
		return name + "." + subIndex
	}
	return name
}

func parseMibContent(text, fileName string) []model.MibNode {
	nodes := make(map[string]*model.MibNode)
	oidMap := make(map[string]string) // name -> symbolic or numeric oid mapping

	// Extract module name (from original text before removing comments)
	moduleRe := regexp.MustCompile(`(\S+)\s+DEFINITIONS\s+::=\s+BEGIN`)
	moduleMatch := moduleRe.FindStringSubmatch(text)
	moduleName := fileName
	if len(moduleMatch) > 1 {
		moduleName = moduleMatch[1]
	}

	// IMPORTANT: First pass - extract OID hints from comments
	// Many MIBs have comments like "-- 1.3.6.1.4.1.2011.6.3.1" before definitions
	// Pattern: comment with OID, followed by object name on next line
	// Example format:
	//     -- 1.3.6.1.4.1.2011.6.3.26
	//     hwPstnBoardCfgTable OBJECT-TYPE
	// Use multiline mode and handle both \r\n and \n line endings
	oidHintRe := regexp.MustCompile(`(?m)--\s*(1(?:\.\d+)+)[^\r\n]*[\r\n]+\s*(\w+)`)
	hintMatches := oidHintRe.FindAllStringSubmatch(text, -1)
	for _, m := range hintMatches {
		numericOid := m[1]
		name := m[2]
		oidMap[name] = numericOid
	}

	// Remove comments for further parsing
	commentRe := regexp.MustCompile(`--.*$`)
	cleanText := commentRe.ReplaceAllStringFunc(text, func(s string) string { return "" })
	cleanText = strings.ReplaceAll(cleanText, "\r\n", "\n")

	// Infer parent OIDs from child OIDs
	// E.g., if hwSystemPara = 1.3.6.1.4.1.2011.6.3.1 and hwSystemPara ::= { hwDev 1 }
	// then hwDev = 1.3.6.1.4.1.2011.6.3
	objectDefRe := regexp.MustCompile(`(\w+)\s+(?:OBJECT-TYPE|OBJECT\s+IDENTIFIER|MODULE-IDENTITY)[\s\S]*?::=\s*{\s*(\w+)\s+(\d+)\s*}`)
	objectMatches := objectDefRe.FindAllStringSubmatch(cleanText, -1)
	for _, m := range objectMatches {
		childName := m[1]
		parentName := m[2]
		subId := m[3]
		// If we have the child's numeric OID but not the parent's, infer parent
		if childOid, hasChild := oidMap[childName]; hasChild && strings.HasPrefix(childOid, "1.") {
			if _, hasParent := oidMap[parentName]; !hasParent {
				// Extract parent OID by removing the last component
				lastDot := strings.LastIndex(childOid, ".")
				if lastDot > 0 {
					expectedSuffix := "." + subId
					if strings.HasSuffix(childOid, expectedSuffix) {
						parentOid := childOid[:len(childOid)-len(expectedSuffix)]
						oidMap[parentName] = parentOid
					}
				}
			}
		}
	}

	// Second pass: collect OBJECT IDENTIFIER definitions
	idRe := regexp.MustCompile(`(\w+)\s+OBJECT\s+IDENTIFIER\s+::=\s*{\s*([^}]+)\s*}`)
	idMatches := idRe.FindAllStringSubmatch(cleanText, -1)
	for _, m := range idMatches {
		name := m[1]
		pathParts := strings.Fields(m[2])
		parent := pathParts[0]
		subIndex := strings.Join(pathParts[1:], ".")

		// Don't overwrite if we already have a numeric OID from comments
		if existing, ok := oidMap[name]; ok && strings.HasPrefix(existing, "1.") {
			continue
		}

		if subIndex != "" {
			oidMap[name] = parent + "." + subIndex
		} else {
			oidMap[name] = parent
		}
	}

	// Also parse MODULE-IDENTITY for root OID
	modIdRe := regexp.MustCompile(`(\w+)\s+MODULE-IDENTITY[\s\S]*?::=\s*{\s*([^}]+)\s*}`)
	modIdMatches := modIdRe.FindAllStringSubmatch(cleanText, -1)
	for _, m := range modIdMatches {
		name := m[1]
		pathParts := strings.Fields(m[2])
		parent := pathParts[0]
		subIndex := strings.Join(pathParts[1:], ".")

		// Don't overwrite if we already have a numeric OID from comments
		if existing, ok := oidMap[name]; ok && strings.HasPrefix(existing, "1.") {
			continue
		}

		if subIndex != "" {
			oidMap[name] = parent + "." + subIndex
		} else {
			oidMap[name] = parent
		}
	}

	// Resolve all oidMap entries to numeric
	resolvedOidMap := make(map[string]string)
	for name, symbolicOid := range oidMap {
		// If already numeric, use it directly
		if strings.HasPrefix(symbolicOid, "1.") {
			resolvedOidMap[name] = symbolicOid
			continue
		}
		parts := strings.SplitN(symbolicOid, ".", 2)
		parentName := parts[0]
		subIndex := ""
		if len(parts) > 1 {
			subIndex = parts[1]
		}
		resolvedOidMap[name] = resolveOIDRecursive(oidMap, parentName, subIndex, 0)
	}

	// Second pass: create nodes for OBJECT IDENTIFIER
	for _, m := range idMatches {
		name := m[1]
		oid := resolvedOidMap[name]
		if oid == "" {
			oid = name
		}

		pathParts := strings.Fields(m[2])
		parent := pathParts[0]

		nodes[name] = &model.MibNode{
			Name:      name,
			OID:       oid,
			ParentOID: parent,
			Children:  []model.MibNode{},
		}
	}

	// Third pass: parse OBJECT-TYPE blocks
	// Skip import-related false positives
	skipNames := map[string]bool{
		"CONF": true, "SMI": true, "TC": true, "MIB": true,
		"FROM": true, "IMPORTS": true, "EXPORTS": true,
		"BEGIN": true, "END": true, "SEQUENCE": true,
	}
	blocks := regexp.MustCompile(`(?i)OBJECT-TYPE`).Split(cleanText, -1)
	for i := 1; i < len(blocks); i++ {
		prevBlock := blocks[i-1]
		block := blocks[i]

		// Get name from previous block
		nameRe := regexp.MustCompile(`(\w+)\s*$`)
		nameMatch := nameRe.FindStringSubmatch(prevBlock)
		if nameMatch == nil {
			continue
		}
		name := nameMatch[1]

		// Skip import-related false positives
		if skipNames[name] {
			continue
		}

		// Get OID - first check if we already have a numeric OID from comments
		var oid string
		if existingOid, ok := oidMap[name]; ok && strings.HasPrefix(existingOid, "1.") {
			oid = existingOid
		} else {
			// Parse from the block
			oidRe := regexp.MustCompile(`::=\s*{\s*([^}]+)\s*}`)
			oidMatch := oidRe.FindStringSubmatch(block)
			if oidMatch == nil {
				continue
			}

			oidParts := strings.Fields(oidMatch[1])
			parent := oidParts[0]
			subIndex := strings.Join(oidParts[1:], ".")

			// Resolve to numeric OID using our resolved map
			oid = resolveOIDRecursive(resolvedOidMap, parent, subIndex, 0)
		}

		// Parse parent from block for tree building
		oidRe := regexp.MustCompile(`::=\s*{\s*([^}]+)\s*}`)
		oidMatch := oidRe.FindStringSubmatch(block)
		parent := ""
		if oidMatch != nil {
			oidParts := strings.Fields(oidMatch[1])
			parent = oidParts[0]
		}

		// Extract other fields
		syntaxRe := regexp.MustCompile(`(?i)SYNTAX\s+([^\n\r]+)`)
		accessRe := regexp.MustCompile(`(?i)(?:MAX-ACCESS|ACCESS)\s+(\S+)`)
		statusRe := regexp.MustCompile(`(?i)STATUS\s+(\S+)`)
		descRe := regexp.MustCompile(`(?i)DESCRIPTION\s+"([\s\S]*?)"`)

		node := &model.MibNode{
			Name:      name,
			OID:       oid,
			ParentOID: parent,
			Children:  []model.MibNode{},
		}

		if m := syntaxRe.FindStringSubmatch(block); m != nil {
			node.Syntax = strings.TrimSpace(m[1])
		}
		if m := accessRe.FindStringSubmatch(block); m != nil {
			node.Access = m[1]
		}
		if m := statusRe.FindStringSubmatch(block); m != nil {
			node.Status = m[1]
		}
		if m := descRe.FindStringSubmatch(block); m != nil {
			node.Description = strings.TrimSpace(m[1])
		}

		nodes[name] = node
	}

	// Build tree
	var rootNodes []model.MibNode
	for _, node := range nodes {
		if parent, exists := nodes[node.ParentOID]; exists && parent != node {
			parent.Children = append(parent.Children, *node)
		} else {
			rootNodes = append(rootNodes, *node)
		}
	}

	if len(rootNodes) == 0 && len(nodes) > 0 {
		for _, node := range nodes {
			rootNodes = append(rootNodes, *node)
			break
		}
	}

	if len(rootNodes) == 0 {
		return []model.MibNode{{Name: moduleName + " (No Nodes Found)", OID: "1.3.6.1", Children: []model.MibNode{}}}
	}

	return rootNodes
}

func (h *Handler) DeleteArchive(c *gin.Context) {
	id := c.Param("id")

	// Get archive first to get the path
	archives, err := h.db.GetArchives()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	for _, a := range archives {
		if a.ID == id {
			// Remove directory
			os.RemoveAll(a.ExtractedPath)
			break
		}
	}

	if err := h.db.DeleteArchive(id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "deleted"})
}

// GetArchiveDetail loads archive with files from filesystem
func (h *Handler) GetArchiveDetail(c *gin.Context) {
	id := c.Param("id")

	archives, err := h.db.GetArchives()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	var archive *model.MibArchive
	for _, a := range archives {
		if a.ID == id {
			archive = &a
			break
		}
	}

	if archive == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "archive not found"})
		return
	}

	// Load files from filesystem
	archive.Files = h.loadFilesFromPath(archive.ExtractedPath)

	c.JSON(http.StatusOK, archive)
}

// loadFilesFromPath lists MIB files from the extracted directory (without parsing)
func (h *Handler) loadFilesFromPath(extractPath string) []model.MibFile {
	var files []model.MibFile

	entries, err := os.ReadDir(extractPath)
	if err != nil {
		return files
	}

	for _, entry := range entries {
		if entry.IsDir() {
			continue
		}
		name := entry.Name()
		// Skip meta files and non-mib files
		if strings.HasSuffix(name, ".meta.json") {
			continue
		}
		if !strings.HasSuffix(strings.ToLower(name), ".mib") && !strings.HasSuffix(strings.ToLower(name), ".txt") {
			continue
		}

		filePath := filepath.Join(extractPath, name)
		files = append(files, model.MibFile{
			ID:       name, // Use filename as ID for simplicity
			Name:     name,
			Path:     filePath,
			IsParsed: false,
		})
	}

	return files
}

// ParseMibFile parses a single MIB file on demand
func (h *Handler) ParseMibFile(c *gin.Context) {
	var req struct {
		Path string `json:"path"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if req.Path == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "path is required"})
		return
	}

	// Read file content
	content, err := os.ReadFile(req.Path)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无法读取文件: " + err.Error()})
		return
	}

	// Parse MIB content
	nodes := parseMibContent(string(content), filepath.Base(req.Path))

	mibFile := model.MibFile{
		ID:       filepath.Base(req.Path),
		Name:     filepath.Base(req.Path),
		Path:     req.Path,
		Nodes:    nodes,
		IsParsed: true,
	}

	c.JSON(http.StatusOK, mibFile)
}

// SNMP handlers
type SnmpGetRequest struct {
	DeviceID string   `json:"deviceId"`
	OIDs     []string `json:"oids"`
}

type SnmpWalkRequest struct {
	DeviceID string `json:"deviceId"`
	OID      string `json:"oid"`
}

// SnmpGet godoc
// @Summary      SNMP GET 操作
// @Description  对指定设备执行 SNMP GET 操作，获取一个或多个 OID 的值
// @Tags         snmp
// @Accept       json
// @Produce      json
// @Param        request  body      SnmpGetRequest  true  "SNMP GET 请求"
// @Success      200      {array}   map[string]string
// @Failure      400      {object}  map[string]string
// @Failure      404      {object}  map[string]string
// @Failure      500      {object}  map[string]string
// @Router       /snmp/get [post]
func (h *Handler) SnmpGet(c *gin.Context) {
	var req SnmpGetRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	device, err := h.getDeviceByID(req.DeviceID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "device not found"})
		return
	}

	client := snmp.NewClient(device)
	results, err := client.Get(req.OIDs)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, results)
}

// SnmpWalk godoc
// @Summary      SNMP WALK 操作
// @Description  对指定设备执行 SNMP WALK 操作，遍历指定 OID 树下的所有节点
// @Tags         snmp
// @Accept       json
// @Produce      json
// @Param        request  body      SnmpWalkRequest  true  "SNMP WALK 请求"
// @Success      200      {array}   map[string]string
// @Failure      400      {object}  map[string]string
// @Failure      404      {object}  map[string]string
// @Failure      500      {object}  map[string]string
// @Router       /snmp/walk [post]
func (h *Handler) SnmpWalk(c *gin.Context) {
	var req SnmpWalkRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	device, err := h.getDeviceByID(req.DeviceID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "device not found"})
		return
	}

	client := snmp.NewClient(device)
	results, err := client.BulkWalk(req.OID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, results)
}

// SnmpTest godoc
// @Summary      测试 SNMP 连接
// @Description  测试与指定 SNMP 设备的连接是否正常
// @Tags         snmp
// @Accept       json
// @Produce      json
// @Param        device  body      model.Device  true  "设备信息"
// @Success      200     {object}  map[string]interface{}
// @Failure      400     {object}  map[string]string
// @Router       /snmp/test [post]
func (h *Handler) SnmpTest(c *gin.Context) {
	var device model.Device
	if err := c.ShouldBindJSON(&device); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	client := snmp.NewClient(&device)
	if err := client.TestConnection(); err != nil {
		c.JSON(http.StatusOK, gin.H{"success": false, "error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Connection successful"})
}

func (h *Handler) getDeviceByID(id string) (*model.Device, error) {
	devices, err := h.db.GetDevices()
	if err != nil {
		return nil, err
	}
	for _, d := range devices {
		if d.ID == id {
			return &d, nil
		}
	}
	return nil, fmt.Errorf("device not found")
}

// Config handlers

// GetConfig godoc
// @Summary      获取系统配置
// @Description  获取当前系统的配置信息
// @Tags         config
// @Accept       json
// @Produce      json
// @Success      200  {object}  model.SystemConfig
// @Failure      500  {object}  map[string]string
// @Router       /config [get]
func (h *Handler) GetConfig(c *gin.Context) {
	config, err := h.db.GetConfig()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, config)
}

// UpdateConfig godoc
// @Summary      更新系统配置
// @Description  更新系统的配置信息
// @Tags         config
// @Accept       json
// @Produce      json
// @Param        config  body      model.SystemConfig  true  "配置信息"
// @Success      200     {object}  model.SystemConfig
// @Failure      400     {object}  map[string]string
// @Failure      500     {object}  map[string]string
// @Router       /config [put]
func (h *Handler) UpdateConfig(c *gin.Context) {
	var config model.SystemConfig
	if err := c.ShouldBindJSON(&config); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.db.UpdateConfig(&config); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, config)
}

// ScanMibDirectory scans a directory for zip files
func (h *Handler) ScanMibDirectory(c *gin.Context) {
	path := c.Query("path")
	if path == "" {
		// Use default mibPath
		path = h.mibPath
	}

	// Convert absolute path to host-mounted path for Docker environment
	// If path is an absolute path (starts with /) and not already /app, map it to /host
	if strings.HasPrefix(path, "/") && !strings.HasPrefix(path, "/app") && !strings.HasPrefix(path, "/host") {
		path = "/host" + path
	}

	// Scan for zip files and directories
	var items []map[string]interface{}

	entries, err := os.ReadDir(path)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"path":  path,
			"files": []interface{}{},
			"error": "目录不存在或无法访问: " + err.Error(),
		})
		return
	}

	for _, entry := range entries {
		name := entry.Name()
		fullPath := filepath.Join(path, name)

		if entry.IsDir() {
			// Add directory
			items = append(items, map[string]interface{}{
				"type": "directory",
				"name": name,
				"path": fullPath,
			})
		} else if strings.HasSuffix(strings.ToLower(name), ".zip") {
			// Add zip file
			info, _ := entry.Info()
			size := int64(0)
			if info != nil {
				size = info.Size()
			}
			items = append(items, map[string]interface{}{
				"type": "file",
				"name": name,
				"path": fullPath,
				"size": fmt.Sprintf("%.1f KB", float64(size)/1024),
			})
		}
	}

	if items == nil {
		items = []map[string]interface{}{}
	}

	c.JSON(http.StatusOK, gin.H{
		"path":  path,
		"files": items,
	})
}

// ExtractFromPath extracts a zip file from server path
func (h *Handler) ExtractFromPath(c *gin.Context) {
	var req struct {
		Path string `json:"path"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if req.Path == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "path is required"})
		return
	}

	// Convert absolute path to host-mounted path for Docker environment
	// If path is an absolute path (starts with /) and not already /app, map it to /host
	actualPath := req.Path
	if strings.HasPrefix(req.Path, "/") && !strings.HasPrefix(req.Path, "/app") && !strings.HasPrefix(req.Path, "/host") {
		actualPath = "/host" + req.Path
	}

	// Check if file exists
	info, err := os.Stat(actualPath)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "文件不存在: " + err.Error()})
		return
	}

	// Extract and parse
	archive, err := h.extractAndParseMib(actualPath, filepath.Base(req.Path), info.Size())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "解析失败: " + err.Error()})
		return
	}

	// Save to DB
	if err := h.db.CreateArchive(archive); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, archive)
}
