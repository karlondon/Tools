"""
Ticket Monitor for ServiceNow Integration
Monitors ServiceNow for new tickets and triggers triage process.
"""

import time
import logging
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional, Callable
from enum import Enum

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class MonitorMode(Enum):
    """Monitoring modes for ticket detection."""
    POLLING = "polling"
    WEBHOOK = "webhook"


class TicketMonitor:
    """
    Monitor ServiceNow for new tickets and trigger triage processing.
    
    Supports two modes:
    - Polling: Periodically checks ServiceNow for new tickets
    - Webhook: Receives notifications when tickets are created (future enhancement)
    """
    
    def __init__(
        self,
        servicenow_client,
        triage_engine,
        mode: MonitorMode = MonitorMode.POLLING,
        poll_interval: int = 60,
        max_tickets_per_poll: int = 50
    ):
        """
        Initialize the Ticket Monitor.
        
        Args:
            servicenow_client: ServiceNow client for API interactions
            triage_engine: Triage engine for ticket analysis
            mode: Monitoring mode (POLLING or WEBHOOK)
            poll_interval: Seconds between polling cycles (default: 60)
            max_tickets_per_poll: Maximum tickets to process per cycle (default: 50)
        """
        self.snow_client = servicenow_client
        self.triage_engine = triage_engine
        self.mode = mode
        self.poll_interval = poll_interval
        self.max_tickets_per_poll = max_tickets_per_poll
        self.is_running = False
        self.last_poll_time = None
        self.stats = {
            'total_processed': 0,
            'auto_assigned': 0,
            'manual_review': 0,
            'errors': 0
        }
        
        logger.info(f"TicketMonitor initialized in {mode.value} mode")
    
    def start(self):
        """Start the ticket monitoring process."""
        if self.is_running:
            logger.warning("Monitor is already running")
            return
        
        self.is_running = True
        logger.info("Starting ticket monitor...")
        
        if self.mode == MonitorMode.POLLING:
            self._start_polling()
        elif self.mode == MonitorMode.WEBHOOK:
            self._start_webhook_server()
    
    def stop(self):
        """Stop the ticket monitoring process."""
        self.is_running = False
        logger.info("Ticket monitor stopped")
        self._print_stats()
    
    def _start_polling(self):
        """Start polling ServiceNow for new tickets."""
        logger.info(f"Polling started (interval: {self.poll_interval}s)")
        
        try:
            while self.is_running:
                try:
                    # Get new tickets since last poll
                    new_tickets = self._fetch_new_tickets()
                    
                    if new_tickets:
                        logger.info(f"Found {len(new_tickets)} new ticket(s)")
                        self._process_tickets(new_tickets)
                    else:
                        logger.debug("No new tickets found")
                    
                    # Update last poll time
                    self.last_poll_time = datetime.now()
                    
                    # Wait before next poll
                    time.sleep(self.poll_interval)
                    
                except KeyboardInterrupt:
                    logger.info("Received interrupt signal")
                    self.stop()
                    break
                except Exception as e:
                    logger.error(f"Error in polling cycle: {str(e)}", exc_info=True)
                    self.stats['errors'] += 1
                    time.sleep(self.poll_interval)
                    
        except Exception as e:
            logger.error(f"Fatal error in polling loop: {str(e)}", exc_info=True)
            self.is_running = False
    
    def _fetch_new_tickets(self) -> List[Dict[str, Any]]:
        """
        Fetch new tickets from ServiceNow.
        
        Returns:
            List of new ticket dictionaries
        """
        try:
            # Calculate time window for query
            if self.last_poll_time:
                start_time = self.last_poll_time
            else:
                # First run - get tickets from last hour
                start_time = datetime.now() - timedelta(hours=1)
            
            # Build query parameters
            query_params = {
                'sysparm_query': f'sys_created_on>{start_time.strftime("%Y-%m-%d %H:%M:%S")}^assignment_group=NULL',
                'sysparm_limit': self.max_tickets_per_poll,
                'sysparm_fields': 'number,short_description,description,sys_created_on,priority,urgency,state,assigned_to,assignment_group',
                'sysparm_display_value': 'false'
            }
            
            # Fetch tickets from ServiceNow
            tickets = self.snow_client.get_tickets(query_params)
            
            return tickets if tickets else []
            
        except Exception as e:
            logger.error(f"Error fetching tickets: {str(e)}")
            return []
    
    def _process_tickets(self, tickets: List[Dict[str, Any]]):
        """
        Process a batch of tickets through the triage engine.
        
        Args:
            tickets: List of ticket dictionaries to process
        """
        for ticket in tickets:
            try:
                self._process_single_ticket(ticket)
            except Exception as e:
                logger.error(
                    f"Error processing ticket {ticket.get('number', 'UNKNOWN')}: {str(e)}",
                    exc_info=True
                )
                self.stats['errors'] += 1
    
    def _process_single_ticket(self, ticket: Dict[str, Any]):
        """
        Process a single ticket through triage and assignment.
        
        Args:
            ticket: Ticket dictionary to process
        """
        ticket_number = ticket.get('number', 'UNKNOWN')
        
        logger.info(f"Processing ticket: {ticket_number}")
        
        # Analyze ticket with triage engine
        triage_result = self.triage_engine.assign_ticket(ticket)
        
        # Update statistics
        self.stats['total_processed'] += 1
        
        if triage_result['assignment_group']:
            # Auto-assign ticket
            self._assign_ticket(ticket, triage_result)
            self.stats['auto_assigned'] += 1
            logger.info(
                f"Ticket {ticket_number} auto-assigned to {triage_result['assignment_group']}"
            )
        else:
            # No match - requires manual review
            self._flag_for_manual_review(ticket, triage_result)
            self.stats['manual_review'] += 1
            logger.info(f"Ticket {ticket_number} flagged for manual review")
    
    def _assign_ticket(self, ticket: Dict[str, Any], triage_result: Dict[str, Any]):
        """
        Assign ticket to the recommended assignment group.
        
        Args:
            ticket: Ticket dictionary
            triage_result: Triage engine result
        """
        try:
            ticket_number = ticket.get('number')
            assignment_group = triage_result['assignment_group']
            reason = triage_result['reason']
            
            # Prepare update payload
            update_data = {
                'assignment_group': assignment_group,
                'work_notes': f"[Auto-Triage] {reason}. Assigned by AI Agent.",
                'state': '2'  # In Progress
            }
            
            # Update ticket in ServiceNow
            success = self.snow_client.update_ticket(ticket_number, update_data)
            
            if success:
                logger.info(f"Successfully assigned {ticket_number} to {assignment_group}")
            else:
                logger.error(f"Failed to assign {ticket_number}")
                self.stats['errors'] += 1
                
        except Exception as e:
            logger.error(f"Error assigning ticket: {str(e)}")
            raise
    
    def _flag_for_manual_review(self, ticket: Dict[str, Any], triage_result: Dict[str, Any]):
        """
        Flag ticket for manual review when no auto-assignment is possible.
        
        Args:
            ticket: Ticket dictionary
            triage_result: Triage engine result
        """
        try:
            ticket_number = ticket.get('number')
            
            # Add work note indicating manual review needed
            update_data = {
                'work_notes': f"[Auto-Triage] {triage_result['reason']}. Manual assignment required.",
                'comments': 'This ticket requires manual triage - no matching assignment rules found.'
            }
            
            # Update ticket in ServiceNow
            self.snow_client.update_ticket(ticket_number, update_data)
            
            logger.info(f"Ticket {ticket_number} flagged for manual review")
            
        except Exception as e:
            logger.error(f"Error flagging ticket for manual review: {str(e)}")
    
    def _start_webhook_server(self):
        """
        Start webhook server for receiving ServiceNow notifications.
        (Future enhancement - not yet implemented)
        """
        logger.warning("Webhook mode not yet implemented. Use POLLING mode.")
        raise NotImplementedError("Webhook mode is not yet implemented")
    
    def _print_stats(self):
        """Print monitoring statistics."""
        logger.info("=" * 60)
        logger.info("Ticket Monitor Statistics:")
        logger.info(f"  Total Processed: {self.stats['total_processed']}")
        logger.info(f"  Auto-Assigned: {self.stats['auto_assigned']}")
        logger.info(f"  Manual Review: {self.stats['manual_review']}")
        logger.info(f"  Errors: {self.stats['errors']}")
        logger.info("=" * 60)
    
    def get_stats(self) -> Dict[str, int]:
        """
        Get current monitoring statistics.
        
        Returns:
            Dictionary with monitoring statistics
        """
        return self.stats.copy()
    
    def process_ticket_callback(self, ticket: Dict[str, Any]):
        """
        Callback for processing a single ticket (e.g., from webhook).
        
        Args:
            ticket: Ticket dictionary to process
        """
        try:
            self._process_single_ticket(ticket)
        except Exception as e:
            logger.error(f"Error in callback processing: {str(e)}")


class TicketMonitorBuilder:
    """Builder class for creating TicketMonitor instances with configuration."""
    
    def __init__(self):
        """Initialize the builder."""
        self._servicenow_client = None
        self._triage_engine = None
        self._mode = MonitorMode.POLLING
        self._poll_interval = 60
        self._max_tickets_per_poll = 50
    
    def with_servicenow_client(self, client):
        """Set the ServiceNow client."""
        self._servicenow_client = client
        return self
    
    def with_triage_engine(self, engine):
        """Set the triage engine."""
        self._triage_engine = engine
        return self
    
    def with_mode(self, mode: MonitorMode):
        """Set the monitoring mode."""
        self._mode = mode
        return self
    
    def with_poll_interval(self, seconds: int):
        """Set the polling interval."""
        self._poll_interval = seconds
        return self
    
    def with_max_tickets_per_poll(self, max_tickets: int):
        """Set the maximum tickets per polling cycle."""
        self._max_tickets_per_poll = max_tickets
        return self
    
    def build(self) -> TicketMonitor:
        """
        Build and return the TicketMonitor instance.
        
        Returns:
            Configured TicketMonitor instance
        
        Raises:
            ValueError: If required components are not set
        """
        if not self._servicenow_client:
            raise ValueError("ServiceNow client is required")
        if not self._triage_engine:
            raise ValueError("Triage engine is required")
        
        return TicketMonitor(
            servicenow_client=self._servicenow_client,
            triage_engine=self._triage_engine,
            mode=self._mode,
            poll_interval=self._poll_interval,
            max_tickets_per_poll=self._max_tickets_per_poll
        )


# Example usage
if __name__ == "__main__":
    # Mock clients for testing
    class MockServiceNowClient:
        """Mock ServiceNow client for testing."""
        
        def get_tickets(self, query_params):
            """Mock get tickets."""
            # Return sample tickets for testing
            return [
                {
                    'number': 'INC0012345',
                    'short_description': 'PPL cloud access issue',
                    'description': 'User cannot access PPL resources',
                    'sys_created_on': '2026-01-23 19:00:00',
                    'priority': '3',
                    'state': '1'
                },
                {
                    'number': 'INC0012346',
                    'short_description': 'Odeon portal down',
                    'description': 'Odeon system not responding',
                    'sys_created_on': '2026-01-23 19:05:00',
                    'priority': '2',
                    'state': '1'
                }
            ]
        
        def update_ticket(self, ticket_number, update_data):
            """Mock update ticket."""
            logger.info(f"[MOCK] Updated {ticket_number}: {update_data}")
            return True
    
    # Import triage engine
    from triage_engine import TriageEngine
    
    # Initialize components
    snow_client = MockServiceNowClient()
    triage_engine = TriageEngine()
    
    # Build monitor using builder pattern
    monitor = (TicketMonitorBuilder()
               .with_servicenow_client(snow_client)
               .with_triage_engine(triage_engine)
               .with_mode(MonitorMode.POLLING)
               .with_poll_interval(5)  # 5 seconds for testing
               .with_max_tickets_per_poll(10)
               .build())
    
    # Start monitoring
    print("Starting ticket monitor (Press Ctrl+C to stop)...")
    try:
        monitor.start()
    except KeyboardInterrupt:
        print("\nStopping monitor...")
        monitor.stop()