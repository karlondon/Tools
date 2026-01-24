# Installation Guide

## Understanding the "Errors"

If you see import errors in your IDE (like VS Code with Pylance), **don't worry!** These are just warnings that the Python packages haven't been installed yet. They're not actual code errors - the code is correct.

## Quick Installation

### Step 1: Install Python Dependencies

```bash
cd Worpress_to_Gitrepos_converter
pip install -r requirements.txt
```

This will install all required packages:
- PyYAML - Configuration file parsing
- requests - HTTP requests to WordPress
- PyGithub - GitHub API client
- GitPython - Git operations
- python-frontmatter - Markdown front matter
- markdownify - HTML to Markdown conversion
- python-slugify - URL-friendly slugs
- loguru - Advanced logging
- click - Command-line interface
- colorama - Colored terminal output
- tqdm - Progress bars
- Pillow - Image processing
- html2text - HTML conversion

### Step 2: Verify Installation

```bash
python verify_installation.py
```

This will check that all packages are installed correctly.

### Step 3: You're Ready!

Once all packages show as installed (✓), the import errors in your IDE will disappear and you can proceed with configuration.

## Troubleshooting Installation

### Issue: pip not found
```bash
# Try using pip3
pip3 install -r requirements.txt

# Or use python -m pip
python -m pip install -r requirements.txt
python3 -m pip install -r requirements.txt
```

### Issue: Permission denied
```bash
# Install for current user only
pip install --user -r requirements.txt

# Or use sudo (Linux/Mac)
sudo pip install -r requirements.txt
```

### Issue: Package conflicts
```bash
# Use a virtual environment (recommended)
python -m venv venv

# Activate it
# On macOS/Linux:
source venv/bin/activate
# On Windows:
venv\Scripts\activate

# Then install
pip install -r requirements.txt
```

### Issue: Specific package fails
```bash
# Install packages one by one to identify the problem
pip install PyYAML
pip install requests
pip install PyGithub
# ... and so on
```

## Using Virtual Environments (Recommended)

Virtual environments keep your project dependencies isolated:

```bash
# Create virtual environment
python -m venv venv

# Activate it
# macOS/Linux:
source venv/bin/activate
# Windows:
venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Verify
python verify_installation.py

# When done, deactivate
deactivate
```

## IDE Setup

### VS Code
After installing packages, VS Code should automatically detect them. If not:
1. Press `Cmd+Shift+P` (Mac) or `Ctrl+Shift+P` (Windows/Linux)
2. Type "Python: Select Interpreter"
3. Choose the interpreter where you installed packages

### PyCharm
1. Go to Settings/Preferences > Project > Python Interpreter
2. Click the + button to add packages
3. Install from requirements.txt

## System Requirements

- **Python**: 3.8 or higher
- **Git**: Any recent version
- **Operating System**: Windows, macOS, or Linux
- **Internet**: Required for API calls and package installation

## Next Steps

After successful installation:
1. Follow [QUICKSTART.md](QUICKSTART.md) for quick setup
2. Or see [USAGE.md](USAGE.md) for detailed instructions

## Verifying Everything Works

```bash
# Check Python version
python --version  # Should be 3.8+

# Check Git
git --version

# Verify all packages
python verify_installation.py

# Test the tool
python run.py --help
```

If all checks pass, you're ready to start migrating!