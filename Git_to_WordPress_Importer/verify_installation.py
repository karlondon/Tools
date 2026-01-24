#!/usr/bin/env python3
"""
Verify Git to WordPress Importer Installation

Check all dependencies and configurations.
"""

import sys
from pathlib import Path

def check_python_version():
    """Check Python version"""
    print("Checking Python version...")
    version = sys.version_info
    if version.major >= 3 and version.minor >= 8:
        print(f"✓ Python {version.major}.{version.minor}.{version.micro}")
        return True
    else:
        print(f"✗ Python {version.major}.{version.minor} (requires 3.8+)")
        return False

def check_dependencies():
    """Check required Python packages"""
    print("\nChecking dependencies...")
    
    required = {
        'requests': 'requests',
        'yaml': 'PyYAML',
        'git': 'GitPython',
        'github': 'PyGithub',
        'markdown': 'markdown',
        'frontmatter': 'python-frontmatter',
        'bs4': 'beautifulsoup4',
        'watchdog': 'watchdog',
        'click': 'click',
        'colorama': 'colorama',
        'tqdm': 'tqdm',
        'slugify': 'python-slugify'
    }
    
    missing = []
    installed = []
    
    for module, package in required.items():
        try:
            __import__(module)
            installed.append(package)
            print(f"✓ {package}")
        except ImportError:
            missing.append(package)
            print(f"✗ {package} - NOT INSTALLED")
    
    return len(missing) == 0, missing

def check_config():
    """Check configuration file"""
    print("\nChecking configuration...")
    
    config_path = Path("config.yaml")
    template_path = Path("config.template.yaml")
    
    if config_path.exists():
        print("✓ config.yaml found")
        return True
    else:
        print("✗ config.yaml not found")
        if template_path.exists():
            print("  → Copy config.template.yaml to config.yaml and edit it")
        return False

def main():
    """Run all verification checks"""
    print("="*60)
    print("Git to WordPress Importer - Installation Verification")
    print("="*60 + "\n")
    
    all_ok = True
    
    # Check Python version
    if not check_python_version():
        all_ok = False
    
    # Check dependencies
    deps_ok, missing = check_dependencies()
    if not deps_ok:
        all_ok = False
        print(f"\nMissing {len(missing)} package(s):")
        print("Install with: pip install " + " ".join(missing))
    
    # Check config
    if not check_config():
        all_ok = False
    
    # Summary
    print("\n" + "="*60)
    if all_ok:
        print("✓ All checks passed! Ready to use.")
        print("\nQuick start:")
        print("  1. Edit config.yaml with your credentials")
        print("  2. Run: python run.py --import")
    else:
        print("✗ Some checks failed. Please fix the issues above.")
        print("\nInstallation steps:")
        print("  1. pip install -r requirements.txt")
        print("  2. cp config.template.yaml config.yaml")
        print("  3. Edit config.yaml with your credentials")
    print("="*60)
    
    sys.exit(0 if all_ok else 1)

if __name__ == '__main__':
    main()