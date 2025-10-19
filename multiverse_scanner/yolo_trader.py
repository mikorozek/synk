#!/usr/bin/env python3
"""
YOLO MultiverseX Trader
Monitors Topic table for topics with multiverseXYoloMode enabled,
checks for new events, and executes trades when news is detected.
"""

import os
import time
import psycopg2
from datetime import datetime
from dotenv import load_dotenv
from trade import do_trade
from openai import OpenAI

# Load environment variables
load_dotenv()

# Database connection
DATABASE_URL = os.getenv('DATABASE_URL')
if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL not found in environment. Please check your .env file.")

# OpenAI client
OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')
if OPENAI_API_KEY:
    openai_client = OpenAI(api_key=OPENAI_API_KEY)
else:
    openai_client = None
    print("⚠️  OPENAI_API_KEY not found - AI summaries will be disabled")

# Trading configuration
TRADE_AMOUNT = "1000000000000000"  # 0.001 WEGLD in wei (18 decimals)
TRADE_TOKEN = "WEGLD"
TRADE_SIDE = "sell"
POLL_INTERVAL = 30  # seconds


def get_db_connection():
    """Create PostgreSQL connection."""
    return psycopg2.connect(DATABASE_URL)


def get_yolo_topics(conn):
    """Get all topics with YOLO mode enabled."""
    cursor = conn.cursor()
    cursor.execute("""
        SELECT id, title, prompt 
        FROM topics 
        WHERE multiverse_yolo_mode = true
    """)
    topics = cursor.fetchall()
    cursor.close()
    return topics


def get_unread_events(conn, topic_id):
    """Get unread events for a specific topic."""
    cursor = conn.cursor()
    cursor.execute("""
        SELECT id, title, summary, event_url, published_at, created_at
        FROM events
        WHERE topic_id = %s 
        AND unread = true
        ORDER BY created_at DESC
    """, (topic_id,))
    events = cursor.fetchall()
    cursor.close()
    return events


def mark_event_as_read(conn, event_id):
    """Mark an event as read."""
    cursor = conn.cursor()
    cursor.execute("""
        UPDATE events 
        SET unread = false 
        WHERE id = %s
    """, (event_id,))
    conn.commit()
    cursor.close()


def generate_ai_summary(event_title, event_summary, trade_result):
    """Generate AI summary of the trade using OpenAI."""
    if not openai_client:
        return None
    
    try:
        tx_hash = trade_result.get('tx_hash', 'unknown')
        status = trade_result.get('status', 'unknown')
        
        prompt = f"""Summarize this automated crypto trading action in 2-3 sentences:

News Event: {event_title}
News Details: {event_summary or 'No details'}
Trade Action: Sold 0.001 WEGLD for USDC
Trade Status: {status}
Transaction: {tx_hash}

Write a concise summary explaining why the trade was executed and the outcome."""

        response = openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are a crypto trading analyst. Provide concise summaries."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=150,
            temperature=0.7
        )
        
        summary = response.choices[0].message.content.strip()
        print(f"  🤖 AI Summary generated: {summary[:80]}...")
        return summary
        
    except Exception as e:
        print(f"  ⚠️  AI summary generation failed: {e}")
        return None


def create_trade_event(conn, topic_id, trade_result, original_event_title=None, original_event_summary=None):
    """Create a new event in the database to record the trade."""
    cursor = conn.cursor()
    
    tx_hash = trade_result.get('tx_hash', 'unknown')
    status = trade_result.get('status', 'unknown')
    
    title = f"🚀 YOLO Trade Executed: {TRADE_TOKEN} {TRADE_SIDE.upper()}"
    
    # Generate AI summary
    ai_summary = generate_ai_summary(original_event_title or "News detected", original_event_summary, trade_result)
    
    if ai_summary:
        summary = ai_summary
    else:
        # Fallback to basic summary
        summary = f"""
Automated MultiverseX Trade Executed:
- Token: {TRADE_TOKEN}
- Amount: {TRADE_AMOUNT} wei (0.001 WEGLD)
- Side: {TRADE_SIDE}
- Status: {status}
- Transaction Hash: {tx_hash}
- Explorer: https://testnet-explorer.multiversx.com/transactions/{tx_hash}
    """.strip()
    
    event_url = f"https://testnet-explorer.multiversx.com/transactions/{tx_hash}"
    
    cursor.execute("""
        INSERT INTO events (topic_id, title, summary, event_url, from_yolo_mode, unread, created_at, published_at)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        RETURNING id
    """, (
        topic_id,
        title,
        summary,
        event_url,
        True,  # from_yolo_mode
        True,  # unread
        datetime.now(),
        datetime.now()
    ))
    
    event_id = cursor.fetchone()[0]
    conn.commit()
    cursor.close()
    
    return event_id


def process_topic(conn, topic_id, topic_title):
    """Process a single YOLO topic: check for new events and execute trades."""
    print(f"\n{'='*60}")
    print(f"Processing Topic: {topic_title} (ID: {topic_id})")
    print(f"{'='*60}")
    
    # Get unread events
    events = get_unread_events(conn, topic_id)
    
    if not events:
        print(f"  ℹ️  No new events for topic '{topic_title}'")
        return
    
    print(f"  📰 Found {len(events)} new event(s)!")
    
    for event in events:
        event_id, event_title, summary, event_url, published_at, created_at = event
        
        print(f"\n  📢 NEW EVENT DETECTED:")
        print(f"     Title: {event_title}")
        print(f"     Created: {created_at}")
        if summary:
            print(f"     Summary: {summary[:100]}...")
        
        # Execute trade
        print(f"\n  🚀 Executing YOLO trade in response to news...")
        
        try:
            trade_order = {
                "coin": TRADE_TOKEN,
                "amount": TRADE_AMOUNT,
                "side": TRADE_SIDE
            }
            
            result = do_trade(trade_order)
            
            print(f"\n  ✅ Trade executed!")
            print(f"     TX Hash: {result.get('tx_hash')}")
            print(f"     Status: {result.get('status')}")
            
            # Create trade event record with AI summary
            trade_event_id = create_trade_event(conn, topic_id, result, event_title, summary)
            print(f"  📝 Trade event recorded (Event ID: {trade_event_id})")
            
            # Mark original event as read
            mark_event_as_read(conn, event_id)
            print(f"  ✓ Marked event {event_id} as read")
            
        except Exception as e:
            print(f"\n  ❌ Trade failed: {e}")
            import traceback
            traceback.print_exc()
            
            # Still mark as read to avoid reprocessing
            mark_event_as_read(conn, event_id)
            print(f"  ✓ Marked event {event_id} as read (despite failure)")


def main_loop():
    """Main monitoring loop."""
    db_info = 'configured'
    if DATABASE_URL and '@' in DATABASE_URL:
        db_info = DATABASE_URL.split('@')[1]
    
    print(f"""
╔═══════════════════════════════════════════════════════════╗
║         YOLO MultiverseX Trader - Starting Up            ║
╚═══════════════════════════════════════════════════════════╝

Configuration:
  • Poll Interval: {POLL_INTERVAL} seconds
  • Trade Token: {TRADE_TOKEN}
  • Trade Amount: {TRADE_AMOUNT} wei (0.001 WEGLD)
  • Trade Side: {TRADE_SIDE}
  • Database: {db_info}

Starting monitoring loop...
    """)
    
    while True:
        try:
            # Connect to database
            conn = get_db_connection()
            
            # Get topics with YOLO mode enabled
            topics = get_yolo_topics(conn)
            
            if not topics:
                print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] No YOLO topics found. Waiting...")
            else:
                print(f"\n[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] Checking {len(topics)} YOLO topic(s)...")
                
                # Process each topic
                for topic_id, topic_title, prompt in topics:
                    process_topic(conn, topic_id, topic_title)
            
            # Close connection
            conn.close()
            
        except Exception as e:
            print(f"\n❌ Error in main loop: {e}")
            import traceback
            traceback.print_exc()
        
        # Sleep before next iteration
        print(f"\n💤 Sleeping for {POLL_INTERVAL} seconds...")
        time.sleep(POLL_INTERVAL)


if __name__ == '__main__':
    try:
        main_loop()
    except KeyboardInterrupt:
        print("\n\n🛑 Stopped by user. Exiting...")
