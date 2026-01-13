package main

import (
	"log"
	"os"
	"path/filepath"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	swaggerFiles "github.com/swaggo/files"
	ginSwagger "github.com/swaggo/gin-swagger"
	"snmp-mib-explorer/docs"
	"snmp-mib-explorer/internal/handler"
	"snmp-mib-explorer/internal/model"
)

// @title           SNMP MIB Explorer Pro API
// @version         2.0.0
// @description     SNMP MIB Explorer Pro 是一个专为网络运维工程师设计的可视化 SNMP 监控配置生成工具。
// @termsOfService  http://swagger.io/terms/

// @contact.name   API Support
// @contact.url    https://github.com/Oumu33/snmp-mib-ui/issues
// @contact.email  oumu33@github.com

// @license.name  MIT
// @license.url   https://opensource.org/licenses/MIT

// @host      localhost:8080
// @BasePath  /api

// @securityDefinitions.apikey Bearer
// @in header
// @name Authorization
// @description Type "Bearer" followed by a space and JWT token.

func main() {
	// 从环境变量读取配置
	dataDir := os.Getenv("DATA_DIR")
	if dataDir == "" {
		dataDir = "./data"
	}
	dbPath := filepath.Join(dataDir, "app.db")
	mibPath := filepath.Join(dataDir, "mibs")

	// Ensure directories exist
	os.MkdirAll(dataDir, 0755)
	os.MkdirAll(mibPath, 0755)

	// Initialize database
	db, err := model.NewDB(dbPath)
	if err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}
	defer db.Close()

	// Initialize extended handler (includes all services)
	h := handler.NewExtendedHandler(db, mibPath)

	// Setup Gin - 从环境变量读取模式
	ginMode := os.Getenv("GIN_MODE")
	if ginMode == "" {
		ginMode = gin.ReleaseMode
	}
	gin.SetMode(ginMode)
	r := gin.Default()

	// CORS - allow all origins for development
	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"*"},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: false,
	}))

	// Swagger documentation
	r.GET("/swagger/*any", ginSwagger.WrapHandler(swaggerFiles.Handler, ginSwagger.URL("/swagger/doc.json"), ginSwagger.DocExpansion("list")))
	_ = docs.SwaggerInfo // Use docs package to avoid import not used warning

	// API routes
	api := r.Group("/api")
	{
		// Devices
		api.GET("/devices", h.GetDevices)
		api.POST("/devices", h.CreateDevice)
		api.POST("/devices/batch", h.CreateDevicesBatch)
		api.DELETE("/devices/:id", h.DeleteDevice)

		// MIB Archives
		api.GET("/mib/archives", h.GetArchives)
		api.GET("/mib/archives/:id", h.GetArchiveDetail)
		api.POST("/mib/upload", h.UploadMib)
		api.DELETE("/mib/archives/:id", h.DeleteArchive)
		api.GET("/mib/scan", h.ScanMibDirectory)
		api.POST("/mib/extract", h.ExtractFromPath)
		api.POST("/mib/parse", h.ParseMibFile)

		// SNMP Operations
		api.POST("/snmp/get", h.SnmpGet)
		api.POST("/snmp/walk", h.SnmpWalk)
		api.POST("/snmp/test", h.SnmpTest)

		// Config
		api.GET("/config", h.GetConfig)
		api.PUT("/config", h.UpdateConfig)

		// ===== New Extended APIs =====

		// GitHub Version Proxy (for collector versions)
		api.GET("/versions/:collector", h.GetCollectorVersions)

		// Preset OID Data
		api.GET("/presets", h.GetPresets)
		api.GET("/presets/quick-oids", h.GetQuickOIDs)

		// Config Generator
		api.POST("/generate/config", h.GenerateConfig)
		api.POST("/generate/code", h.GenerateCode)
		api.POST("/validate/config", h.ValidateConfig)

		// Export History
		api.GET("/export/history", h.GetExportHistory)
		api.POST("/export/history", h.SaveExportHistory)
	}

	// Health check
	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"status":  "ok",
			"version": "2.0.0",
			"features": []string{
				"devices",
				"mib-parser",
				"snmp-operations",
				"config-generator",
				"code-generator",
				"github-proxy",
				"presets",
			},
		})
	})

	// Static file serving for production
	// Check if dist directory exists (built frontend)
	distPath := "./dist"
	if _, err := os.Stat(distPath); err == nil {
		// Serve static files
		r.Static("/assets", filepath.Join(distPath, "assets"))

		// Serve index.html for SPA routing
		r.NoRoute(func(c *gin.Context) {
			// If it's an API request, return 404
			if len(c.Request.URL.Path) >= 4 && c.Request.URL.Path[:4] == "/api" {
				c.JSON(404, gin.H{"error": "API endpoint not found"})
				return
			}
			// Otherwise serve index.html for client-side routing
			c.File(filepath.Join(distPath, "index.html"))
		})

		log.Println("Static file serving enabled from ./dist")
	} else {
		log.Println("No dist directory found, API-only mode")
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	// 使用环境变量控制监听地址，Docker 环境需要 0.0.0.0
	host := os.Getenv("HOST")
	if host == "" {
		host = "0.0.0.0"
	}

	log.Printf("Server starting on %s:%s", host, port)
	log.Printf("API endpoints available at /api/*")
	log.Printf("Swagger documentation available at /swagger/index.html")
	if err := r.Run(host + ":" + port); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
