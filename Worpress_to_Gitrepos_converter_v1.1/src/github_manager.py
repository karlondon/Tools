"""
GitHub Repository Manager
Handles Git operations and GitHub API interactions
"""

import os
from pathlib import Path
from typing import Dict, Any, Optional, List
from datetime import datetime
import git
from github import Github, GithubException
from loguru import logger

class GitHubManagerError(Exception):
    """Custom exception for GitHub manager errors"""
    pass

class GitHubManager:
    """Manages Git operations and GitHub repository interactions"""
    
    def __init__(self, token: str, username: str, repository: str,
                 branch: str = 'main', create_if_missing: bool = True,
                 visibility: str = 'public'):
        """
        Initialize GitHub Manager
        
        Args:
            token: GitHub personal access token
            username: GitHub username
            repository: Repository name
            branch: Target branch
            create_if_missing: Create repository if it doesn't exist
            visibility: Repository visibility (public/private)
        """
        self.token = token
        self.username = username
        self.repository = repository
        self.branch = branch
        self.create_if_missing = create_if_missing
        self.visibility = visibility
        
        # Initialize GitHub client
        self.gh = Github(token)
        self.repo = None
        self.git_repo = None
        
        # Setup repository
        self._setup_repository()
    
    def _setup_repository(self) -> None:
        """Setup GitHub repository"""
        try:
            # Try to get existing repository
            self.repo = self.gh.get_user().get_repo(self.repository)
            logger.info(f"Found existing repository: {self.username}/{self.repository}")
        except GithubException as e:
            if e.status == 404 and self.create_if_missing:
                # Create new repository
                logger.info(f"Creating new repository: {self.username}/{self.repository}")
                user = self.gh.get_user()
                self.repo = user.create_repo(
                    name=self.repository,
                    private=(self.visibility == 'private'),
                    auto_init=True,
                    description="Migrated from WordPress"
                )
                logger.info(f"Repository created successfully")
            else:
                raise GitHubManagerError(f"Failed to access repository: {e}")
    
    def clone_or_init_repo(self, local_path: Path) -> None:
        """
        Clone repository or initialize new one
        
        Args:
            local_path: Local path for repository
        """
        local_path = Path(local_path)
        
        if local_path.exists() and (local_path / '.git').exists():
            # Open existing repository
            logger.info(f"Opening existing repository at {local_path}")
            self.git_repo = git.Repo(local_path)
        else:
            # Clone repository
            logger.info(f"Cloning repository to {local_path}")
            local_path.mkdir(parents=True, exist_ok=True)
            
            clone_url = self.repo.clone_url
            # Replace with authenticated URL
            auth_url = clone_url.replace(
                'https://',
                f'https://{self.token}@'
            )
            
            try:
                self.git_repo = git.Repo.clone_from(
                    auth_url,
                    local_path,
                    branch=self.branch
                )
                logger.info("Repository cloned successfully")
            except git.exc.GitCommandError as e:
                # If clone fails, init new repo
                logger.warning(f"Clone failed, initializing new repository: {e}")
                self.git_repo = git.Repo.init(local_path)
                
                # Add remote
                try:
                    origin = self.git_repo.create_remote('origin', clone_url)
                except git.exc.GitCommandError:
                    origin = self.git_repo.remote('origin')
                    origin.set_url(clone_url)
    
    def commit_changes(self, message: str, author_name: Optional[str] = None,
                      author_email: Optional[str] = None) -> bool:
        """
        Commit changes to repository
        
        Args:
            message: Commit message
            author_name: Author name
            author_email: Author email
            
        Returns:
            True if changes were committed, False if no changes
        """
        if not self.git_repo:
            raise GitHubManagerError("Repository not initialized")
        
        # Check if there are changes
        if not self.git_repo.is_dirty(untracked_files=True):
            logger.info("No changes to commit")
            return False
        
        # Add all changes
        self.git_repo.git.add(A=True)
        
        # Format commit message with date
        formatted_message = message.format(
            date=datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        )
        
        # Create commit with author info if provided
        if author_name and author_email:
            actor = git.Actor(author_name, author_email)
            self.git_repo.index.commit(
                formatted_message,
                author=actor,
                committer=actor
            )
        else:
            self.git_repo.index.commit(formatted_message)
        
        logger.info(f"Changes committed: {formatted_message}")
        return True
    
    def push_changes(self, force: bool = False) -> bool:
        """
        Push changes to GitHub
        
        Args:
            force: Force push (use with caution)
            
        Returns:
            True if successful
        """
        if not self.git_repo:
            raise GitHubManagerError("Repository not initialized")
        
        try:
            origin = self.git_repo.remote('origin')
            
            # Check if branch exists on remote
            try:
                origin.fetch()
            except git.exc.GitCommandError:
                pass
            
            # Push changes
            if force:
                logger.warning("Force pushing changes to GitHub")
                origin.push(refspec=f'{self.branch}:{self.branch}', force=True)
            else:
                logger.info("Pushing changes to GitHub")
                # Try to pull first to avoid conflicts
                try:
                    origin.pull(self.branch)
                except git.exc.GitCommandError as e:
                    logger.warning(f"Pull failed, proceeding with push: {e}")
                
                origin.push(refspec=f'{self.branch}:{self.branch}')
            
            logger.info("Changes pushed successfully")
            return True
        except git.exc.GitCommandError as e:
            raise GitHubManagerError(f"Failed to push changes: {e}")
    
    def create_gitignore(self, patterns: List[str]) -> None:
        """
        Create .gitignore file
        
        Args:
            patterns: List of patterns to ignore
        """
        if not self.git_repo:
            raise GitHubManagerError("Repository not initialized")
        
        gitignore_path = Path(self.git_repo.working_dir) / '.gitignore'
        
        # Read existing patterns if file exists
        existing_patterns = set()
        if gitignore_path.exists():
            with open(gitignore_path, 'r') as f:
                existing_patterns = set(line.strip() for line in f if line.strip())
        
        # Add new patterns
        all_patterns = existing_patterns.union(set(patterns))
        
        # Write gitignore
        with open(gitignore_path, 'w') as f:
            f.write('\n'.join(sorted(all_patterns)))
            f.write('\n')
        
        logger.info(f"Created .gitignore with {len(all_patterns)} patterns")
    
    def create_readme(self, content: str) -> None:
        """
        Create or update README.md
        
        Args:
            content: README content
        """
        if not self.git_repo:
            raise GitHubManagerError("Repository not initialized")
        
        readme_path = Path(self.git_repo.working_dir) / 'README.md'
        
        with open(readme_path, 'w', encoding='utf-8') as f:
            f.write(content)
        
        logger.info("Created/updated README.md")
    
    def get_repository_url(self) -> str:
        """Get repository URL"""
        if self.repo:
            return self.repo.html_url
        return f"https://github.com/{self.username}/{self.repository}"
    
    def get_pages_url(self) -> str:
        """Get GitHub Pages URL"""
        return f"https://{self.username}.github.io/{self.repository}/"
    
    def enable_github_pages(self, branch: Optional[str] = None) -> bool:
        """
        Enable GitHub Pages for repository
        
        Args:
            branch: Branch to use for Pages (defaults to configured branch)
            
        Returns:
            True if successful
        """
        if not self.repo:
            raise GitHubManagerError("Repository not initialized")
        
        branch = branch or self.branch
        
        try:
            # Enable Pages via API
            self.repo.create_pages_site(branch=branch, path='/')
            logger.info(f"GitHub Pages enabled on branch: {branch}")
            return True
        except GithubException as e:
            if 'already enabled' in str(e).lower():
                logger.info("GitHub Pages already enabled")
                return True
            logger.warning(f"Could not enable GitHub Pages: {e}")
            return False
    
    def get_working_directory(self) -> Path:
        """Get working directory of repository"""
        if not self.git_repo:
            raise GitHubManagerError("Repository not initialized")
        return Path(self.git_repo.working_dir)
    
    def __repr__(self) -> str:
        """String representation"""
        return f"GitHubManager(repo='{self.username}/{self.repository}', branch='{self.branch}')"