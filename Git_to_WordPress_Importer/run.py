#!/usr/bin/env python3
"""
Git to WordPress Importer - Main Entry Point

Import Markdown content from Git repositories to WordPress sites.
"""

import sys
import click
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent))

from src.config_manager import ConfigManager
from src.import_orchestrator import ImportOrchestrator

@click.command()
@click.option('--config', default='config.yaml', help='Configuration file path')
@click.option('--import', 'do_import', is_flag=True, help='Import content from repository')
@click.option('--watch', is_flag=True, help='Watch mode - continuously sync changes')
@click.option('--dry-run', is_flag=True, help='Preview only, do not make changes')
@click.option('--types', help='Content types to import (comma-separated: posts,pages)')
@click.option('--verbose', is_flag=True, help='Verbose output')
def main(config, do_import, watch, dry_run, types, verbose):
    """Git to WordPress Importer
    
    Import Markdown content from Git repositories into WordPress sites.
    
    Examples:
    
        # Import all content
        python run.py --import
        
        # Import only posts
        python run.py --import --types posts
        
        # Dry run (preview only)
        python run.py --import --dry-run
        
        # Watch mode (continuous sync)
        python run.py --watch
    """
    
    try:
        # Load configuration
        config_manager = ConfigManager(config)
        config_manager.load_config()
        
        # Initialize orchestrator
        orchestrator = ImportOrchestrator(config_manager)
        
        # Set dry run mode if requested
        if dry_run:
            orchestrator.set_dry_run(True)
        
        # Override content types if specified
        if types:
            type_list = [t.strip() for t in types.split(',')]
            orchestrator.import_config['content_types'] = type_list
        
        # Execute requested operation
        if watch:
            # Watch mode
            interval = orchestrator.import_config.get('sync_interval', 300)
            orchestrator.watch_for_changes(interval)
            
        elif do_import:
            # One-time import
            success = orchestrator.import_all()
            sys.exit(0 if success else 1)
            
        else:
            # No operation specified, show help
            click.echo("No operation specified. Use --import or --watch")
            click.echo("Run 'python run.py --help' for more information")
            sys.exit(1)
            
    except FileNotFoundError as e:
        click.echo(f"Error: {e}", err=True)
        click.echo("\nQuick Start:", err=True)
        click.echo("1. Copy config.template.yaml to config.yaml", err=True)
        click.echo("2. Edit config.yaml with your credentials", err=True)
        click.echo("3. Run: python run.py --import", err=True)
        sys.exit(1)
        
    except Exception as e:
        click.echo(f"Error: {e}", err=True)
        if verbose:
            import traceback
            traceback.print_exc()
        sys.exit(1)

if __name__ == '__main__':
    main()