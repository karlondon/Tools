"""Media file uploader for WordPress"""

import os
import mimetypes
from pathlib import Path
from typing import Dict, Any, Optional
import requests

class MediaUploader:
    """Upload media files to WordPress media library"""
    
    def __init__(self, site_url: str, username: str, app_password: str):
        """Initialize media uploader
        
        Args:
            site_url: WordPress site URL
            username: WordPress username
            app_password: Application password
        """
        self.site_url = site_url.rstrip('/')
        self.api_url = f"{self.site_url}/wp-json/wp/v2"
        
        # Basic auth for media uploads
        self.auth = (username, app_password)
        
    def upload_file(self, file_path: Path, alt_text: str = "") -> Optional[int]:
        """Upload file to WordPress media library
        
        Args:
            file_path: Path to file to upload
            alt_text: Alt text for image
            
        Returns:
            Media ID if successful, None otherwise
        """
        if not file_path.exists():
            print(f"✗ File not found: {file_path}")
            return None
        
        # Get file info
        filename = file_path.name
        mime_type, _ = mimetypes.guess_type(str(file_path))
        
        if not mime_type:
            mime_type = 'application/octet-stream'
        
        # Read file content
        with open(file_path, 'rb') as f:
            file_data = f.read()
        
        # Prepare headers
        headers = {
            'Content-Type': mime_type,
            'Content-Disposition': f'attachment; filename="{filename}"'
        }
        
        try:
            # Upload to WordPress
            response = requests.post(
                f"{self.api_url}/media",
                headers=headers,
                data=file_data,
                auth=self.auth
            )
            
            if response.status_code == 201:
                media_data = response.json()
                media_id = media_data['id']
                
                # Set alt text if provided
                if alt_text:
                    self._set_alt_text(media_id, alt_text)
                
                print(f"✓ Uploaded media: {filename} (ID: {media_id})")
                return media_id
            else:
                print(f"✗ Failed to upload {filename}: {response.status_code}")
                print(f"  Error: {response.text}")
                return None
                
        except Exception as e:
            print(f"✗ Error uploading {filename}: {e}")
            return None
    
    def _set_alt_text(self, media_id: int, alt_text: str) -> bool:
        """Set alt text for media
        
        Args:
            media_id: Media ID
            alt_text: Alt text
            
        Returns:
            True if successful
        """
        try:
            response = requests.post(
                f"{self.api_url}/media/{media_id}",
                json={'alt_text': alt_text},
                auth=self.auth
            )
            return response.status_code == 200
        except Exception:
            return False
    
    def get_media_by_filename(self, filename: str) -> Optional[Dict[str, Any]]:
        """Find media by filename
        
        Args:
            filename: Filename to search for
            
        Returns:
            Media data if found
        """
        try:
            response = requests.get(
                f"{self.api_url}/media",
                params={'search': filename},
                auth=self.auth
            )
            
            if response.status_code == 200:
                media_list = response.json()
                for media in media_list:
                    if media['source_url'].endswith(filename):
                        return media
            
            return None
            
        except Exception as e:
            print(f"Error searching for media: {e}")
            return None
    
    def batch_upload(self, file_list: list) -> Dict[str, int]:
        """Upload multiple files
        
        Args:
            file_list: List of file paths
            
        Returns:
            Dictionary mapping filenames to media IDs
        """
        media_map = {}
        
        for file_path in file_list:
            if isinstance(file_path, str):
                file_path = Path(file_path)
            
            media_id = self.upload_file(file_path)
            if media_id:
                media_map[file_path.name] = media_id
        
        return media_map