# ServiceNow Client Implementation Documentation

**Date:** 23 January 2026  
**Project:** AI Agent - ServiceNow Ticket Triage Automation  
**Module:** `servicenow_client.py`

---

## Table of Contents
1. [Overview](#overview)
2. [Architecture](#architecture)
3. [API Reference](#api-reference)
4. [Usage Examples](#usage-examples)
5. [Configuration](#configuration)
6. [Error Handling](#error-handling)
7. [Best Practices](#best-practices)
8. [Security Considerations](#security-considerations)

---

## Overview

The ServiceNow Client is a Python wrapper for the ServiceNow REST API, providing a clean, Pythonic interface for managing tickets (incidents) and interacting with ServiceNow data.

### Key Features
- ✅ **REST API Integration**: Complete wrapper for ServiceNow Table API
- ✅ **Ticket Management**: Create, read, update tickets
- ✅ **Work Notes & Comments**: Add internal notes and user-visible comments
- ✅ **Assignment Groups**: Query and manage assignment groups
- ✅ **Error Handling**: Robust exception handling with custom exceptions
- ✅ **Connection Pooling**: Efficient session management with requests
- ✅ **Context Manager**: Support for `with` statement
- ✅ **Logging**: Comprehensive logging for debugging and auditing

### File Location
```
AI_Agent/src/servicenow_client.py
```

---

## Architecture

### Component Structure

```
┌─────────────────────────────────────────────────────┐
│            ServiceNowClient                         │
│                                                     │
│  ┌───────────────────────────────────────────┐    │
│  │      Authentication & Session             │    │
│  │  - HTTPBasicAuth                          │    │
│  │  - Connection Pooling                     │    │
│  │  - Header Management                      │    │
│  └───────────────┬───────────────────────────┘    │
│                  │                                 │
│  ┌───────────────▼───────────────────────────┐    │
│  │      Request Handler (_make_request)      │    │
│  │  - HTTP Method Routing                    │    │
│  │  - Error Handling                         │    │
│  │  - Response Parsing                       │    │
│  └───────────────┬───────────────────────────┘    │
│                  │                                 │
│  ┌───────────────▼───────────────────────────┐    │
│  │         API Methods                       │    │
│  │  - get_tickets()                          │    │
│  │  - get_ticket()                           │    │
│  │  - update_ticket()                        │    │
│  │  - create_ticket()                        │    │
│  │  - add_work_note()                        │    │
│  │  - add_comment()                          │    │
│  │  - get_assignment_groups()                │    │
│  └───────────────────────────────────────────┘    │
│                                                     │
│  ┌───────────────────────────────────────────┐    │
│  │      Logging & Error Tracking             │    │
│  └───────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────┘
```

### Request Flow

```
Client Call
    ↓
API Method (e.g., get_ticket)
    ↓
_make_request()
    ↓
Build URL & Headers
    ↓
HTTP Request (via session)
    ↓
Response Handling
    ↓
Error Checking
    ↓
JSON Parsing
    ↓
Return Data / Raise Exception
```

---

## API Reference

### Exception: `ServiceNowException`

Custom exception for ServiceNow API errors.

```python
class ServiceNowException(Exception):
    """Custom exception for ServiceNow API errors."""
    pass
```

**Usage:**
```python
try:
    tickets = client.get_tickets()
except ServiceNowException as e:
    print(f"ServiceNow error: {str(e)}")
```

---

### Class: `ServiceNowClient`

Main client class for ServiceNow API interactions.

#### Constructor

```python
ServiceNowClient(
    instance_url: str,
    username: str,
    password: str,
    api_version: str = 'v1',
    timeout: int = 30,
    verify_ssl: bool = True
)
```

**Parameters:**
- `instance_url` (str): ServiceNow instance URL
  - Example: `'https://dev12345.service-now.com'`
- `username` (str): ServiceNow username
- `password` (str): ServiceNow password
- `api_version` (str): API version (default: 'v1')
- `timeout` (int): Request timeout in seconds (default: 30)
- `verify_ssl` (bool): Verify SSL certificates (default: True)

**Example:**
```python
client = ServiceNowClient(
    instance_url='https://your-instance.service-now.com',
    username='admin',
    password='your-password',
    timeout=60
)
```

---

#### Core Methods

##### `get_tickets(query_params, table='incident')`

Fetch multiple tickets from ServiceNow.

**Parameters:**
- `query_params` (dict, optional): Query parameters for filtering
  - `sysparm_query`: Encoded query string
  - `sysparm_limit`: Maximum number of records
  - `sysparm_offset`: Starting record number
  - `sysparm_fields`: Comma-separated list of fields
  - `sysparm_display_value`: Return display values (true/false)
- `table` (str): ServiceNow table name (default: 'incident')

**Returns:**
- `List[Dict[str, Any]]`: List of ticket dictionaries

**Example:**
```python
# Get unassigned high-priority tickets
query_params = {
    'sysparm_query': 'assignment_group=NULL^priority=1',
    'sysparm_limit': 10,
    'sysparm_fields': 'number,short_description,priority'
}
tickets = client.get_tickets(query_params)

for ticket in tickets:
    print(f"{ticket['number']}: {ticket['short_description']}")
```

**Common Query Examples:**
```python
# Unassigned tickets
'assignment_group=NULL'

# High priority tickets
'priority=1'

# Recent tickets (last 24 hours)
'sys_created_on>javascript:gs.daysAgoStart(1)'

# Complex query (unassigned AND high priority)
'assignment_group=NULL^priority=1'

# Tickets in specific state
'state=1'  # New
'state=2'  # In Progress
'state=6'  # Resolved
```

---

##### `get_ticket(ticket_number, table='incident')`

Get a specific ticket by number.

**Parameters:**
- `ticket_number` (str): Ticket number (e.g., 'INC0012345')
- `table` (str): ServiceNow table name (default: 'incident')

**Returns:**
- `Dict[str, Any]` or `None`: Ticket dictionary or None if not found

**Example:**
```python
ticket = client.get_ticket('INC0012345')

if ticket:
    print(f"Description: {ticket['short_description']}")
    print(f"Priority: {ticket['priority']}")
    print(f"State: {ticket['state']}")
else:
    print("Ticket not found")
```

---

##### `get_ticket_by_sys_id(sys_id, table='incident')`

Get a ticket by sys_id (more efficient than by number).

**Parameters:**
- `sys_id` (str): ServiceNow sys_id
- `table` (str): ServiceNow table name (default: 'incident')

**Returns:**
- `Dict[str, Any]` or `None`: Ticket dictionary or None if not found

**Example:**
```python
sys_id = '1234567890abcdef1234567890abcdef'
ticket = client.get_ticket_by_sys_id(sys_id)
```

---

##### `update_ticket(ticket_number, update_data, table='incident')`

Update a ticket in ServiceNow.

**Parameters:**
- `ticket_number` (str): Ticket number
- `update_data` (dict): Dictionary of fields to update
- `table` (str): ServiceNow table name (default: 'incident')

**Returns:**
- `bool`: True if successful, False otherwise

**Example:**
```python
update_data = {
    'assignment_group': 'Cloud Managed Services',
    'work_notes': 'Auto-assigned by AI Agent',
    'state': '2',  # In Progress
    'priority': '2'
}

success = client.update_ticket('INC0012345', update_data)

if success:
    print("Ticket updated successfully")
else:
    print("Update failed")
```

**Common Update Fields:**
```python
{
    'assignment_group': 'Group Name',
    'assigned_to': 'user_sys_id',
    'state': '1',  # 1=New, 2=In Progress, 6=Resolved, 7=Closed
    'priority': '1',  # 1=Critical, 2=High, 3=Moderate, 4=Low
    'work_notes': 'Internal note',
    'comments': 'User-visible comment',
    'close_notes': 'Resolution notes',
    'close_code': 'Solved (Permanently)'
}
```

---

##### `update_ticket_by_sys_id(sys_id, update_data, table='incident')`

Update a ticket by sys_id (more efficient).

**Parameters:**
- `sys_id` (str): ServiceNow sys_id
- `update_data` (dict): Dictionary of fields to update
- `table` (str): ServiceNow table name (default: 'incident')

**Returns:**
- `bool`: True if successful, False otherwise

**Example:**
```python
success = client.update_ticket_by_sys_id(
    sys_id='abc123...',
    update_data={'state': '6'}  # Resolve
)
```

---

##### `create_ticket(ticket_data, table='incident')`

Create a new ticket in ServiceNow.

**Parameters:**
- `ticket_data` (dict): Dictionary of ticket fields
- `table` (str): ServiceNow table name (default: 'incident')

**Returns:**
- `Dict[str, Any]` or `None`: Created ticket or None if failed

**Example:**
```python
ticket_data = {
    'short_description': 'Network connectivity issue',
    'description': 'Users in building 5 cannot access network',
    'priority': '2',
    'urgency': '2',
    'impact': '2',
    'caller_id': 'user_sys_id',
    'assignment_group': 'Network Team'
}

new_ticket = client.create_ticket(ticket_data)

if new_ticket:
    print(f"Created ticket: {new_ticket['number']}")
else:
    print("Ticket creation failed")
```

---

##### `add_work_note(ticket_number, work_note, table='incident')`

Add an internal work note to a ticket.

**Parameters:**
- `ticket_number` (str): Ticket number
- `work_note` (str): Work note text
- `table` (str): ServiceNow table name (default: 'incident')

**Returns:**
- `bool`: True if successful, False otherwise

**Example:**
```python
success = client.add_work_note(
    'INC0012345',
    'Investigated issue. Restarting service on server.'
)
```

**Note:** Work notes are internal and not visible to end users.

---

##### `add_comment(ticket_number, comment, table='incident')`

Add a user-visible comment to a ticket.

**Parameters:**
- `ticket_number` (str): Ticket number
- `comment` (str): Comment text
- `table` (str): ServiceNow table name (default: 'incident')

**Returns:**
- `bool`: True if successful, False otherwise

**Example:**
```python
success = client.add_comment(
    'INC0012345',
    'We are currently investigating your issue and will update you shortly.'
)
```

**Note:** Comments are visible to end users in the service portal.

---

##### `get_assignment_groups(name_filter=None)`

Get assignment groups from ServiceNow.

**Parameters:**
- `name_filter` (str, optional): Filter by group name

**Returns:**
- `List[Dict[str, Any]]`: List of assignment groups

**Example:**
```python
# Get all groups
all_groups = client.get_assignment_groups()

# Get groups matching "Cloud"
cloud_groups = client.get_assignment_groups(name_filter='Cloud')

for group in cloud_groups:
    print(f"{group['name']} (ID: {group['sys_id']})")
```

---

##### `test_connection()`

Test the connection to ServiceNow.

**Returns:**
- `bool`: True if connection successful, False otherwise

**Example:**
```python
if client.test_connection():
    print("✓ Connected to ServiceNow")
else:
    print("✗ Connection failed")
```

---

##### `close()`

Close the client session.

```python
client.close()
```

**Note:** The client also supports context manager:
```python
with ServiceNowClient(url, user, password) as client:
    tickets = client.get_tickets()
# Session automatically closed
```

---

## Usage Examples

### Example 1: Basic Connection & Query

```python
from servicenow_client import ServiceNowClient

# Initialize client
client = ServiceNowClient(
    instance_url='https://your-instance.service-now.com',
    username='admin',
    password='your-password'
)

# Test connection
if not client.test_connection():
    print("Connection failed!")
    exit(1)

# Query unassigned tickets
query_params = {
    'sysparm_query': 'assignment_group=NULL',
    'sysparm_limit': 10
}

tickets = client.get_tickets(query_params)
print(f"Found {len(tickets)} unassigned tickets")

# Close connection
client.close()
```

### Example 2: Using Context Manager

```python
from servicenow_client import ServiceNowClient

with ServiceNowClient(url, username, password) as client:
    # Get ticket
    ticket = client.get_ticket('INC0012345')
    
    # Update ticket
    if ticket:
        client.update_ticket(
            'INC0012345',
            {'state': '2', 'work_notes': 'Working on issue'}
        )
# Session automatically closed
```

### Example 3: Creating and Updating Tickets

```python
from servicenow_client import ServiceNowClient, ServiceNowException

client = ServiceNowClient(url, username, password)

try:
    # Create new ticket
    ticket_data = {
        'short_description': 'Application Error',
        'description': 'Users experiencing errors in production app',
        'priority': '1',
        'urgency': '1',
        'impact': '1'
    }
    
    new_ticket = client.create_ticket(ticket_data)
    
    if new_ticket:
        ticket_number = new_ticket['number']
        print(f"Created ticket: {ticket_number}")
        
        # Add work note
        client.add_work_note(
            ticket_number,
            'Escalated to development team'
        )
        
        # Update assignment
        client.update_ticket(
            ticket_number,
            {'assignment_group': 'Application Support'}
        )

except ServiceNowException as e:
    print(f"Error: {str(e)}")
finally:
    client.close()
```

### Example 4: Batch Processing

```python
from servicenow_client import ServiceNowClient

client = ServiceNowClient(url, username, password)

# Get all high-priority unassigned tickets
query_params = {
    'sysparm_query': 'assignment_group=NULL^priority=1',
    'sysparm_limit': 50
}

tickets = client.get_tickets(query_params)

# Process each ticket
for ticket in tickets:
    ticket_number = ticket['number']
    
    # Add work note
    client.add_work_note(
        ticket_number,
        'High priority ticket - reviewing now'
    )
    
    # Update state
    client.update_ticket(
        ticket_number,
        {'state': '2'}  # In Progress
    )
    
    print(f"Processed {ticket_number}")

client.close()
```

### Example 5: Error Handling

```python
from servicenow_client import ServiceNowClient, ServiceNowException
import logging

logging.basicConfig(level=logging.INFO)

client = ServiceNowClient(url, username, password)

try:
    # Attempt to get ticket
    ticket = client.get_ticket('INC9999999')
    
    if ticket:
        # Process ticket
        client.update_ticket(ticket['number'], {'state': '2'})
    else:
        logging.warning("Ticket not found")
        
except ServiceNowException as e:
    logging.error(f"ServiceNow API error: {str(e)}")
except Exception as e:
    logging.error(f"Unexpected error: {str(e)}")
finally:
    client.close()
```

---

## Configuration

### Environment Variables (.env)

```bash
# ServiceNow Connection
SNOW_INSTANCE_URL=https://your-instance.service-now.com
SNOW_USERNAME=admin
SNOW_PASSWORD=your-secure-password

# Client Configuration
SNOW_API_VERSION=v1
SNOW_TIMEOUT=30
SNOW_VERIFY_SSL=true
```

### Python Configuration

```python
import os
from dotenv import load_dotenv
from servicenow_client import ServiceNowClient

# Load environment variables
load_dotenv()

# Initialize client with env vars
client = ServiceNowClient(
    instance_url=os.getenv('SNOW_INSTANCE_URL'),
    username=os.getenv('SNOW_USERNAME'),
    password=os.getenv('SNOW_PASSWORD'),
    api_version=os.getenv('SNOW_API_VERSION', 'v1'),
    timeout=int(os.getenv('SNOW_TIMEOUT', 30)),
    verify_ssl=os.getenv('SNOW_VERIFY_SSL', 'true').lower() == 'true'
)
```

---

## Error Handling

### Exception Hierarchy

```
Exception
    └── ServiceNowException
            ├── HTTP Errors (40x, 50x)
            ├── Connection Errors
            ├── Timeout Errors
            ├── Request Errors
            └── JSON Decode Errors
```

### Common Errors

| Error Type | Cause | Solution |
|------------|-------|----------|
| `ServiceNowException: HTTP error 401` | Invalid credentials | Check username/password |
| `ServiceNowException: HTTP error 403` | Insufficient permissions | Check user roles |
| `ServiceNowException: HTTP error 404` | Invalid endpoint/resource | Verify URL and sys_id |
| `ServiceNowException: Connection error` | Network issues | Check connectivity |
| `ServiceNowException: Request timeout` | Slow response | Increase timeout value |
| `ServiceNowException: Invalid JSON` | Malformed response | Check API version |

### Error Handling Pattern

```python
from servicenow_client import ServiceNowClient, ServiceNowException
import time

def retry_operation(func, max_retries=3, delay=5):
    """Retry an operation with exponential backoff."""
    for attempt in range(max_retries):
        try:
            return func()
        except ServiceNowException as e:
            if attempt < max_retries - 1:
                wait_time = delay * (2 ** attempt)
                print(f"Attempt {attempt + 1} failed. Retrying in {wait_time}s...")
                time.sleep(wait_time)
            else:
                raise

# Usage
client = ServiceNowClient(url, user, password)

try:
    tickets = retry_operation(
        lambda: client.get_tickets({'sysparm_limit': 10})
    )
except ServiceNowException as e:
    print(f"All retries failed: {str(e)}")
```

---

## Best Practices

### 1. Use Context Managers

```python
# Good
with ServiceNowClient(url, user, password) as client:
    tickets = client.get_tickets()

# Avoid
client = ServiceNowClient(url, user, password)
tickets = client.get_tickets()
# Session not closed!
```

### 2. Limit Query Results

```python
# Good - use pagination
query_params = {
    'sysparm_limit': 50,
    'sysparm_offset': 0
}

# Avoid - fetching all records
query_params = {}  # Could return thousands
```

### 3. Select Specific Fields

```python
# Good - only fetch needed fields
query_params = {
    'sysparm_fields': 'number,short_description,priority'
}

# Avoid - fetching all fields
query_params = {}  # Returns everything
```

### 4. Handle Errors Gracefully

```python
# Good
try:
    ticket = client.get_ticket('INC0012345')
    if ticket:
        client.update_ticket(ticket['number'], data)
except ServiceNowException as e:
    logger.error(f"Failed to process ticket: {str(e)}")

# Avoid
ticket = client.get_ticket('INC0012345')
client.update_ticket(ticket['number'], data)  # Could fail
```

### 5. Use Efficient Methods

```python
# Good - direct sys_id lookup
ticket = client.get_ticket_by_sys_id(sys_id)

# Less efficient - query by number
ticket = client.get_ticket(ticket_number)
```

### 6. Cache Assignment Groups

```python
# Good - cache groups
assignment_groups = client.get_assignment_groups()
group_cache = {g['name']: g['sys_id'] for g in assignment_groups}

# Then use cache
group_sys_id = group_cache.get('Cloud Managed Services')
```

---

## Security Considerations

### 1. Credential Management

**Never hardcode credentials:**
```python
# BAD - credentials in code
client = ServiceNowClient(
    'https://instance.service-now.com',
    'admin',
    'password123'  # DON'T DO THIS!
)

# GOOD - use environment variables
client = ServiceNowClient(
    os.getenv('SNOW_INSTANCE_URL'),
    os.getenv('SNOW_USERNAME'),
    os.getenv('SNOW_PASSWORD')
)
```

### 2. SSL Verification

```python
# Production - always verify SSL
client = ServiceNowClient(url, user, password, verify_ssl=True)

# Development only - can disable for testing
client = ServiceNowClient(url, user, password, verify_ssl=False)
```

### 3. API Permissions

Ensure the ServiceNow user has appropriate roles:
- `itil` - Basic ITIL user
- `rest_api_explorer` - API access
- `incident_manager` - Manage incidents

### 4. Rate Limiting

Implement rate limiting to avoid overwhelming ServiceNow:

```python
import time
from functools import wraps

def rate_limit(calls_per_second=10):
    """Decorator to rate limit API calls."""
    min_interval = 1.0 / calls_per_second
    last_call = [0.0]
    
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            elapsed = time.time() - last_call[0]
            if elapsed < min_interval:
                time.sleep(min_interval - elapsed)
            result = func(*args, **kwargs)
            last_call[0] = time.time()
            return result
        return wrapper
    return decorator

# Usage
@rate_limit(calls_per_second=5)
def get_ticket_safe(client, ticket_number):
    return client.get_ticket(ticket_number)
```

---

## Change Log

| Date | Version | Changes |
|------|---------|---------|
| 2026-01-23 | 1.0.0 | Initial implementation with full REST API support |

---

## Support

For questions or issues:
1. Check ServiceNow API documentation
2. Review error logs
3. Test connection with `test_connection()`
4. Contact: [Your Team Contact Info]

---

**End of Documentation**