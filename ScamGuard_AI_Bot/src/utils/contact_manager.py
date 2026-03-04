"""
Contact manager with SQLite database.
Tracks known contacts, whitelisted users, blocked scammers,
and conversation history.
"""

import json
import logging
import os
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)

class ContactManager:
    """
    Manages contacts database using SQLite.
    
    Tracks:
    - Whitelisted contacts (known good)
    - Blocked contacts (known scammers)
    - Conversation history per contact
    - Scam detection results
    """

    def __init__(self, db_path: Optional[str] = None):
        if db_path is None:
            db_path = os.getenv("DATABASE_PATH", "data/scamguard.db")

        # Ensure directory exists
        db_dir = Path(db_path).parent
        db_dir.mkdir(parents=True, exist_ok=True)

        self.db_path = db_path
        self._init_database()
        logger.info("ContactManager initialized (db=%s)", db_path)

    def _init_database(self) -> None:
        """Create database tables if they don't exist."""
        with sqlite3.connect(self.db_path) as conn:
            conn.executescript("""
                CREATE TABLE IF NOT EXISTS contacts (
                    sender_id TEXT PRIMARY KEY,
                    sender_name TEXT DEFAULT '',
                    platform TEXT DEFAULT 'telegram',
                    status TEXT DEFAULT 'unknown',
                    scam_type TEXT DEFAULT '',
                    scam_score REAL DEFAULT 0.0,
                    first_seen TEXT NOT NULL,
                    last_seen TEXT NOT NULL,
                    message_count INTEGER DEFAULT 0,
                    notes TEXT DEFAULT ''
                );

                CREATE TABLE IF NOT EXISTS conversations (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    sender_id TEXT NOT NULL,
                    role TEXT NOT NULL,
                    content TEXT NOT NULL,
                    timestamp TEXT NOT NULL,
                    classification TEXT DEFAULT '',
                    FOREIGN KEY (sender_id) REFERENCES contacts(sender_id)
                );

                CREATE TABLE IF NOT EXISTS reports (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    sender_id TEXT NOT NULL,
                    platform TEXT NOT NULL,
                    report_type TEXT NOT NULL,
                    report_data TEXT DEFAULT '',
                    reported_at TEXT NOT NULL,
                    status TEXT DEFAULT 'pending',
                    FOREIGN KEY (sender_id) REFERENCES contacts(sender_id)
                );

                CREATE INDEX IF NOT EXISTS idx_conversations_sender 
                    ON conversations(sender_id);
                CREATE INDEX IF NOT EXISTS idx_contacts_status 
                    ON contacts(status);
            """)

    def is_known_contact(self, sender_id: str) -> bool:
        """Check if a sender is a known (whitelisted) contact."""
        with sqlite3.connect(self.db_path) as conn:
            row = conn.execute(
                "SELECT status FROM contacts WHERE sender_id = ?",
                (sender_id,),
            ).fetchone()
            return row is not None and row[0] == "whitelisted"

    def is_blocked(self, sender_id: str) -> bool:
        """Check if a sender is blocked."""
        with sqlite3.connect(self.db_path) as conn:
            row = conn.execute(
                "SELECT status FROM contacts WHERE sender_id = ?",
                (sender_id,),
            ).fetchone()
            return row is not None and row[0] == "blocked"

    def get_contact_status(self, sender_id: str) -> Optional[str]:
        """Get the status of a contact (whitelisted, blocked, scammer, unknown)."""
        with sqlite3.connect(self.db_path) as conn:
            row = conn.execute(
                "SELECT status FROM contacts WHERE sender_id = ?",
                (sender_id,),
            ).fetchone()
            return row[0] if row else None

    def add_or_update_contact(
        self,
        sender_id: str,
        sender_name: str = "",
        platform: str = "telegram",
        status: str = "unknown",
        scam_type: str = "",
        scam_score: float = 0.0,
    ) -> None:
        """Add a new contact or update an existing one."""
        now = datetime.now(timezone.utc).isoformat()
        with sqlite3.connect(self.db_path) as conn:
            existing = conn.execute(
                "SELECT sender_id FROM contacts WHERE sender_id = ?",
                (sender_id,),
            ).fetchone()

            if existing:
                conn.execute(
                    """UPDATE contacts 
                       SET sender_name = COALESCE(NULLIF(?, ''), sender_name),
                           status = ?,
                           scam_type = COALESCE(NULLIF(?, ''), scam_type),
                           scam_score = ?,
                           last_seen = ?,
                           message_count = message_count + 1
                       WHERE sender_id = ?""",
                    (sender_name, status, scam_type, scam_score, now, sender_id),
                )
            else:
                conn.execute(
                    """INSERT INTO contacts 
                       (sender_id, sender_name, platform, status, scam_type, 
                        scam_score, first_seen, last_seen, message_count)
                       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)""",
                    (sender_id, sender_name, platform, status, scam_type,
                     scam_score, now, now),
                )

    def whitelist_contact(self, sender_id: str) -> None:
        """Add a contact to the whitelist."""
        now = datetime.now(timezone.utc).isoformat()
        with sqlite3.connect(self.db_path) as conn:
            existing = conn.execute(
                "SELECT sender_id FROM contacts WHERE sender_id = ?",
                (sender_id,),
            ).fetchone()

            if existing:
                conn.execute(
                    "UPDATE contacts SET status = 'whitelisted', last_seen = ? WHERE sender_id = ?",
                    (now, sender_id),
                )
            else:
                conn.execute(
                    """INSERT INTO contacts 
                       (sender_id, sender_name, platform, status, first_seen, last_seen)
                       VALUES (?, '', 'telegram', 'whitelisted', ?, ?)""",
                    (sender_id, now, now),
                )
        logger.info("Contact %s whitelisted", sender_id)

    def block_contact(self, sender_id: str) -> None:
        """Block a contact."""
        now = datetime.now(timezone.utc).isoformat()
        with sqlite3.connect(self.db_path) as conn:
            existing = conn.execute(
                "SELECT sender_id FROM contacts WHERE sender_id = ?",
                (sender_id,),
            ).fetchone()

            if existing:
                conn.execute(
                    "UPDATE contacts SET status = 'blocked', last_seen = ? WHERE sender_id = ?",
                    (now, sender_id),
                )
            else:
                conn.execute(
                    """INSERT INTO contacts 
                       (sender_id, sender_name, platform, status, first_seen, last_seen)
                       VALUES (?, '', 'telegram', 'blocked', ?, ?)""",
                    (sender_id, now, now),
                )
        logger.info("Contact %s blocked", sender_id)

    def save_message(
        self,
        sender_id: str,
        role: str,
        content: str,
        classification: str = "",
    ) -> None:
        """
        Save a message to conversation history.
        
        Args:
            sender_id: The contact's ID.
            role: 'user' for incoming, 'assistant' for bot responses.
            content: The message text.
            classification: Detection classification if available.
        """
        now = datetime.now(timezone.utc).isoformat()
        with sqlite3.connect(self.db_path) as conn:
            conn.execute(
                """INSERT INTO conversations (sender_id, role, content, timestamp, classification)
                   VALUES (?, ?, ?, ?, ?)""",
                (sender_id, role, content, now, classification),
            )

    def get_conversation_history(
        self, sender_id: str, limit: int = 20
    ) -> list[dict]:
        """
        Get conversation history for a contact.
        
        Args:
            sender_id: The contact's ID.
            limit: Maximum number of messages to return.
            
        Returns:
            List of message dicts with role, content, timestamp.
        """
        with sqlite3.connect(self.db_path) as conn:
            rows = conn.execute(
                """SELECT role, content, timestamp, classification
                   FROM conversations
                   WHERE sender_id = ?
                   ORDER BY timestamp DESC
                   LIMIT ?""",
                (sender_id, limit),
            ).fetchall()

        # Return in chronological order
        return [
            {
                "role": row[0],
                "content": row[1],
                "timestamp": row[2],
                "classification": row[3],
            }
            for row in reversed(rows)
        ]

    def get_message_count(self, sender_id: str) -> int:
        """Get total message count for a contact."""
        with sqlite3.connect(self.db_path) as conn:
            row = conn.execute(
                "SELECT COUNT(*) FROM conversations WHERE sender_id = ?",
                (sender_id,),
            ).fetchone()
            return row[0] if row else 0

    def save_report(
        self,
        sender_id: str,
        platform: str,
        report_type: str,
        report_data: str = "",
    ) -> None:
        """Save a scam report."""
        now = datetime.now(timezone.utc).isoformat()
        with sqlite3.connect(self.db_path) as conn:
            conn.execute(
                """INSERT INTO reports (sender_id, platform, report_type, report_data, reported_at)
                   VALUES (?, ?, ?, ?, ?)""",
                (sender_id, platform, report_type, report_data, now),
            )

    def get_stats(self) -> dict:
        """Get overall statistics."""
        with sqlite3.connect(self.db_path) as conn:
            total = conn.execute("SELECT COUNT(*) FROM contacts").fetchone()[0]
            scammers = conn.execute(
                "SELECT COUNT(*) FROM contacts WHERE status = 'scammer'"
            ).fetchone()[0]
            blocked = conn.execute(
                "SELECT COUNT(*) FROM contacts WHERE status = 'blocked'"
            ).fetchone()[0]
            whitelisted = conn.execute(
                "SELECT COUNT(*) FROM contacts WHERE status = 'whitelisted'"
            ).fetchone()[0]
            total_messages = conn.execute(
                "SELECT COUNT(*) FROM conversations"
            ).fetchone()[0]
            total_reports = conn.execute(
                "SELECT COUNT(*) FROM reports"
            ).fetchone()[0]

        return {
            "total_contacts": total,
            "scammers_detected": scammers,
            "contacts_blocked": blocked,
            "contacts_whitelisted": whitelisted,
            "total_messages": total_messages,
            "reports_filed": total_reports,
        }