"""
WordPress to Git Repository Converter - Entry Point
Run this file to start the migration tool
"""

import sys
from pathlib import Path

# Add src directory to Python path
src_path = Path(__file__).parent / 'src'
sys.path.insert(0, str(src_path))

from src.main import main

if __name__ == '__main__':
    sys.exit(main())