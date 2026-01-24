"""
WordPress REST API Client - Enhanced Version 1.1
Handles all communication with WordPress site via REST API
New features: Plugin information, Categories, Tags
"""

import requests
import time
from typing import Dict, List, Any, Optional
from urllib.parse import urljoin, urlparse
from requests.auth import HTTPBasicAuth
from loguru import logger

class WordPressAPIError(Exception):
    """Custom exception for WordPress API errors"""
    pass

class WordPressClient:
    """Client for WordPress REST API - Enhanced Version"""
    
    def __init__(self, site_url: str, username: Optional[str] = None, password: Optional[str] = None,
                 app_password: Optional[str] = None, verify_ssl: bool = True,
                 per_page: int = 100, timeout: int = 30):
        """
        Initialize WordPress client
        
        Args:
            site_url: WordPress site URL
            username: WordPress username (for basic auth)
            password: WordPress password (for basic auth)
            app_password: WordPress application password
            verify_ssl: Verify SSL certificates
            per_page: Number of items per page
            timeout: Request timeout in seconds
        """
        self.site_url = site_url.rstrip('/')
        self.username = username
        self.password = password
        self.app_password = app_password
        self.verify_ssl = verify_ssl
        self.per_page = min(per_page, 100)  # WordPress max is 100
        self.timeout = timeout
        self.api_base = urljoin(self.site_url, '/wp-json/wp/v2/')
        
        # Setup authentication
        self.auth = self._setup_auth()
        
        # Test connection
        self._test_connection()
    
    def _setup_auth(self) -> Optional[HTTPBasicAuth]:
        """Setup authentication method"""
        if self.app_password:
            # Application password requires username
            if not self.username:
                raise WordPressAPIError("Username required when using application password")
            # Remove spaces from application password
            clean_app_password = self.app_password.replace(' ', '')
            logger.info("Using WordPress application password authentication")
            return HTTPBasicAuth(self.username, clean_app_password)
        elif self.username and self.password:
            logger.info("Using WordPress basic authentication")
            return HTTPBasicAuth(self.username, self.password)
        else:
            logger.warning("No authentication provided - only public content will be accessible")
            return None
    
    def _test_connection(self) -> None:
        """Test connection to WordPress API"""
        try:
            response = requests.get(
                urljoin(self.site_url, '/wp-json/'),
                verify=self.verify_ssl,
                timeout=self.timeout
            )
            response.raise_for_status()
            logger.info(f"Successfully connected to WordPress site: {self.site_url}")
        except requests.exceptions.RequestException as e:
            raise WordPressAPIError(f"Failed to connect to WordPress site: {e}")
    
    def _make_request(self, endpoint: str, params: Optional[Dict[str, Any]] = None,
                     method: str = 'GET') -> requests.Response:
        """
        Make API request with error handling
        
        Args:
            endpoint: API endpoint (e.g., 'posts', 'pages')
            params: Query parameters
            method: HTTP method
            
        Returns:
            Response object
        """
        url = urljoin(self.api_base, endpoint)
        
        try:
            response = requests.request(
                method=method,
                url=url,
                params=params,
                auth=self.auth,
                verify=self.verify_ssl,
                timeout=self.timeout
            )
            response.raise_for_status()
            return response
        except requests.exceptions.HTTPError as e:
            if response.status_code == 401:
                raise WordPressAPIError("Authentication failed - check credentials")
            elif response.status_code == 404:
                raise WordPressAPIError(f"Endpoint not found: {endpoint}")
            else:
                raise WordPressAPIError(f"HTTP error {response.status_code}: {e}")
        except requests.exceptions.RequestException as e:
            raise WordPressAPIError(f"Request failed: {e}")
    
    def _get_paginated(self, endpoint: str, params: Optional[Dict[str, Any]] = None) -> List[Dict]:
        """
        Fetch all items from paginated endpoint
        
        Args:
            endpoint: API endpoint
            params: Query parameters
            
        Returns:
            List of all items
        """
        if params is None:
            params = {}
        
        params['per_page'] = self.per_page
        params['page'] = 1
        
        all_items = []
        
        while True:
            logger.debug(f"Fetching {endpoint} page {params['page']}")
            response = self._make_request(endpoint, params)
            
            items = response.json()
            if not items:
                break
            
            all_items.extend(items)
            
            # Check if there are more pages
            total_pages = int(response.headers.get('X-WP-TotalPages', 1))
            if params['page'] >= total_pages:
                break
            
            params['page'] += 1
            time.sleep(0.1)  # Small delay to avoid overwhelming server
        
        logger.info(f"Fetched {len(all_items)} items from {endpoint}")
        return all_items
    
    def get_posts(self, status: str = 'publish') -> List[Dict]:
        """
        Get all posts from WordPress
        
        Args:
            status: Post status (publish, draft, private, etc.)
            
        Returns:
            List of posts
        """
        logger.info(f"Fetching posts with status: {status}")
        params = {
            'status': status,
            '_embed': True  # Embed featured media and author info
        }
        return self._get_paginated('posts', params)
    
    def get_pages(self, status: str = 'publish') -> List[Dict]:
        """
        Get all pages from WordPress
        
        Args:
            status: Page status (publish, draft, private, etc.)
            
        Returns:
            List of pages
        """
        logger.info(f"Fetching pages with status: {status}")
        params = {
            'status': status,
            '_embed': True
        }
        return self._get_paginated('pages', params)
    
    def get_media(self) -> List[Dict]:
        """
        Get all media items from WordPress
        
        Returns:
            List of media items
        """
        logger.info("Fetching media library")
        return self._get_paginated('media')
    
    def get_categories(self) -> List[Dict]:
        """
        Get all categories
        
        Returns:
            List of categories with full details
        """
        logger.info("Fetching categories")
        return self._get_paginated('categories')
    
    def get_tags(self) -> List[Dict]:
        """
        Get all tags
        
        Returns:
            List of tags with full details
        """
        logger.info("Fetching tags")
        return self._get_paginated('tags')
    
    def get_plugins(self) -> List[Dict]:
        """
        Get list of installed plugins (requires authentication)
        
        Returns:
            List of plugins with status and version info
        """
        logger.info("Fetching installed plugins")
        try:
            # Try to fetch plugins via REST API
            response = requests.get(
                urljoin(self.site_url, '/wp-json/wp/v2/plugins'),
                auth=self.auth,
                verify=self.verify_ssl,
                timeout=self.timeout
            )
            
            if response.status_code == 200:
                plugins = response.json()
                logger.info(f"Fetched {len(plugins)} plugins")
                return plugins
            else:
                logger.warning("Could not fetch plugins - endpoint may not be available")
                return []
        except Exception as e:
            logger.warning(f"Failed to fetch plugins: {e}")
            return []
    
    def get_site_info(self) -> Dict:
        """
        Get comprehensive site information
        
        Returns:
            Site info dictionary with WordPress version, theme, etc.
        """
        try:
            response = requests.get(
                urljoin(self.site_url, '/wp-json/'),
                verify=self.verify_ssl,
                timeout=self.timeout
            )
            response.raise_for_status()
            site_info = response.json()
            
            # Add additional details
            site_info['fetched_at'] = time.strftime('%Y-%m-%d %H:%M:%S')
            
            logger.info("Fetched site information")
            return site_info
        except Exception as e:
            logger.warning(f"Failed to get site info: {e}")
            return {}
    
    def get_theme_info(self) -> Dict:
        """
        Get active theme information
        
        Returns:
            Theme info dictionary
        """
        try:
            # Try to get theme info from site root
            response = requests.get(
                urljoin(self.site_url, '/wp-json/'),
                verify=self.verify_ssl,
                timeout=self.timeout
            )
            
            if response.status_code == 200:
                data = response.json()
                # Theme info is sometimes in the root response
                theme_info = {}
                if 'theme' in data:
                    theme_info = data['theme']
                logger.info("Fetched theme information")
                return theme_info
            return {}
        except Exception as e:
            logger.warning(f"Failed to get theme info: {e}")
            return {}
    
    def get_post_by_id(self, post_id: int) -> Dict:
        """Get specific post by ID"""
        response = self._make_request(f'posts/{post_id}', {'_embed': True})
        return response.json()
    
    def get_page_by_id(self, page_id: int) -> Dict:
        """Get specific page by ID"""
        response = self._make_request(f'pages/{page_id}', {'_embed': True})
        return response.json()
    
    def get_media_by_id(self, media_id: int) -> Dict:
        """Get specific media item by ID"""
        response = self._make_request(f'media/{media_id}')
        return response.json()
    
    def download_media_file(self, media_url: str, output_path: str,
                           rate_limit: float = 0.5) -> bool:
        """
        Download media file from URL
        
        Args:
            media_url: URL of media file
            output_path: Local path to save file
            rate_limit: Delay between requests in seconds
            
        Returns:
            True if successful, False otherwise
        """
        try:
            time.sleep(rate_limit)
            response = requests.get(
                media_url,
                verify=self.verify_ssl,
                timeout=self.timeout,
                stream=True
            )
            response.raise_for_status()
            
            with open(output_path, 'wb') as f:
                for chunk in response.iter_content(chunk_size=8192):
                    f.write(chunk)
            
            logger.debug(f"Downloaded media: {media_url}")
            return True
        except Exception as e:
            logger.error(f"Failed to download media {media_url}: {e}")
            return False
    
    def __repr__(self) -> str:
        """String representation"""
        return f"WordPressClient(site_url='{self.site_url}', version='1.1')"