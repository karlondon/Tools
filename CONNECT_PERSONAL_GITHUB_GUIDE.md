# Connecting to Personal GitHub While Using Deloitte GitHub Enterprise

This guide explains how to work with both your personal GitHub account and Deloitte's GitHub Enterprise in VS Code.

## Understanding the Setup

VS Code uses Git underneath, and Git can work with multiple remote repositories simultaneously. You have several options depending on your needs.

## Option 1: Using Different Repositories (Recommended)

### Current Setup
- Deloitte repos: Connected via GitHub Enterprise
- Personal repos: Need separate configuration

### Steps to Add Personal GitHub Repository

#### 1. **Open Your Personal Repository**
```bash
# Navigate to where you want to clone your personal repo
cd ~/Documents/PersonalProjects

# Clone your personal GitHub repository
git clone https://github.com/YOUR-USERNAME/your-repo-name.git

# Open the folder in VS Code
code your-repo-name
```

#### 2. **Configure Git Credentials Per Repository**

For your personal repository, set your personal email:
```bash
cd ~/Documents/PersonalProjects/your-repo-name
git config user.name "Your Personal Name"
git config user.email "your.personal.email@gmail.com"
```

For Deloitte repositories, ensure they use your work email:
```bash
cd ~/path/to/deloitte/repo
git config user.name "Your Work Name"
git config user.email "your.email@deloitte.com"
```

#### 3. **Authentication Options**

**Option A: Personal Access Token (PAT)**
1. Go to GitHub.com → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Generate new token with `repo` scope
3. When VS Code prompts for credentials, use:
   - Username: Your GitHub username
   - Password: The PAT token

**Option B: SSH Keys (Recommended)**
1. Generate a new SSH key for personal use:
```bash
ssh-keygen -t ed25519 -C "your.personal.email@gmail.com" -f ~/.ssh/id_ed25519_personal
```

2. Add SSH key to ssh-agent:
```bash
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/id_ed25519_personal
```

3. Add public key to GitHub:
```bash
# Copy the public key
cat ~/.ssh/id_ed25519_personal.pub
# Add this to GitHub.com → Settings → SSH and GPG keys
```

4. Configure SSH config file:
```bash
# Edit or create ~/.ssh/config
nano ~/.ssh/config
```

Add this content:
```
# Personal GitHub
Host github.com
  HostName github.com
  User git
  IdentityFile ~/.ssh/id_ed25519_personal

# Deloitte GitHub Enterprise
Host github.deloitte.com
  HostName github.deloitte.com
  User git
  IdentityFile ~/.ssh/id_ed25519_deloitte
```

5. Clone personal repos using SSH:
```bash
git clone git@github.com:YOUR-USERNAME/your-repo.git
```

## Option 2: Multiple Remotes in Same Repository

If you want to push the same code to both Deloitte and personal GitHub:

```bash
# Add your personal GitHub as a second remote
git remote add personal https://github.com/YOUR-USERNAME/repo-name.git

# View all remotes
git remote -v

# Push to Deloitte (origin)
git push origin main

# Push to personal GitHub
git push personal main
```

## Option 3: Using GitHub CLI (gh)

Install and configure GitHub CLI for easier multi-account management:

```bash
# Install GitHub CLI
brew install gh

# Login to personal GitHub
gh auth login
# Choose: GitHub.com → HTTPS or SSH → Follow prompts

# Login to Deloitte GitHub Enterprise
gh auth login --hostname github.deloitte.com
# Follow prompts for enterprise login
```

## VS Code Git Integration

### 1. **Source Control Panel**
- VS Code automatically detects Git repositories
- Click the Source Control icon (branch icon) in the sidebar
- You'll see different repositories when you open different folders

### 2. **Managing Multiple Repositories**
- Open each repository in a separate VS Code window, OR
- Use VS Code Workspaces to manage multiple repos in one window:
  - File → Add Folder to Workspace
  - Each folder can have different Git configurations

### 3. **Credential Storage**

VS Code uses the system's credential manager:

**macOS:**
```bash
# Check current credential helper
git config --global credential.helper

# Set to use macOS Keychain
git config --global credential.helper osxkeychain
```

The Keychain will store separate credentials for:
- `github.com` (personal)
- `github.deloitte.com` (enterprise)

## Troubleshooting

### Issue: VS Code Uses Wrong Credentials

**Solution 1: Clear Cached Credentials**
```bash
# For macOS Keychain
git credential-osxkeychain erase
# Then type: protocol=https
# Then type: host=github.com
# Press Enter twice
```

**Solution 2: Use SSH Instead**
SSH keys are more reliable for multiple accounts since they're file-based rather than credential-based.

### Issue: Wrong Email in Commits

Check and fix per-repository:
```bash
# Check current config
git config user.email

# Set correct email for this repo
git config user.email "correct@email.com"
```

### Issue: Can't Push to Personal Repo

1. Verify remote URL:
```bash
git remote -v
```

2. Test authentication:
```bash
# For HTTPS
git ls-remote https://github.com/YOUR-USERNAME/repo.git

# For SSH
ssh -T git@github.com
```

## Best Practices

1. **Separate Directories**: Keep work and personal projects in different folders
2. **Use SSH Keys**: More secure and easier to manage than passwords/tokens
3. **Per-Repo Config**: Always set user.name and user.email per repository
4. **VS Code Workspaces**: Use different workspace files for work vs personal projects
5. **Git Config Files**: Consider using conditional includes in `~/.gitconfig`:

```bash
# Edit global config
nano ~/.gitconfig
```

Add:
```
[includeIf "gitdir:~/Documents/PersonalProjects/"]
    path = ~/.gitconfig-personal

[includeIf "gitdir:~/Documents/DeloitteProjects/"]
    path = ~/.gitconfig-work
```

Then create `~/.gitconfig-personal`:
```
[user]
    name = Your Personal Name
    email = your.personal@gmail.com
```

And `~/.gitconfig-work`:
```
[user]
    name = Your Work Name
    email = your.email@deloitte.com
```

## Quick Reference Commands

```bash
# Check which account you're using
git config user.email
git remote -v

# Switch between accounts for current repo
git config user.email "your.personal@gmail.com"
git config user.email "your.work@deloitte.com"

# View all Git configuration
git config --list --show-origin

# Test GitHub authentication
ssh -T git@github.com
gh auth status
```

## Next Steps

1. Choose your preferred authentication method (SSH recommended)
2. Set up separate directories for personal and work projects
3. Configure Git credentials for each repository
4. Test by pushing to your personal repository

Need help with any specific step? Check the authentication or troubleshooting sections above.