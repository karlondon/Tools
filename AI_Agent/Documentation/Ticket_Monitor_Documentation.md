# Ticket Monitor Implementation Documentation

**Date:** 23 January 2026  
**Project:** AI Agent - ServiceNow Ticket Triage Automation  
**Module:** `ticket_monitor.py`

---

## Table of Contents
1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Monitoring Modes](#monitoring-modes)
4. [API Reference](#api-reference)
5. [Usage Examples](#usage-examples)
6. [Configuration](#configuration)
7. [Integration Guide](#integration-guide)
8. [Error Handling](#error-handling)
9. [Performance & Scalability](#performance--scalability)

---

## Overview

The Ticket Monitor is a continuous service that monitors ServiceNow for new unassigned tickets and automatically processes them through the triage engine for intelligent assignment.

### Key Features
- ✅ **Polling Mode**: Periodically checks ServiceNow for new tickets
- ✅ **Auto-Assignment**: Routes tickets to appropriate groups via triage engine
- ✅ **Manual Review Flagging**: Marks tickets that don't match rules
- ✅ **Statistics Tracking**: Monitors processing metrics
- ✅ **Error Recovery**: Handles failures gracefully
- ✅ **Builder Pattern**: Flexible configuration
- ⏳ **Webhook Mode**: Future enhancement for real-time notifications

### File Location
```
AI_Agent/src/ticket_monitor.py
```

---

## Architecture

### Component Diagram

```
┌─────────────────────────────────────────────────────────┐
│                   Ticket Monitor                        │
│                                                         │
│  ┌──────────────┐    ┌──────────────┐                 │
│  │   Polling    │    │   Webhook    │                 │
│  │    Engine    │    │   Server     │ (Future)        │
│  └──────┬───────┘    └──────────────┘                 │
│         │                                              │
│         ▼                                              │
│  ┌─────────────────────────────┐                      │
│  │  Ticket Fetch & Processing  │                      │
│  └─────────┬───────────────────┘                      │
│            │                                           │
│            ▼                                           │
│  ┌─────────────────────────────┐                      │
│  │      Triage Engine          │ ◄─────────────────┐  │
│  └─────────┬───────────────────┘                   │  │
│            │                                        │  │
│            ▼                                        │  │
│  ┌─────────────────────────────┐                   │  │
│  │   Assignment / Flagging     │                   │  │
│  └─────────┬───────────────────┘                   │  │
│            │                                        │  │
│            ▼                                        │  │
│  ┌─────────────────────────────┐                   │  │
│  │   ServiceNow Update         │ ──────────────────┘  │
│  └─────────────────────────────┘                      │
│                                                        │
│  ┌─────────────────────────────┐                      │
│  │   Statistics & Logging      │                      │
│  └─────────────────────────────┘                      │
└────────────────────────────────────────────────────────┘
```

### Processing Flow

```
1. Monitor Start
   ↓
2. Fetch New Tickets (Polling/Webhook)
   ↓
3. For Each Ticket:
   a. Extract ticket data
   b. Send to Triage Engine
   c. Get assignment recommendation
   d. If match found:
      - Update assignment_group
      - Add work notes
      - Set state to "In Progress"
   e. If no match:
      - Flag for manual review
      - Add comments
   f. Update statistics
   ↓
4. Wait for next cycle (Polling) or Event (Webhook)
   ↓
5. Repeat until stopped
```

---

## Monitoring Modes

### 1. Polling Mode (Currently Implemented)

**How it Works:**
- Periodically queries ServiceNow for new tickets
- Configurable polling interval (default: 60 seconds)
- Fetches tickets created since last poll
- Only processes unassigned tickets

**Advantages:**
- ✅ Simple to implement and maintain
- ✅ No firewall/network configuration needed
- ✅ Works with any ServiceNow instance

**Disadvantages:**
- ❌ Slight delay (up to polling interval)
- ❌ More API calls than webhooks
- ❌ Less efficient for low-volume scenarios

**Query Used:**
```python
sysparm_query = 'sys_created_on>{timestamp}^assignment_group=NULL'
```

This fetches:
- Tickets created after last poll
- Tickets with no assignment group (NULL)

### 2. Webhook Mode (Future Enhancement)

**Planned Implementation:**
- ServiceNow sends HTTP POST when tickets created
- Real-time processing (no delay)
- More efficient for low-volume scenarios

**Status:** Not yet implemented

---

## API Reference

### Class: `MonitorMode`

Enum defining monitoring modes.

```python
class MonitorMode(Enum):
    POLLING = "polling"
    WEBHOOK = "webhook"
```

---

### Class: `TicketMonitor`

Main monitoring class.

#### Constructor

```python
TicketMonitor(
    servicenow_client,
    triage_engine,
    mode: MonitorMode = MonitorMode.POLLING,
    poll_interval: int = 60,
    max_tickets_per_poll: int = 50
)
```

**Parameters:**
- `servicenow_client`: ServiceNow client instance for API calls
- `triage_engine`: Triage engine instance for ticket analysis
- `mode`: Monitoring mode (POLLING or WEBHOOK)
- `poll_interval`: Seconds between polls (default: 60)
- `max_tickets_per_poll`: Max tickets per cycle (default: 50)

**Example:**
```python
monitor = TicketMonitor(
    servicenow_client=snow_client,
    triage_engine=engine,
    mode=MonitorMode.POLLING,
    poll_interval=30,
    max_tickets_per_poll=100
)
```

---

#### Methods

##### `start()`

Start the monitoring process.

```python
monitor.start()
```

**Behavior:**
- Checks if already running (prevents duplicate starts)
- Initializes monitoring based on mode
- Begins continuous processing loop
- Blocks execution (runs in main thread)

---

##### `stop()`

Stop the monitoring process.

```python
monitor.stop()
```

**Behavior:**
- Sets running flag to False
- Prints final statistics
- Graceful shutdown of monitoring loop

---

##### `get_stats() -> Dict[str, int]`

Get current monitoring statistics.

```python
stats = monitor.get_stats()
```

**Returns:**
```python
{
    'total_processed': 150,
    'auto_assigned': 120,
    'manual_review': 25,
    'errors': 5
}
```

---

##### `process_ticket_callback(ticket: Dict[str, Any])`

Process a single ticket (useful for webhook mode).

```python
monitor.process_ticket_callback(ticket_data)
```

**Parameters:**
- `ticket`: Ticket dictionary to process

---

### Class: `TicketMonitorBuilder`

Builder pattern for creating TicketMonitor instances.

#### Methods

```python
builder = TicketMonitorBuilder()
builder.with_servicenow_client(client)
builder.with_triage_engine(engine)
builder.with_mode(MonitorMode.POLLING)
builder.with_poll_interval(30)
builder.with_max_tickets_per_poll(100)
monitor = builder.build()
```

**Fluent Interface Example:**
```python
monitor = (TicketMonitorBuilder()
           .with_servicenow_client(snow_client)
           .with_triage_engine(engine)
           .with_poll_interval(45)
           .build())
```

---

## Usage Examples

### Example 1: Basic Monitor Setup

```python
from servicenow_client import ServiceNowClient
from triage_engine import TriageEngine
from ticket_monitor import TicketMonitor, MonitorMode

# Initialize components
snow_client = ServiceNowClient(
    instance_url='https://your-instance.service-now.com',
    username='admin',
    password='your-password'
)

triage_engine = TriageEngine()

# Create monitor
monitor = TicketMonitor(
    servicenow_client=snow_client,
    triage_engine=triage_engine,
    mode=MonitorMode.POLLING,
    poll_interval=60
)

# Start monitoring
try:
    monitor.start()
except KeyboardInterrupt:
    monitor.stop()
```

### Example 2: Using Builder Pattern

```python
from ticket_monitor import TicketMonitorBuilder, MonitorMode

# Build with custom configuration
monitor = (TicketMonitorBuilder()
           .with_servicenow_client(snow_client)
           .with_triage_engine(triage_engine)
           .with_mode(MonitorMode.POLLING)
           .with_poll_interval(30)  # Poll every 30 seconds
           .with_max_tickets_per_poll(75)  # Process up to 75 tickets
           .build())

# Start monitoring
monitor.start()
```

### Example 3: Running as Background Service

```python
import threading
from ticket_monitor import TicketMonitor

# Create monitor
monitor = TicketMonitor(snow_client, triage_engine)

# Run in background thread
monitor_thread = threading.Thread(target=monitor.start, daemon=True)
monitor_thread.start()

# Main program continues...
print("Monitor running in background")

# Do other work...
time.sleep(3600)  # Run for 1 hour

# Stop when done
monitor.stop()
monitor_thread.join()
```

### Example 4: Monitoring with Statistics Reporting

```python
import time
from ticket_monitor import TicketMonitor

monitor = TicketMonitor(snow_client, triage_engine, poll_interval=60)

# Start in background
import threading
thread = threading.Thread(target=monitor.start, daemon=True)
thread.start()

# Periodically check stats
try:
    while True:
        time.sleep(300)  # Every 5 minutes
        stats = monitor.get_stats()
        print(f"Stats: {stats['auto_assigned']} assigned, "
              f"{stats['manual_review']} manual, "
              f"{stats['errors']} errors")
except KeyboardInterrupt:
    monitor.stop()
```

### Example 5: Testing with Mock Client

```python
# Use the built-in test mode
if __name__ == "__main__":
    from ticket_monitor import MockServiceNowClient
    from triage_engine import TriageEngine
    
    # Mock client returns sample tickets
    snow_client = MockServiceNowClient()
    triage_engine = TriageEngine()
    
    monitor = TicketMonitor(
        servicenow_client=snow_client,
        triage_engine=triage_engine,
        poll_interval=5  # Fast polling for testing
    )
    
    # Run for testing
    try:
        monitor.start()
    except KeyboardInterrupt:
        monitor.stop()
```

---

## Configuration

### Environment Variables (Recommended)

Create `.env` file:

```bash
# ServiceNow Configuration
SNOW_INSTANCE_URL=https://your-instance.service-now.com
SNOW_USERNAME=admin
SNOW_PASSWORD=your-password

# Monitor Configuration
MONITOR_MODE=polling
POLL_INTERVAL=60
MAX_TICKETS_PER_POLL=50

# Logging
LOG_LEVEL=INFO
LOG_FILE=logs/ticket_monitor.log
```

### Configuration File (Alternative)

Create `config/monitor_config.yaml`:

```yaml
servicenow:
  instance_url: https://your-instance.service-now.com
  username: admin
  password: ${SNOW_PASSWORD}  # Reference env var

monitor:
  mode: polling
  poll_interval: 60
  max_tickets_per_poll: 50
  
logging:
  level: INFO
  file: logs/ticket_monitor.log
  format: "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
```

### Polling Interval Recommendations

| Scenario | Recommended Interval | Reasoning |
|----------|---------------------|-----------|
| High Volume (>100/hour) | 30-60 seconds | Balance between timeliness and load |
| Medium Volume (20-100/hour) | 60-120 seconds | Standard monitoring |
| Low Volume (<20/hour) | 120-300 seconds | Reduce unnecessary API calls |
| Testing/Development | 5-10 seconds | Quick feedback |

---

## Integration Guide

### Complete Integration Example

```python
# main.py
import os
from dotenv import load_dotenv
from servicenow_client import ServiceNowClient
from triage_engine import TriageEngine
from ticket_monitor import TicketMonitorBuilder, MonitorMode

def main():
    # Load environment variables
    load_dotenv()
    
    # Initialize ServiceNow client
    snow_client = ServiceNowClient(
        instance_url=os.getenv('SNOW_INSTANCE_URL'),
        username=os.getenv('SNOW_USERNAME'),
        password=os.getenv('SNOW_PASSWORD')
    )
    
    # Initialize triage engine
    triage_engine = TriageEngine()
    
    # Build monitor
    monitor = (TicketMonitorBuilder()
               .with_servicenow_client(snow_client)
               .with_triage_engine(triage_engine)
               .with_mode(MonitorMode.POLLING)
               .with_poll_interval(int(os.getenv('POLL_INTERVAL', 60)))
               .with_max_tickets_per_poll(int(os.getenv('MAX_TICKETS_PER_POLL', 50)))
               .build())
    
    # Start monitoring
    print("Starting AI Agent Ticket Monitor...")
    print("Press Ctrl+C to stop")
    
    try:
        monitor.start()
    except KeyboardInterrupt:
        print("\nShutting down...")
        monitor.stop()
        print("Monitor stopped successfully")

if __name__ == "__main__":
    main()
```

### Running as System Service (Linux)

Create `/etc/systemd/system/ticket-monitor.service`:

```ini
[Unit]
Description=AI Agent Ticket Monitor
After=network.target

[Service]
Type=simple
User=serviceaccount
WorkingDirectory=/opt/ai-agent
Environment="PATH=/usr/bin:/usr/local/bin"
ExecStart=/usr/bin/python3 /opt/ai-agent/src/main.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

**Commands:**
```bash
# Enable service
sudo systemctl enable ticket-monitor

# Start service
sudo systemctl start ticket-monitor

# Check status
sudo systemctl status ticket-monitor

# View logs
sudo journalctl -u ticket-monitor -f
```

---

## Error Handling

### Built-in Error Recovery

The monitor includes robust error handling:

1. **API Failures**: Logs error, continues to next cycle
2. **Triage Engine Errors**: Logs error, skips ticket, continues
3. **Update Failures**: Logs error, increments error count
4. **Network Issues**: Waits for next cycle, retries

### Error Statistics

```python
stats = monitor.get_stats()
error_rate = stats['errors'] / stats['total_processed'] * 100
print(f"Error rate: {error_rate:.2f}%")
```

### Logging Configuration

```python
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('logs/ticket_monitor.log'),
        logging.StreamHandler()
    ]
)
```

### Common Issues & Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| No tickets found | Query too restrictive | Check query parameters |
| High error rate | Network/API issues | Check ServiceNow connectivity |
| Slow processing | Large batches | Reduce max_tickets_per_poll |
| Memory growth | Long running | Implement periodic restarts |

---

## Performance & Scalability

### Performance Metrics

**Typical Performance:**
- **Processing Speed**: ~100-200ms per ticket
- **API Latency**: 200-500ms per ServiceNow call
- **Memory Usage**: ~50-100MB base + 1KB per ticket

**Scalability:**
- **Max Throughput**: ~500-1000 tickets/hour (single instance)
- **API Rate Limits**: Respect ServiceNow limits (typically 1000 req/hour)

### Optimization Tips

1. **Batch Processing**: Use max_tickets_per_poll effectively
2. **Parallel Processing**: Run multiple instances with different filters
3. **Caching**: Cache assignment group lookups
4. **Database**: Store processed ticket IDs to avoid reprocessing

### Example: Multi-Instance Deployment

```python
# Instance 1: High Priority
monitor_p1 = TicketMonitor(
    snow_client, triage_engine,
    poll_interval=30
)
# Filter: priority=1

# Instance 2: Normal Priority
monitor_p2 = TicketMonitor(
    snow_client, triage_engine,
    poll_interval=60
)
# Filter: priority=2,3

# Run both in separate threads/processes
```

---

## Future Enhancements

### Planned Features

1. **Webhook Support**: Real-time ticket processing
2. **Multi-threading**: Parallel ticket processing
3. **Database Persistence**: Store processing history
4. **Metrics Dashboard**: Web-based monitoring UI
5. **Auto-scaling**: Dynamic adjustment based on load
6. **Health Checks**: Built-in health monitoring endpoints
7. **Circuit Breaker**: Automatic ServiceNow failover

---

## Change Log

| Date | Version | Changes |
|------|---------|---------|
| 2026-01-23 | 1.0.0 | Initial implementation with polling mode |

---

## Support

For questions or issues:
1. Check logs in `logs/ticket_monitor.log`
2. Review statistics using `get_stats()`
3. Test with MockServiceNowClient
4. Contact: [Your Team Contact Info]

---

**End of Documentation**