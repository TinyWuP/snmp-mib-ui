package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"snmp-mib-explorer/internal/model"
	"snmp-mib-explorer/internal/service"
	"snmp-mib-explorer/internal/snmp"
)

// ExtendedHandler contains all service handlers
type ExtendedHandler struct {
	*Handler
	github    *service.GitHubService
	preset    *service.PresetService
	generator *service.GeneratorService
}

func NewExtendedHandler(db *model.DB, mibPath string) *ExtendedHandler {
	return &ExtendedHandler{
		Handler:   NewHandler(db, mibPath),
		github:    service.NewGitHubService(),
		preset:    service.NewPresetService(),
		generator: service.NewGeneratorService(),
	}
}

// GitHub API handlers

type VersionsResponse struct {
	Versions   []string `json:"versions"`
	IsFallback bool     `json:"isFallback"`
}

func (h *ExtendedHandler) GetCollectorVersions(c *gin.Context) {
	collector := c.Param("collector")
	if collector == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "collector type required"})
		return
	}

	versions, isFallback, err := h.github.GetVersions(collector)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, VersionsResponse{
		Versions:   versions,
		IsFallback: isFallback,
	})
}

// Preset API handlers

func (h *ExtendedHandler) GetPresets(c *gin.Context) {
	presets := h.preset.GetPresets()
	c.JSON(http.StatusOK, presets)
}

func (h *ExtendedHandler) GetQuickOIDs(c *gin.Context) {
	oids := h.preset.GetQuickOIDs()
	c.JSON(http.StatusOK, oids)
}

// Generator API handlers

func (h *ExtendedHandler) GenerateConfig(c *gin.Context) {
	var req service.GenerateConfigRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if req.Collector == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "collector type required"})
		return
	}

	config := h.generator.GenerateConfig(&req)
	c.JSON(http.StatusOK, gin.H{
		"config":    config,
		"collector": req.Collector,
		"version":   req.Version,
		"count":     len(req.Nodes),
	})
}

// ValidateConfig godoc
// @Summary      验证配置
// @Description  在生成配置前验证配置参数，检查重复 OID、格式错误等
// @Tags         generator
// @Accept       json
// @Produce      json
// @Param        request  body      service.GenerateConfigRequest  true  "配置验证请求"
// @Success      200      {object}  service.ValidationResult
// @Failure      400      {object}  map[string]string
// @Router       /validate/config [post]
func (h *ExtendedHandler) ValidateConfig(c *gin.Context) {
	var req service.GenerateConfigRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	result := h.generator.ValidateConfig(&req)
	c.JSON(http.StatusOK, result)
}

func (h *ExtendedHandler) GenerateCode(c *gin.Context) {
	var req service.GenerateCodeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if req.Language == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "language required"})
		return
	}

	code := h.generator.GenerateCode(&req)
	c.JSON(http.StatusOK, gin.H{
		"code":     code,
		"language": req.Language,
		"oid":      req.Node.OID,
		"name":     req.Node.Name,
	})
}

// Batch SNMP operations

type BatchSnmpRequest struct {
	DeviceID string   `json:"deviceId"`
	OIDs     []string `json:"oids"`
}

func (h *ExtendedHandler) SnmpGetBatch(c *gin.Context) {
	var req BatchSnmpRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Reuse existing SnmpGet logic but with multiple OIDs
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

// Export history tracking
type ExportHistory struct {
	ID        string `json:"id"`
	Collector string `json:"collector"`
	Version   string `json:"version"`
	Count     int    `json:"count"`
	Timestamp int64  `json:"timestamp"`
}

var exportHistory []ExportHistory

func (h *ExtendedHandler) GetExportHistory(c *gin.Context) {
	if exportHistory == nil {
		exportHistory = []ExportHistory{}
	}
	c.JSON(http.StatusOK, exportHistory)
}

func (h *ExtendedHandler) SaveExportHistory(c *gin.Context) {
	var history ExportHistory
	if err := c.ShouldBindJSON(&history); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	exportHistory = append(exportHistory, history)
	c.JSON(http.StatusCreated, history)
}
