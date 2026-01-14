package model

import (
	"database/sql"
	"strings"
	"time"

	"github.com/google/uuid"
	_ "modernc.org/sqlite"
)

type Device struct {
	ID            string `json:"id"`
	Name          string `json:"name"`
	IP            string `json:"ip"`
	Port          int    `json:"port"`
	Version       string `json:"version"` // v1, v2c, v3
	Community     string `json:"community"`
	SecurityName  string `json:"securityName,omitempty"`
	SecurityLevel string `json:"securityLevel,omitempty"`
	AuthProtocol  string `json:"authProtocol,omitempty"`
	AuthPassword  string `json:"authPassword,omitempty"`
	PrivProtocol  string `json:"privProtocol,omitempty"`
	PrivPassword  string `json:"privPassword,omitempty"`
	// SSH credentials
	SSHUsername string `json:"sshUsername,omitempty"`
	SSHPassword string `json:"sshPassword,omitempty"`
	SSHPort     int    `json:"sshPort,omitempty"`
	CreatedAt   int64  `json:"createdAt"`
}

type MibArchive struct {
	ID            string    `json:"id"`
	FileName      string    `json:"fileName"`
	Size          string    `json:"size"`
	Status        string    `json:"status"`
	ExtractedPath string    `json:"extractedPath"`
	Timestamp     int64     `json:"timestamp"`
	FileCount     int       `json:"fileCount"`          // Only store count, not content
	Files         []MibFile `json:"files,omitempty"`    // Loaded on demand, not stored in DB
}

type MibFile struct {
	ID       string    `json:"id"`
	Name     string    `json:"name"`
	Path     string    `json:"path"`
	Content  string    `json:"-"`              // Not stored, read from file when needed
	Nodes    []MibNode `json:"nodes,omitempty"` // Loaded on demand from .meta.json file
	IsParsed bool      `json:"isParsed"`
}

type MibNode struct {
	Name        string    `json:"name"`
	OID         string    `json:"oid"`
	Type        string    `json:"type,omitempty"`
	Access      string    `json:"access,omitempty"`
	Status      string    `json:"status,omitempty"`
	Description string    `json:"description,omitempty"`
	Syntax      string    `json:"syntax,omitempty"`
	ParentOID   string    `json:"parentOid,omitempty"`
	Children    []MibNode `json:"children"`
}

type SystemConfig struct {
	MibRootPath      string `json:"mibRootPath"`
	DefaultCommunity string `json:"defaultCommunity"`
}

type DB struct {
	conn *sql.DB
}

func NewDB(dbPath string) (*DB, error) {
	conn, err := sql.Open("sqlite", dbPath)
	if err != nil {
		return nil, err
	}

	db := &DB{conn: conn}
	if err := db.init(); err != nil {
		return nil, err
	}

	return db, nil
}

func (db *DB) init() error {
	schema := `
	CREATE TABLE IF NOT EXISTS devices (
		id TEXT PRIMARY KEY,
		name TEXT NOT NULL,
		ip TEXT NOT NULL,
		port INTEGER DEFAULT 161,
		version TEXT DEFAULT 'v2c',
		community TEXT DEFAULT 'public',
		security_name TEXT,
		security_level TEXT,
		auth_protocol TEXT,
		auth_password TEXT,
		priv_protocol TEXT,
		priv_password TEXT,
		ssh_username TEXT,
		ssh_password TEXT,
		ssh_port INTEGER DEFAULT 22,
		created_at INTEGER
	);

	CREATE TABLE IF NOT EXISTS mib_archives (
		id TEXT PRIMARY KEY,
		file_name TEXT NOT NULL,
		size TEXT,
		status TEXT DEFAULT 'extracted',
		extracted_path TEXT,
		timestamp INTEGER,
		file_count INTEGER DEFAULT 0
	);

	CREATE TABLE IF NOT EXISTS system_config (
		key TEXT PRIMARY KEY,
		value TEXT
	);

	INSERT OR IGNORE INTO system_config (key, value) VALUES ('mibRootPath', '/etc/snmp/mibs');
	INSERT OR IGNORE INTO system_config (key, value) VALUES ('defaultCommunity', 'public');
	`
	_, err := db.conn.Exec(schema)
	if err != nil {
		return err
	}

	// Add SSH columns if they don't exist (for backward compatibility)
	_, err = db.conn.Exec(`ALTER TABLE devices ADD COLUMN ssh_username TEXT`)
	if err != nil && !strings.Contains(err.Error(), "duplicate column") {
		return err
	}
	_, err = db.conn.Exec(`ALTER TABLE devices ADD COLUMN ssh_password TEXT`)
	if err != nil && !strings.Contains(err.Error(), "duplicate column") {
		return err
	}
	_, err = db.conn.Exec(`ALTER TABLE devices ADD COLUMN ssh_port INTEGER DEFAULT 22`)
	if err != nil && !strings.Contains(err.Error(), "duplicate column") {
		return err
	}

	return nil
}

func (db *DB) Close() error {
	return db.conn.Close()
}

// Device CRUD
func (db *DB) GetDevices() ([]Device, error) {
	rows, err := db.conn.Query(`SELECT id, name, ip, port, version, community,
		security_name, security_level, auth_protocol, auth_password, priv_protocol, priv_password,
		ssh_username, ssh_password, ssh_port, created_at
		FROM devices ORDER BY created_at DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var devices []Device
	for rows.Next() {
		var d Device
		var secName, secLevel, authProto, authPass, privProto, privPass sql.NullString
		var sshUser, sshPass sql.NullString
		var sshPort sql.NullInt64
		err := rows.Scan(&d.ID, &d.Name, &d.IP, &d.Port, &d.Version, &d.Community,
			&secName, &secLevel, &authProto, &authPass, &privProto, &privPass,
			&sshUser, &sshPass, &sshPort, &d.CreatedAt)
		if err != nil {
			return nil, err
		}
		d.SecurityName = secName.String
		d.SecurityLevel = secLevel.String
		d.AuthProtocol = authProto.String
		d.AuthPassword = authPass.String
		d.PrivProtocol = privProto.String
		d.PrivPassword = privPass.String
		d.SSHUsername = sshUser.String
		d.SSHPassword = sshPass.String
		if sshPort.Valid {
			d.SSHPort = int(sshPort.Int64)
		}
		devices = append(devices, d)
	}
	return devices, nil
}

func (db *DB) CreateDevice(d *Device) error {
	if d.ID == "" {
		d.ID = uuid.New().String()
	}
	d.CreatedAt = time.Now().UnixMilli()

	_, err := db.conn.Exec(`INSERT INTO devices (id, name, ip, port, version, community,
		security_name, security_level, auth_protocol, auth_password, priv_protocol, priv_password,
		ssh_username, ssh_password, ssh_port, created_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		d.ID, d.Name, d.IP, d.Port, d.Version, d.Community,
		d.SecurityName, d.SecurityLevel, d.AuthProtocol, d.AuthPassword, d.PrivProtocol, d.PrivPassword,
		d.SSHUsername, d.SSHPassword, d.SSHPort, d.CreatedAt)
	return err
}

func (db *DB) DeleteDevice(id string) error {
	_, err := db.conn.Exec(`DELETE FROM devices WHERE id = ?`, id)
	return err
}

// MIB Archive CRUD
func (db *DB) GetArchives() ([]MibArchive, error) {
	rows, err := db.conn.Query(`SELECT id, file_name, size, status, extracted_path, timestamp, file_count
		FROM mib_archives ORDER BY timestamp DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var archives []MibArchive
	for rows.Next() {
		var a MibArchive
		err := rows.Scan(&a.ID, &a.FileName, &a.Size, &a.Status, &a.ExtractedPath, &a.Timestamp, &a.FileCount)
		if err != nil {
			return nil, err
		}
		archives = append(archives, a)
	}
	return archives, nil
}

func (db *DB) CreateArchive(a *MibArchive) error {
	_, err := db.conn.Exec(`INSERT INTO mib_archives (id, file_name, size, status, extracted_path, timestamp, file_count)
		VALUES (?, ?, ?, ?, ?, ?, ?)`,
		a.ID, a.FileName, a.Size, a.Status, a.ExtractedPath, a.Timestamp, a.FileCount)
	return err
}

func (db *DB) DeleteArchive(id string) error {
	_, err := db.conn.Exec(`DELETE FROM mib_archives WHERE id = ?`, id)
	return err
}

// System Config
func (db *DB) GetConfig() (*SystemConfig, error) {
	config := &SystemConfig{}
	rows, err := db.conn.Query(`SELECT key, value FROM system_config`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	for rows.Next() {
		var key, value string
		if err := rows.Scan(&key, &value); err != nil {
			return nil, err
		}
		switch key {
		case "mibRootPath":
			config.MibRootPath = value
		case "defaultCommunity":
			config.DefaultCommunity = value
		}
	}
	return config, nil
}

func (db *DB) UpdateConfig(config *SystemConfig) error {
	tx, err := db.conn.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	_, err = tx.Exec(`UPDATE system_config SET value = ? WHERE key = 'mibRootPath'`, config.MibRootPath)
	if err != nil {
		return err
	}
	_, err = tx.Exec(`UPDATE system_config SET value = ? WHERE key = 'defaultCommunity'`, config.DefaultCommunity)
	if err != nil {
		return err
	}

	return tx.Commit()
}
