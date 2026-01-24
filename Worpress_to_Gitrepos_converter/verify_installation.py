"""
Installation Verification Script
Checks if all required dependencies are installed
"""

import sys

def check_imports():
    """Check if all required packages can be imported"""
    required_packages = {
        'yaml': 'PyYAML',
        'requests': 'requests',
        'github': 'PyGithub',
        'git': 'GitPython',
        'frontmatter': 'python-frontmatter',
        'markdownify': 'markdownify',
        'slugify': 'python-slugify',
        'loguru': 'loguru',
        'click': 'click',
        'colorama': 'colorama',
        'tqdm': 'tqdm',
    }
    
    missing = []
    installed = []
    
    print("Checking required packages...\n")
    
    for module, package in required_packages.items():
        try:
            __import__(module)
            installed.append(package)
            print(f"✓ {package}")
        except ImportError:
            missing.append(package)
            print(f"✗ {package} - NOT INSTALLED")
    
    print("\n" + "=" * 60)
    
    if missing:
        print(f"\n❌ Missing {len(missing)} package(s):")
        for pkg in missing:
            print(f"   - {pkg}")
        print("\nTo install missing packages, run:")
        print("   pip install -r requirements.txt")
        print("\n" + "=" * 60)
        return False
    else:
        print(f"\n✅ All {len(installed)} required packages are installed!")
        print("\nYou're ready to use the WordPress to Git Converter!")
        print("\nNext steps:")
        print("   1. Copy config.template.yaml to config.yaml")
        print("   2. Edit config.yaml with your credentials")
        print("   3. Run: python src/main.py --dry-run")
        print("\n" + "=" * 60)
        return True

if __name__ == '__main__':
    success = check_imports()
    sys.exit(0 if success else 1)