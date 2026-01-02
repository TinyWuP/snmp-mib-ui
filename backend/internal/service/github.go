package service

import (
	"encoding/json"
	"fmt"
	"net/http"
	"sync"
	"time"
)

type GitHubService struct {
	client *http.Client
	cache  map[string]*versionCache
	mu     sync.RWMutex
}

type versionCache struct {
	versions  []string
	expiresAt time.Time
}

type githubRelease struct {
	TagName string `json:"tag_name"`
}

var collectorRepos = map[string]string{
	"snmp-exporter": "prometheus/snmp_exporter",
	"telegraf":      "influxdata/telegraf",
	"categraf":      "flashcatcloud/categraf",
}

var fallbackVersions = map[string][]string{
	"snmp-exporter": {"v0.27.0", "v0.26.0", "v0.25.0", "v0.24.0", "v0.23.0"},
	"telegraf":      {"1.32.1", "1.31.0", "1.30.0", "1.29.0", "1.28.0"},
	"categraf":      {"v0.3.72", "v0.3.71", "v0.3.70", "v0.3.60", "v0.3.50"},
}

func NewGitHubService() *GitHubService {
	return &GitHubService{
		client: &http.Client{Timeout: 10 * time.Second},
		cache:  make(map[string]*versionCache),
	}
}

func (s *GitHubService) GetVersions(collector string) ([]string, bool, error) {
	repo, ok := collectorRepos[collector]
	if !ok {
		return nil, false, fmt.Errorf("unknown collector: %s", collector)
	}

	// Check cache
	s.mu.RLock()
	if cached, exists := s.cache[collector]; exists && time.Now().Before(cached.expiresAt) {
		s.mu.RUnlock()
		return cached.versions, false, nil
	}
	s.mu.RUnlock()

	// Fetch from GitHub
	url := fmt.Sprintf("https://api.github.com/repos/%s/releases?per_page=15", repo)
	req, _ := http.NewRequest("GET", url, nil)
	req.Header.Set("Accept", "application/vnd.github.v3+json")
	req.Header.Set("User-Agent", "SNMP-MIB-Explorer")

	resp, err := s.client.Do(req)
	if err != nil {
		return s.getFallback(collector), true, nil
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		return s.getFallback(collector), true, nil
	}

	var releases []githubRelease
	if err := json.NewDecoder(resp.Body).Decode(&releases); err != nil {
		return s.getFallback(collector), true, nil
	}

	versions := make([]string, 0, len(releases))
	for _, r := range releases {
		if r.TagName != "" {
			versions = append(versions, r.TagName)
		}
	}

	if len(versions) == 0 {
		return s.getFallback(collector), true, nil
	}

	// Update cache (30 minutes)
	s.mu.Lock()
	s.cache[collector] = &versionCache{
		versions:  versions,
		expiresAt: time.Now().Add(30 * time.Minute),
	}
	s.mu.Unlock()

	return versions, false, nil
}

func (s *GitHubService) getFallback(collector string) []string {
	if versions, ok := fallbackVersions[collector]; ok {
		return versions
	}
	return []string{"latest"}
}
