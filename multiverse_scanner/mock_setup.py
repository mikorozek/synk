#!/usr/bin/env python3
"""Quick mock setup for testing YOLO trader"""

import os
import sys
import psycopg2
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv('DATABASE_URL')

try:
    conn = psycopg2.connect(DATABASE_URL)
    cursor = conn.cursor()
    
    # Check if topics table exists
    cursor.execute("""
        SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_name = 'topics'
        )
    """)
    table_exists = cursor.fetchone()[0]
    
    if not table_exists:
        print("❌ Database tables don't exist yet!")
        print("💡 Please run Prisma migrations first:")
        print("   cd /home/wojtek/side/berlin_hack/synk")
        print("   npx prisma migrate dev")
        cursor.close()
        conn.close()
        sys.exit(1)
    
    # Check if we already have YOLO topics
    cursor.execute("SELECT COUNT(*) FROM topics WHERE multiverse_yolo_mode = true")
    yolo_count = cursor.fetchone()[0]
    
    if yolo_count > 0:
        print(f"ℹ️  Found {yolo_count} existing YOLO topic(s). Skipping mock setup.")
        cursor.close()
        conn.close()
        sys.exit(0)
    
    # Insert a test topic with YOLO mode enabled
    cursor.execute("""
        INSERT INTO topics (prompt, title, multiverse_yolo_mode, created_at)
        VALUES (%s, %s, %s, %s)
        RETURNING id
    """, (
        "Monitor crypto news and trade on significant announcements",
        "🚀 Crypto Trading Signals",
        True,  # YOLO mode enabled
        datetime.now()
    ))
    
    topic_id = cursor.fetchone()[0]
    print(f"✅ Created YOLO topic with ID: {topic_id}")
    
    # Insert some test events (unread)
    events = [
        ("🔥 Bitcoin breaks $50,000!", "Major price movement detected in BTC markets"),
        ("📈 MultiversX announces new partnership", "Partnership with major DeFi protocol announced"),
        ("⚡ Breaking: New DEX listing on xExchange", "High volume expected on new trading pair"),
    ]
    
    for title, summary in events:
        cursor.execute("""
            INSERT INTO events (topic_id, title, summary, unread, created_at, published_at)
            VALUES (%s, %s, %s, %s, %s, %s)
            RETURNING id
        """, (topic_id, title, summary, True, datetime.now(), datetime.now()))
        event_id = cursor.fetchone()[0]
        print(f"✅ Created event: {title} (ID: {event_id})")
    
    conn.commit()
    cursor.close()
    conn.close()
    
    print(f"\n🎉 Mock setup complete! YOLO trader will start shortly...")

except psycopg2.OperationalError as e:
    print(f"❌ Database connection failed: {e}")
    print("💡 Make sure the database is running and accessible")
    sys.exit(1)
except Exception as e:
    print(f"❌ Setup failed: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
