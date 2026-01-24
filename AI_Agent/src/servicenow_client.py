"""
ServiceNow Client for API Integration
Handles all ServiceNow REST API interactions for ticket management.
"""

import requests
import logging
from typing import Dict, List, Any, Optional
from requests.auth import HTTPBasicAuth
import json

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class ServiceNowException(Exception):
    """Custom exception for ServiceNow API errors."""
    pass

class ServiceNowClient:
    """
    Client for interacting with ServiceNow REST API.
    
    Provides methods for:
    - Fetching tickets (incidents)
    - Updating ticket assignments
    - Adding work notes and comments
    - Querying ticket data
    """
    
    def __init__(
        self,
        instance_url: str,
        username: str,
        password: str,
        api_version: str = 'v1',
        timeout: int = 30,
        verify_ssl: bool = True
    ):
        """
        Initialize the ServiceNow client.
        
        Args:
            instance_url: ServiceNow instance URL (e.g., 'https://dev12345.service-now.com')
            username: ServiceNow username
            password: ServiceNow password
            api_version: API version (default: 'v1')
            timeout: Request timeout in seconds (default: 30)
            verify_ssl: Verify SSL certificates (default: True)
        """
        self.instance_url = instance_url.rstrip('/')
        self.username = username
        self.password = password
        self.api_version = api_version
        self.timeout = timeout
        self.verify_ssl = verify_ssl
        
        # Build base API URL
        self.api_base_url = f"{self.instance_url}/api/now/{api_version}"
        
        # Session for connection pooling
        self.session = requests.Session()
        self.session.auth = HTTPBasicAuth(username, password)
        self.session.headers.update({
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        })
        
        logger.info(f"ServiceNow client initialized for instance: {self.instance_url}")
    
    def _make_request(
        self,
        method: str,
        endpoint: str,
        params: Optional[Dict] = None,
        data: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """
        Make HTTP request to ServiceNow API.
        
        Args:
            method: HTTP method (GET, POST, PUT, PATCH, DELETE)
            endpoint: API endpoint (e.g., '/table/incident')
            params: Query parameters
            data: Request body data
        
        Returns:
            Response data as dictionary
        
        Raises:
            ServiceNowException: If request fails
        """
        url = f"{self.api_base_url}{endpoint}"
        
        try:
            logger.debug(f"{method} {url}")
            
            response = self.session.request(
                method=method,
                url=url,
                params=params,
                json=data,
                timeout=self.timeout,
                verify=self.verify_ssl
            )
            
            # Check for HTTP errors
            response.raise_for_status()
            
            # Parse JSON response
            if response.content:
                return response.json()
            return {}
            
        except requests.exceptions.HTTPError as e:
            error_msg = f"HTTP error {response.status_code}: {response.text}"
            logger.error(error_msg)
            raise ServiceNowException(error_msg) from e
        except requests.exceptions.ConnectionError as e:
            error_msg = f"Connection error: Unable to connect to {self.instance_url}"
            logger.error(error_msg)
            raise ServiceNowException(error_msg) from e
        except requests.exceptions.Timeout as e:
            error_msg = f"Request timeout after {self.timeout} seconds"
            logger.error(error_msg)
            raise ServiceNowException(error_msg) from e
        except requests.exceptions.RequestException as e:
            error_msg = f"Request failed: {str(e)}"
            logger.error(error_msg)
            raise ServiceNowException(error_msg) from e
        except json.JSONDecodeError as e:
            error_msg = f"Invalid JSON response: {str(e)}"
            logger.error(error_msg)
            raise ServiceNowException(error_msg) from e
    
    def get_tickets(
        self,
        query_params: Optional[Dict[str, Any]] = None,
        table: str = 'incident'
    ) -> List[Dict[str, Any]]:
        """
        Fetch tickets from ServiceNow.
        
        Args:
            query_params: Query parameters for filtering
                - sysparm_query: Encoded query string
                - sysparm_limit: Maximum number of records
                - sysparm_offset: Starting record number
                - sysparm_fields: Comma-separated list of fields to return
                - sysparm_display_value: Return display values (true/false)
            table: ServiceNow table name (default: 'incident')
        
        Returns:
            List of ticket dictionaries
        
        Example:
            >>> params = {
            ...     'sysparm_query': 'assignment_group=NULL^priority=1',
            ...     'sysparm_limit': 10
            ... }
            >>> tickets = client.get_tickets(params)
        """
        endpoint = f"/table/{table}"
        
        try:
            response = self._make_request('GET', endpoint, params=query_params)
            tickets = response.get('result', [])
            
            logger.info(f"Retrieved {len(tickets)} ticket(s) from {table}")
            return tickets
            
        except ServiceNowException as e:
            logger.error(f"Failed to fetch tickets: {str(e)}")
            raise
    
    def get_ticket(
        self,
        ticket_number: str,
        table: str = 'incident'
    ) -> Optional[Dict[str, Any]]:
        """
        Get a specific ticket by number.
        
        Args:
            ticket_number: Ticket number (e.g., 'INC0012345')
            table: ServiceNow table name (default: 'incident')
        
        Returns:
            Ticket dictionary or None if not found
        
        Example:
            >>> ticket = client.get_ticket('INC0012345')
        """
        query_params = {
            'sysparm_query': f'number={ticket_number}',
            'sysparm_limit': 1
        }
        
        try:
            tickets = self.get_tickets(query_params, table)
            
            if tickets:
                logger.info(f"Retrieved ticket {ticket_number}")
                return tickets[0]
            else:
                logger.warning(f"Ticket {ticket_number} not found")
                return None
                
        except ServiceNowException as e:
            logger.error(f"Failed to get ticket {ticket_number}: {str(e)}")
            raise
    
    def get_ticket_by_sys_id(
        self,
        sys_id: str,
        table: str = 'incident'
    ) -> Optional[Dict[str, Any]]:
        """
        Get a ticket by sys_id.
        
        Args:
            sys_id: ServiceNow sys_id
            table: ServiceNow table name (default: 'incident')
        
        Returns:
            Ticket dictionary or None if not found
        """
        endpoint = f"/table/{table}/{sys_id}"
        
        try:
            response = self._make_request('GET', endpoint)
            ticket = response.get('result')
            
            if ticket:
                logger.info(f"Retrieved ticket with sys_id {sys_id}")
                return ticket
            else:
                logger.warning(f"Ticket with sys_id {sys_id} not found")
                return None
                
        except ServiceNowException as e:
            logger.error(f"Failed to get ticket by sys_id {sys_id}: {str(e)}")
            raise
    
    def update_ticket(
        self,
        ticket_number: str,
        update_data: Dict[str, Any],
        table: str = 'incident'
    ) -> bool:
        """
        Update a ticket in ServiceNow.
        
        Args:
            ticket_number: Ticket number (e.g., 'INC0012345')
            update_data: Dictionary of fields to update
            table: ServiceNow table name (default: 'incident')
        
        Returns:
            True if successful, False otherwise
        
        Example:
            >>> update_data = {
            ...     'assignment_group': 'Cloud Managed Services',
            ...     'work_notes': 'Auto-assigned by AI Agent'
            ... }
            >>> success = client.update_ticket('INC0012345', update_data)
        """
        try:
            # First, get the ticket to find its sys_id
            ticket = self.get_ticket(ticket_number, table)
            
            if not ticket:
                logger.error(f"Cannot update ticket {ticket_number}: not found")
                return False
            
            sys_id = ticket.get('sys_id')
            
            # Update the ticket
            endpoint = f"/table/{table}/{sys_id}"
            response = self._make_request('PATCH', endpoint, data=update_data)
            
            if response.get('result'):
                logger.info(f"Successfully updated ticket {ticket_number}")
                return True
            else:
                logger.error(f"Failed to update ticket {ticket_number}")
                return False
                
        except ServiceNowException as e:
            logger.error(f"Error updating ticket {ticket_number}: {str(e)}")
            return False
    
    def update_ticket_by_sys_id(
        self,
        sys_id: str,
        update_data: Dict[str, Any],
        table: str = 'incident'
    ) -> bool:
        """
        Update a ticket by sys_id.
        
        Args:
            sys_id: ServiceNow sys_id
            update_data: Dictionary of fields to update
            table: ServiceNow table name (default: 'incident')
        
        Returns:
            True if successful, False otherwise
        """
        endpoint = f"/table/{table}/{sys_id}"
        
        try:
            response = self._make_request('PATCH', endpoint, data=update_data)
            
            if response.get('result'):
                logger.info(f"Successfully updated ticket with sys_id {sys_id}")
                return True
            else:
                logger.error(f"Failed to update ticket with sys_id {sys_id}")
                return False
                
        except ServiceNowException as e:
            logger.error(f"Error updating ticket by sys_id {sys_id}: {str(e)}")
            return False
    
    def create_ticket(
        self,
        ticket_data: Dict[str, Any],
        table: str = 'incident'
    ) -> Optional[Dict[str, Any]]:
        """
        Create a new ticket in ServiceNow.
        
        Args:
            ticket_data: Dictionary of ticket fields
            table: ServiceNow table name (default: 'incident')
        
        Returns:
            Created ticket dictionary or None if failed
        
        Example:
            >>> ticket_data = {
            ...     'short_description': 'Test incident',
            ...     'description': 'This is a test',
            ...     'priority': '3',
            ...     'urgency': '3'
            ... }
            >>> ticket = client.create_ticket(ticket_data)
        """
        endpoint = f"/table/{table}"
        
        try:
            response = self._make_request('POST', endpoint, data=ticket_data)
            ticket = response.get('result')
            
            if ticket:
                ticket_number = ticket.get('number')
                logger.info(f"Successfully created ticket {ticket_number}")
                return ticket
            else:
                logger.error("Failed to create ticket")
                return None
                
        except ServiceNowException as e:
            logger.error(f"Error creating ticket: {str(e)}")
            return None
    
    def add_work_note(
        self,
        ticket_number: str,
        work_note: str,
        table: str = 'incident'
    ) -> bool:
        """
        Add a work note to a ticket.
        
        Args:
            ticket_number: Ticket number
            work_note: Work note text
            table: ServiceNow table name (default: 'incident')
        
        Returns:
            True if successful, False otherwise
        """
        update_data = {'work_notes': work_note}
        return self.update_ticket(ticket_number, update_data, table)
    
    def add_comment(
        self,
        ticket_number: str,
        comment: str,
        table: str = 'incident'
    ) -> bool:
        """
        Add a comment to a ticket (visible to user).
        
        Args:
            ticket_number: Ticket number
            comment: Comment text
            table: ServiceNow table name (default: 'incident')
        
        Returns:
            True if successful, False otherwise
        """
        update_data = {'comments': comment}
        return self.update_ticket(ticket_number, update_data, table)
    
    def get_assignment_groups(
        self,
        name_filter: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Get assignment groups from ServiceNow.
        
        Args:
            name_filter: Filter by group name (optional)
        
        Returns:
            List of assignment group dictionaries
        """
        query_params = {}
        
        if name_filter:
            query_params['sysparm_query'] = f'nameLIKE{name_filter}'
        
        endpoint = "/table/sys_user_group"
        
        try:
            response = self._make_request('GET', endpoint, params=query_params)
            groups = response.get('result', [])
            
            logger.info(f"Retrieved {len(groups)} assignment group(s)")
            return groups
            
        except ServiceNowException as e:
            logger.error(f"Failed to fetch assignment groups: {str(e)}")
            raise
    
    def test_connection(self) -> bool:
        """
        Test the connection to ServiceNow.
        
        Returns:
            True if connection successful, False otherwise
        """
        try:
            # Try to fetch one incident to test connection
            query_params = {'sysparm_limit': 1}
            self.get_tickets(query_params)
            
            logger.info("ServiceNow connection test successful")
            return True
            
        except ServiceNowException:
            logger.error("ServiceNow connection test failed")
            return False
    
    def close(self):
        """Close the client session."""
        self.session.close()
        logger.info("ServiceNow client session closed")
    
    def __enter__(self):
        """Context manager entry."""
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit."""
        self.close()

# Example usage
if __name__ == "__main__":
    # Example configuration (use environment variables in production)
    INSTANCE_URL = "https://dev12345.service-now.com"
    USERNAME = "admin"
    PASSWORD = "password"
    
    # Initialize client
    client = ServiceNowClient(
        instance_url=INSTANCE_URL,
        username=USERNAME,
        password=PASSWORD
    )
    
    print("ServiceNow Client Test")
    print("=" * 60)
    
    # Test connection
    print("\n1. Testing connection...")
    if client.test_connection():
        print("✓ Connection successful")
    else:
        print("✗ Connection failed")
        exit(1)
    
    # Get recent tickets
    print("\n2. Fetching recent unassigned tickets...")
    query_params = {
        'sysparm_query': 'assignment_group=NULL',
        'sysparm_limit': 5,
        'sysparm_fields': 'number,short_description,priority,state'
    }
    
    try:
        tickets = client.get_tickets(query_params)
        print(f"Found {len(tickets)} unassigned ticket(s):")
        for ticket in tickets:
            print(f"  - {ticket['number']}: {ticket['short_description']}")
    except ServiceNowException as e:
        print(f"Error: {str(e)}")
    
    # Get specific ticket
    print("\n3. Getting specific ticket (INC0010001)...")
    try:
        ticket = client.get_ticket('INC0010001')
        if ticket:
            print(f"✓ Ticket found: {ticket['short_description']}")
        else:
            print("✗ Ticket not found")
    except ServiceNowException as e:
        print(f"Error: {str(e)}")
    
    # Update ticket (example - commented out to prevent accidental changes)
    # print("\n4. Updating ticket...")
    # update_data = {
    #     'work_notes': 'Test work note from API',
    #     'assignment_group': 'Cloud Managed Services'
    # }
    # if client.update_ticket('INC0010001', update_data):
    #     print("✓ Ticket updated successfully")
    # else:
    #     print("✗ Ticket update failed")
    
    # Get assignment groups
    print("\n4. Fetching assignment groups...")
    try:
        groups = client.get_assignment_groups()
        print(f"Found {len(groups)} assignment group(s)")
        if groups:
            print("Sample groups:")
            for group in groups[:3]:
                print(f"  - {group['name']}")
    except ServiceNowException as e:
        print(f"Error: {str(e)}")
    
    print("\n" + "=" * 60)
    print("Test completed")
    
    # Close client
    client.close()