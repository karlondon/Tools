#!/usr/bin/env python3
"""
Setup Script - Automated setup for Bidirectional WordPress Sync
Helps configure and initialize the sync system
"""

import os
import sys
import yaml
import subprocess
from pathlib import Path
from typing import Dict, Optional

class Colors:
    """ANSI color codes for terminal output."""
    HEADER = '\033[95m'
    BLUE = '\033[94m'
    CYAN = '\033[96m'
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    END = '\033[0m'
    BOLD = '\033[1m'

def print_header(text: str):
    """Print a header with formatting."""
    print(f"\n{Colors.HEADER}{Colors.BOLD}{'='*60}{Colors.END}")
    print(f"{Colors.HEADER}{Colors.BOLD}{text.center(60)}{Colors.END}")
    print(f"{Colors.HEADER}{Colors.BOLD}{'='*60}{Colors.END}\n")

def print_success(text: str):
    """Print success message."""
    print(f"{Colors.GREEN}✅ {text}{Colors.END}")

def print_error(text: str):
    """Print error message."""
    print(f"{Colors.RED}❌ {text}{Colors.END}")

def print_warning(text: str):
    """Print warning message."""
    print(f"{Colors.YELLOW}⚠️  {text}{Colors.END}")

def print_info(text: str):
    """Print info message."""
    print(f"{Colors.CYAN}ℹ️  {text}{Colors.END}")

def check_prerequisites() -> bool:
    """Check if all prerequisites are installed."""
    print_header("Checking Prerequisites")
    
    all_ok = True
    
    # Check Python version
    python_version = sys.version_info
    if python_version.major >= 3 and python_version.minor >= 8:
        print_success(f"Python {python_version.major}.{python_version.minor}.{python_version.micro}")
    else:
        print_error(f"Python 3.8+ required, found {python_version.major}.{python_version.minor}")
        all_ok = False
    
    # Check Git
    try:
        result = subprocess.run(['git', '--version'], capture_output=True, text=True)
        if result.returncode == 0:
            print_success(f"Git {result.stdout.strip()}")
        else:
            print_error("Git not found")
            all_ok = False
    except FileNotFoundError:
        print_error("Git not installed")
        all_ok = False
    
    # Check pip
    try:
        result = subprocess.run([sys.executable, '-m', 'pip', '--version'], capture_output=True, text=True)
        if result.returncode == 0:
            print_success("pip installed")
        else:
            print_error("pip not found")
            all_ok = False
    except:
        print_error("pip not available")
        all_ok = False
    
    return all_ok

def install_dependencies() -> bool:
    """Install Python dependencies."""
    print_header("Installing Dependencies")
    
    try:
        print_info("Installing required Python packages...")
        result = subprocess.run(
            [sys.executable, '-m', 'pip', 'install', '-r', 'requirements.txt'],
            capture_output=True,
            text=True
        )
        
        if result.returncode == 0:
            print_success("Dependencies installed successfully")
            return True
        else:
            print_error(f"Failed to install dependencies: {result.stderr}")
            return False
    except Exception as e:
        print_error(f"Error installing dependencies: {e}")
        return False

def create_config() -> bool:
    """Create config.yaml from template."""
    print_header("Configuration Setup")
    
    if os.path.exists('config.yaml'):
        response = input(f"{Colors.YELLOW}config.yaml already exists. Overwrite? (y/n): {Colors.END}")
        if response.lower() != 'y':
            print_info("Keeping existing config.yaml")
            return True
    
    try:
        import shutil
        shutil.copy('config.template.yaml', 'config.yaml')
        print_success("Created config.yaml from template")
        print_warning("Please edit config.yaml with your WordPress and GitHub credentials")
        return True
    except Exception as e:
        print_error(f"Failed to create config.yaml: {e}")
        return False

def setup_github_actions():
    """Setup GitHub Actions workflow."""
    print_header("GitHub Actions Setup")
    
    print_info("To enable automatic WordPress → GitHub sync:")
    print(f"\n1. Copy the workflow file to your blog repository:")
    print(f"   {Colors.CYAN}cp workflows/wordpress_to_github.yml YOUR_REPO/.github/workflows/{Colors.END}")
    
    print(f"\n2. Configure GitHub Secrets in your repository:")
    print(f"   Go to: https://github.com/YOUR_USERNAME/YOUR_REPO/settings/secrets/actions")
    print(f"   Add these secrets:")
    print(f"   - {Colors.BOLD}WP_SITE_URL{Colors.END}: Your WordPress site URL")
    print(f"   - {Colors.BOLD}WP_USERNAME{Colors.END}: Your WordPress username")
    print(f"   - {Colors.BOLD}WP_APP_PASSWORD{Colors.END}: Your WordPress application password")
    
    print(f"\n3. Commit and push the workflow file")
    print(f"   The workflow will run automatically on schedule")

def setup_watch_service():
    """Setup watch service for Git → WordPress sync."""
    print_header("Watch Service Setup")
    
    print_info("To enable automatic GitHub → WordPress sync:")
    print(f"\n{Colors.BOLD}Option 1: Run in terminal (for testing){Colors.END}")
    print(f"   {Colors.CYAN}python3 services/run_watch_service.py{Colors.END}")
    
    print(f"\n{Colors.BOLD}Option 2: Install as system service{Colors.END}")
    
    if sys.platform == 'darwin':
        print(f"   macOS:")
        print(f"   {Colors.CYAN}python3 services/install_service.py --platform macos{Colors.END}")
        print(f"   {Colors.CYAN}launchctl load ~/Library/LaunchAgents/com.wp-sync.plist{Colors.END}")
    elif sys.platform.startswith('linux'):
        print(f"   Linux:")
        print(f"   {Colors.CYAN}sudo python3 services/install_service.py --platform linux{Colors.END}")
        print(f"   {Colors.CYAN}sudo systemctl start wp-sync{Colors.END}")
        print(f"   {Colors.CYAN}sudo systemctl enable wp-sync{Colors.END}")

def test_configuration() -> bool:
    """Test WordPress and GitHub connections."""
    print_header("Testing Configuration")
    
    if not os.path.exists('config.yaml'):
        print_error("config.yaml not found. Please create it first.")
        return False
    
    try:
        with open('config.yaml', 'r') as f:
            config = yaml.safe_load(f)
        
        print_info("Testing WordPress connection...")
        
        import requests
        wp = config.get('wordpress', {})
        wp_url = wp.get('site_url')
        wp_username = wp.get('username')
        wp_password = wp.get('app_password') or wp.get('password')
        
        if not all([wp_url, wp_username, wp_password]):
            print_error("WordPress configuration incomplete")
            return False
        
        # Test WordPress REST API
        url = f"{wp_url}/wp-json/"
        auth = (wp_username, wp_password)
        response = requests.get(url, auth=auth, timeout=10)
        
        if response.status_code == 200:
            print_success("WordPress connection successful!")
        else:
            print_error(f"WordPress connection failed: {response.status_code}")
            return False
        
        print_info("Testing GitHub connection...")
        
        gh = config.get('github', {})
        gh_token = gh.get('token')
        
        if not gh_token or gh_token == 'ghp_your_github_personal_access_token':
            print_warning("GitHub token not configured")
            return False
        
        # Test GitHub API
        headers = {'Authorization': f'token {gh_token}'}
        response = requests.get('https://api.github.com/user', headers=headers, timeout=10)
        
        if response.status_code == 200:
            user = response.json()
            print_success(f"GitHub connection successful! Authenticated as: {user.get('login')}")
        else:
            print_error(f"GitHub connection failed: {response.status_code}")
            return False
        
        return True
        
    except Exception as e:
        print_error(f"Configuration test failed: {e}")
        return False

def main():
    """Main setup function."""
    print_header("Bidirectional WordPress ↔ GitHub Pages Sync Setup")
    print(f"{Colors.CYAN}This script will help you set up bidirectional sync{Colors.END}\n")
    
    # Step 1: Check prerequisites
    if not check_prerequisites():
        print_error("\nPrerequisites not met. Please install missing components.")
        return 1
    
    # Step 2: Install dependencies
    if not install_dependencies():
        print_error("\nFailed to install dependencies.")
        return 1
    
    # Step 3: Create configuration
    if not create_config():
        print_error("\nFailed to create configuration.")
        return 1
    
    # Step 4: Test configuration (optional)
    print_info("\nWould you like to test your configuration now?")
    print_warning("Make sure you've edited config.yaml with your credentials first!")
    response = input(f"{Colors.YELLOW}Test configuration? (y/n): {Colors.END}")
    
    if response.lower() == 'y':
        if test_configuration():
            print_success("\n✅ Configuration test passed!")
        else:
            print_warning("\n⚠️  Configuration test failed. Please check your credentials.")
    
    # Step 5: Setup instructions
    setup_github_actions()
    setup_watch_service()
    
    # Final summary
    print_header("Setup Complete!")
    print(f"{Colors.GREEN}✅ Dependencies installed{Colors.END}")
    print(f"{Colors.GREEN}✅ Configuration created{Colors.END}")
    
    print(f"\n{Colors.BOLD}Next Steps:{Colors.END}")
    print(f"1. Edit config.yaml with your credentials")
    print(f"2. Setup GitHub Actions (see instructions above)")
    print(f"3. Start the watch service (see instructions above)")
    print(f"4. Test the sync by creating a post in WordPress or GitHub")
    
    print(f"\n{Colors.BOLD}Documentation:{Colors.END}")
    print(f"- Quick Start: {Colors.CYAN}QUICKSTART.md{Colors.END}")
    print(f"- Full Guide: {Colors.CYAN}README.md{Colors.END}")
    print(f"- Configuration: {Colors.CYAN}config.template.yaml{Colors.END}")
    
    print(f"\n{Colors.GREEN}🚀 You're ready to sync!{Colors.END}\n")
    
    return 0

if __name__ == '__main__':
    try:
        sys.exit(main())
    except KeyboardInterrupt:
        print(f"\n{Colors.YELLOW}Setup cancelled by user{Colors.END}")
        sys.exit(1)
    except Exception as e:
        print_error(f"Unexpected error: {e}")
        sys.exit(1)