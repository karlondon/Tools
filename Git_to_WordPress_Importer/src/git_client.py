"""Git repository operations"""

import os
import shutil
from pathlib import Path
from typing import Optional, List, Dict
import git
from git import Repo

class GitClient:
    """Handle Git repository operations"""
    
    def __init__(self, repo_url: str, branch: str = "main", token: Optional[str] = None):
        """Initialize Git client
        
        Args:
            repo_url: Git repository URL or local path
            branch: Branch to use
            token: GitHub token for private repos
        """
        self.repo_url = repo_url
        self.branch = branch
        self.token = token
        self.repo: Optional[Repo] = None
        self.local_path: Optional[Path] = None
        
    def is_local_path(self) -> bool:
        """Check if repository is a local path"""
        return os.path.exists(self.repo_url)
    
    def clone_or_pull(self, local_path: str = "temp_repo") -> str:
        """Clone repository or pull latest changes
        
        Args:
            local_path: Local directory to clone into
            
        Returns:
            Path to local repository
        """
        # If it's a local path, use it directly
        if self.is_local_path():
            print(f"Using local repository: {self.repo_url}")
            self.local_path = Path(self.repo_url)
            self.repo = Repo(self.repo_url)
            return self.repo_url
        
        self.local_path = Path(local_path)
        
        # Clone or pull remote repository
        if self.local_path.exists():
            print(f"Pulling latest changes from {self.branch}...")
            self.repo = Repo(str(self.local_path))
            origin = self.repo.remotes.origin
            origin.pull(self.branch)
        else:
            print(f"Cloning repository: {self.repo_url}")
            # Add token to URL if provided
            clone_url = self._add_token_to_url(self.repo_url)
            self.repo = Repo.clone_from(clone_url, str(self.local_path), branch=self.branch)
        
        return str(self.local_path)
    
    def _add_token_to_url(self, url: str) -> str:
        """Add GitHub token to URL for authentication
        
        Args:
            url: Git URL
            
        Returns:
            URL with token
        """
        if not self.token:
            return url
        
        # Add token for GitHub URLs
        if 'github.com' in url:
            if url.startswith('https://'):
                return url.replace('https://', f'https://{self.token}@')
        
        return url
    
    def get_files_by_pattern(self, pattern: str, directory: str = "") -> List[Path]:
        """Get files matching a pattern
        
        Args:
            pattern: File pattern (e.g., '*.md')
            directory: Subdirectory to search in
            
        Returns:
            List of matching file paths
        """
        if not self.local_path:
            raise ValueError("Repository not cloned. Call clone_or_pull() first.")
        
        search_path = self.local_path / directory if directory else self.local_path
        return list(search_path.rglob(pattern))
    
    def get_file_content(self, file_path: str) -> str:
        """Read file content from repository
        
        Args:
            file_path: Path to file relative to repo root
            
        Returns:
            File content as string
        """
        if not self.local_path:
            raise ValueError("Repository not cloned. Call clone_or_pull() first.")
        
        full_path = self.local_path / file_path
        with open(full_path, 'r', encoding='utf-8') as f:
            return f.read()
    
    def get_changed_files(self, since_commit: Optional[str] = None) -> List[str]:
        """Get list of files changed since commit
        
        Args:
            since_commit: Commit hash to compare from (None for all files)
            
        Returns:
            List of changed file paths
        """
        if not self.repo:
            raise ValueError("Repository not initialized")
        
        if since_commit:
            # Get files changed since specific commit
            commit = self.repo.commit(since_commit)
            diff = commit.diff(None)
            return [item.a_path for item in diff]
        else:
            # Return all tracked files
            return [item.path for item in self.repo.tree().traverse()]
    
    def cleanup(self):
        """Clean up temporary repository"""
        if self.local_path and not self.is_local_path() and self.local_path.exists():
            print(f"Cleaning up temporary repository: {self.local_path}")
            shutil.rmtree(self.local_path)