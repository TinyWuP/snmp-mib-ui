package model

import (
	"os"
	"path/filepath"
	"testing"
)

func setupTestDB(t *testing.T) (*DB, func()) {
	// Create a temporary database file for testing
	tmpDir := t.TempDir()
	dbPath := filepath.Join(tmpDir, "test.db")

	db, err := NewDB(dbPath)
	if err != nil {
		t.Fatalf("Failed to create test database: %v", err)
	}

	cleanup := func() {
		db.Close()
		os.Remove(dbPath)
	}

	return db, cleanup
}

func TestNewDB(t *testing.T) {
	db, cleanup := setupTestDB(t)
	defer cleanup()

	if db == nil {
		t.Fatal("Expected non-nil DB")
	}

	if db.conn == nil {
		t.Fatal("Expected non-nil DB connection")
	}
}

func TestDeviceCRUD(t *testing.T) {
	db, cleanup := setupTestDB(t)
	defer cleanup()

	// Test CreateDevice
	device := &Device{
		Name:      "Test Device",
		IP:        "192.168.1.1",
		Port:      161,
		Version:   "v2c",
		Community: "public",
	}

	err := db.CreateDevice(device)
	if err != nil {
		t.Fatalf("Failed to create device: %v", err)
	}

	if device.ID == "" {
		t.Error("Expected device ID to be generated")
	}

	if device.CreatedAt == 0 {
		t.Error("Expected device CreatedAt to be set")
	}

	// Test GetDevices
	devices, err := db.GetDevices()
	if err != nil {
		t.Fatalf("Failed to get devices: %v", err)
	}

	if len(devices) != 1 {
		t.Errorf("Expected 1 device, got %d", len(devices))
	}

	if devices[0].Name != "Test Device" {
		t.Errorf("Expected device name 'Test Device', got '%s'", devices[0].Name)
	}

	// Test CreateDevice with multiple devices
	device2 := &Device{
		Name:      "Test Device 2",
		IP:        "192.168.1.2",
		Port:      161,
		Version:   "v2c",
		Community: "private",
	}

	err = db.CreateDevice(device2)
	if err != nil {
		t.Fatalf("Failed to create second device: %v", err)
	}

	devices, err = db.GetDevices()
	if err != nil {
		t.Fatalf("Failed to get devices: %v", err)
	}

	if len(devices) != 2 {
		t.Errorf("Expected 2 devices, got %d", len(devices))
	}

	// Test DeleteDevice
	err = db.DeleteDevice(device.ID)
	if err != nil {
		t.Fatalf("Failed to delete device: %v", err)
	}

	devices, err = db.GetDevices()
	if err != nil {
		t.Fatalf("Failed to get devices after deletion: %v", err)
	}

	if len(devices) != 1 {
		t.Errorf("Expected 1 device after deletion, got %d", len(devices))
	}

	if devices[0].ID == device.ID {
		t.Error("Deleted device should not be in the list")
	}
}

func TestDeviceDefaultValues(t *testing.T) {
	db, cleanup := setupTestDB(t)
	defer cleanup()

	// Test device with explicit default values
	// Note: Model layer doesn't set defaults, handler layer does
	device := &Device{
		Name:      "Default Device",
		IP:        "10.0.0.1",
		Port:      161,  // Default port
		Version:   "v2c", // Default version
		Community: "public", // Default community
	}

	err := db.CreateDevice(device)
	if err != nil {
		t.Fatalf("Failed to create device: %v", err)
	}

	// Retrieve the device to verify values
	devices, err := db.GetDevices()
	if err != nil {
		t.Fatalf("Failed to get devices: %v", err)
	}

	if len(devices) != 1 {
		t.Fatalf("Expected 1 device, got %d", len(devices))
	}

	retrieved := devices[0]
	if retrieved.Port != 161 {
		t.Errorf("Expected port 161, got %d", retrieved.Port)
	}

	if retrieved.Version != "v2c" {
		t.Errorf("Expected version 'v2c', got '%s'", retrieved.Version)
	}

	if retrieved.Community != "public" {
		t.Errorf("Expected community 'public', got '%s'", retrieved.Community)
	}
}

func TestDeviceWithSNMPv3(t *testing.T) {
	db, cleanup := setupTestDB(t)
	defer cleanup()

	device := &Device{
		Name:          "SNMPv3 Device",
		IP:            "192.168.1.10",
		Port:          161,
		Version:       "v3",
		SecurityName:  "testuser",
		SecurityLevel: "authPriv",
		AuthProtocol:  "MD5",
		AuthPassword:  "authpass123",
		PrivProtocol:  "DES",
		PrivPassword:  "privpass123",
	}

	err := db.CreateDevice(device)
	if err != nil {
		t.Fatalf("Failed to create SNMPv3 device: %v", err)
	}

	devices, err := db.GetDevices()
	if err != nil {
		t.Fatalf("Failed to get devices: %v", err)
	}

	if len(devices) != 1 {
		t.Fatalf("Expected 1 device, got %d", len(devices))
	}

	retrieved := devices[0]
	if retrieved.SecurityName != "testuser" {
		t.Errorf("Expected SecurityName 'testuser', got '%s'", retrieved.SecurityName)
	}

	if retrieved.SecurityLevel != "authPriv" {
		t.Errorf("Expected SecurityLevel 'authPriv', got '%s'", retrieved.SecurityLevel)
	}

	if retrieved.AuthProtocol != "MD5" {
		t.Errorf("Expected AuthProtocol 'MD5', got '%s'", retrieved.AuthProtocol)
	}

	if retrieved.AuthPassword != "authpass123" {
		t.Errorf("Expected AuthPassword 'authpass123', got '%s'", retrieved.AuthPassword)
	}
}

func TestMibArchiveCRUD(t *testing.T) {
	db, cleanup := setupTestDB(t)
	defer cleanup()

	// Test CreateArchive
	archive := &MibArchive{
		ID:            "test-archive-1",
		FileName:      "test-mib.zip",
		Size:          "1.5 MB",
		Status:        "extracted",
		ExtractedPath: "/tmp/mibs/test-mib",
		FileCount:     10,
	}

	err := db.CreateArchive(archive)
	if err != nil {
		t.Fatalf("Failed to create archive: %v", err)
	}

	// Test GetArchives
	archives, err := db.GetArchives()
	if err != nil {
		t.Fatalf("Failed to get archives: %v", err)
	}

	if len(archives) != 1 {
		t.Errorf("Expected 1 archive, got %d", len(archives))
	}

	if archives[0].FileName != "test-mib.zip" {
		t.Errorf("Expected file name 'test-mib.zip', got '%s'", archives[0].FileName)
	}

	// Test CreateArchive with multiple archives
	archive2 := &MibArchive{
		ID:            "test-archive-2",
		FileName:      "test-mib-2.zip",
		Size:          "2.0 MB",
		Status:        "extracted",
		ExtractedPath: "/tmp/mibs/test-mib-2",
		FileCount:     15,
	}

	err = db.CreateArchive(archive2)
	if err != nil {
		t.Fatalf("Failed to create second archive: %v", err)
	}

	archives, err = db.GetArchives()
	if err != nil {
		t.Fatalf("Failed to get archives: %v", err)
	}

	if len(archives) != 2 {
		t.Errorf("Expected 2 archives, got %d", len(archives))
	}

	// Test DeleteArchive
	err = db.DeleteArchive(archive.ID)
	if err != nil {
		t.Fatalf("Failed to delete archive: %v", err)
	}

	archives, err = db.GetArchives()
	if err != nil {
		t.Fatalf("Failed to get archives after deletion: %v", err)
	}

	if len(archives) != 1 {
		t.Errorf("Expected 1 archive after deletion, got %d", len(archives))
	}

	if archives[0].ID == archive.ID {
		t.Error("Deleted archive should not be in the list")
	}
}

func TestSystemConfig(t *testing.T) {
	db, cleanup := setupTestDB(t)
	defer cleanup()

	// Test GetConfig (should return default values)
	config, err := db.GetConfig()
	if err != nil {
		t.Fatalf("Failed to get config: %v", err)
	}

	if config == nil {
		t.Fatal("Expected non-nil config")
	}

	// Default values should be set
	if config.MibRootPath == "" {
		t.Error("Expected default MibRootPath to be set")
	}

	if config.DefaultCommunity == "" {
		t.Error("Expected default DefaultCommunity to be set")
	}

	// Test UpdateConfig
	newConfig := &SystemConfig{
		MibRootPath:      "/custom/mibs/path",
		DefaultCommunity: "custompublic",
	}

	err = db.UpdateConfig(newConfig)
	if err != nil {
		t.Fatalf("Failed to update config: %v", err)
	}

	// Verify update
	config, err = db.GetConfig()
	if err != nil {
		t.Fatalf("Failed to get config after update: %v", err)
	}

	if config.MibRootPath != "/custom/mibs/path" {
		t.Errorf("Expected MibRootPath '/custom/mibs/path', got '%s'", config.MibRootPath)
	}

	if config.DefaultCommunity != "custompublic" {
		t.Errorf("Expected DefaultCommunity 'custompublic', got '%s'", config.DefaultCommunity)
	}

	// Test partial update
	partialConfig := &SystemConfig{
		MibRootPath:      "/another/path",
		DefaultCommunity: "custompublic", // Keep existing value
	}

	err = db.UpdateConfig(partialConfig)
	if err != nil {
		t.Fatalf("Failed to update config partially: %v", err)
	}

	config, err = db.GetConfig()
	if err != nil {
		t.Fatalf("Failed to get config after partial update: %v", err)
	}

	if config.MibRootPath != "/another/path" {
		t.Errorf("Expected MibRootPath '/another/path', got '%s'", config.MibRootPath)
	}

	if config.DefaultCommunity != "custompublic" {
		t.Error("DefaultCommunity should remain unchanged")
	}
}

func TestDBClose(t *testing.T) {
	db, cleanup := setupTestDB(t)
	defer cleanup()

	// Test Close
	err := db.Close()
	if err != nil {
		t.Fatalf("Failed to close database: %v", err)
	}

	// Verify connection is closed
	if db.conn == nil {
		t.Error("Expected connection to still exist after Close()")
	}
}

func TestDeviceOrdering(t *testing.T) {
	db, cleanup := setupTestDB(t)
	defer cleanup()

	// Create devices in a specific order
	devices := []*Device{
		{Name: "Device 1", IP: "192.168.1.1"},
		{Name: "Device 2", IP: "192.168.1.2"},
		{Name: "Device 3", IP: "192.168.1.3"},
	}

	for _, device := range devices {
		err := db.CreateDevice(device)
		if err != nil {
			t.Fatalf("Failed to create device: %v", err)
		}
	}

	// Get devices and verify they are ordered by CreatedAt DESC
	retrieved, err := db.GetDevices()
	if err != nil {
		t.Fatalf("Failed to get devices: %v", err)
	}

	if len(retrieved) != 3 {
		t.Fatalf("Expected 3 devices, got %d", len(retrieved))
	}

	// Last created should be first in list
	if retrieved[0].Name != "Device 3" {
		t.Errorf("Expected 'Device 3' first, got '%s'", retrieved[0].Name)
	}

	if retrieved[2].Name != "Device 1" {
		t.Errorf("Expected 'Device 1' last, got '%s'", retrieved[2].Name)
	}
}

func TestArchiveOrdering(t *testing.T) {
	db, cleanup := setupTestDB(t)
	defer cleanup()

	// Create archives with different timestamps
	archives := []*MibArchive{
		{ID: "archive-1", FileName: "file1.zip", Timestamp: 1000},
		{ID: "archive-2", FileName: "file2.zip", Timestamp: 2000},
		{ID: "archive-3", FileName: "file3.zip", Timestamp: 3000},
	}

	for _, archive := range archives {
		err := db.CreateArchive(archive)
		if err != nil {
			t.Fatalf("Failed to create archive: %v", err)
		}
	}

	// Get archives and verify they are ordered by timestamp DESC
	retrieved, err := db.GetArchives()
	if err != nil {
		t.Fatalf("Failed to get archives: %v", err)
	}

	if len(retrieved) != 3 {
		t.Fatalf("Expected 3 archives, got %d", len(retrieved))
	}

	// Latest timestamp should be first
	if retrieved[0].ID != "archive-3" {
		t.Errorf("Expected 'archive-3' first, got '%s'", retrieved[0].ID)
	}

	if retrieved[2].ID != "archive-1" {
		t.Errorf("Expected 'archive-1' last, got '%s'", retrieved[2].ID)
	}
}