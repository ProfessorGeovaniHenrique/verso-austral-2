import { GitHubWorkflowRun, GitHubRelease, GitHubRepository } from '@/types/devops.types';

const GITHUB_API_BASE = 'https://api.github.com';
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

interface CachedData<T> {
  data: T;
  timestamp: number;
}

class GitHubApiService {
  private cache = new Map<string, CachedData<any>>();
  private owner: string = '';
  private repo: string = '';
  private token?: string;

  constructor() {
    // Try to extract repo info from URL or use env variables
    this.initializeRepoInfo();
  }

  private initializeRepoInfo() {
    // In production, these could come from environment variables or be configured
    // For now, we'll try to detect from the current URL
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      // This is a placeholder - in real usage, configure this properly
      this.owner = 'your-github-username';
      this.repo = 'your-repo-name';
    }
  }

  setRepository(owner: string, repo: string, token?: string) {
    this.owner = owner;
    this.repo = repo;
    this.token = token;
    this.cache.clear();
  }

  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Accept': 'application/vnd.github.v3+json',
    };
    
    if (this.token) {
      headers['Authorization'] = `token ${this.token}`;
    }
    
    return headers;
  }

  private getCachedData<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (!cached) return null;
    
    const isExpired = Date.now() - cached.timestamp > CACHE_TTL;
    if (isExpired) {
      this.cache.delete(key);
      return null;
    }
    
    return cached.data as T;
  }

  private setCachedData<T>(key: string, data: T) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  async getWorkflowRuns(branch?: string, limit: number = 10): Promise<GitHubWorkflowRun[]> {
    const cacheKey = `workflows_${branch || 'all'}_${limit}`;
    const cached = this.getCachedData<GitHubWorkflowRun[]>(cacheKey);
    if (cached) return cached;

    try {
      const url = `${GITHUB_API_BASE}/repos/${this.owner}/${this.repo}/actions/runs?per_page=${limit}${branch ? `&branch=${branch}` : ''}`;
      const response = await fetch(url, { headers: this.getHeaders() });
      
      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.statusText}`);
      }
      
      const data = await response.json();
      const runs = data.workflow_runs as GitHubWorkflowRun[];
      
      this.setCachedData(cacheKey, runs);
      return runs;
    } catch (error) {
      console.error('Error fetching workflow runs:', error);
      return [];
    }
  }

  async getReleases(limit: number = 10): Promise<GitHubRelease[]> {
    const cacheKey = `releases_${limit}`;
    const cached = this.getCachedData<GitHubRelease[]>(cacheKey);
    if (cached) return cached;

    try {
      const url = `${GITHUB_API_BASE}/repos/${this.owner}/${this.repo}/releases?per_page=${limit}`;
      const response = await fetch(url, { headers: this.getHeaders() });
      
      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.statusText}`);
      }
      
      const releases = await response.json() as GitHubRelease[];
      
      this.setCachedData(cacheKey, releases);
      return releases;
    } catch (error) {
      console.error('Error fetching releases:', error);
      return [];
    }
  }

  async getRepository(): Promise<GitHubRepository | null> {
    const cacheKey = 'repository';
    const cached = this.getCachedData<GitHubRepository>(cacheKey);
    if (cached) return cached;

    try {
      const url = `${GITHUB_API_BASE}/repos/${this.owner}/${this.repo}`;
      const response = await fetch(url, { headers: this.getHeaders() });
      
      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.statusText}`);
      }
      
      const repo = await response.json() as GitHubRepository;
      
      this.setCachedData(cacheKey, repo);
      return repo;
    } catch (error) {
      console.error('Error fetching repository:', error);
      return null;
    }
  }

  async getBranches(): Promise<string[]> {
    const cacheKey = 'branches';
    const cached = this.getCachedData<string[]>(cacheKey);
    if (cached) return cached;

    try {
      const url = `${GITHUB_API_BASE}/repos/${this.owner}/${this.repo}/branches`;
      const response = await fetch(url, { headers: this.getHeaders() });
      
      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.statusText}`);
      }
      
      const branches = await response.json();
      const branchNames = branches.map((b: any) => b.name);
      
      this.setCachedData(cacheKey, branchNames);
      return branchNames;
    } catch (error) {
      console.error('Error fetching branches:', error);
      return ['main', 'develop'];
    }
  }

  clearCache() {
    this.cache.clear();
  }
}

export const githubApi = new GitHubApiService();
