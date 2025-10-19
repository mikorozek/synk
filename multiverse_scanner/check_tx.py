#!/usr/bin/env python3
"""
Quick script to check transaction details and see why it failed
"""
import requests
import json
import sys
from base64 import b64decode

# Get tx hash from command line or use the last one
if len(sys.argv) > 1:
    tx_hash = sys.argv[1]
else:
    # The last transaction hash from our test
    tx_hash = '1f9c9b10ff6f355983ddc631c29ba7effb64013f4d9d53f4b08c1d8ede95ad29'

print(f"Checking transaction: {tx_hash}")
print(f"Explorer: https://testnet-explorer.multiversx.com/transactions/{tx_hash}")
print("=" * 80)

# Fetch transaction details
url = f'https://testnet-api.multiversx.com/transactions/{tx_hash}'
response = requests.get(url)

if response.status_code != 200:
    print(f"Error fetching transaction: {response.status_code}")
    print(response.text)
    sys.exit(1)

data = response.json()

# Print basic info
print(f"\n📋 BASIC INFO:")
print(f"  Status: {data.get('status')}")
print(f"  Function: {data.get('function')}")
print(f"  Sender: {data.get('sender')}")
print(f"  Receiver: {data.get('receiver')}")
print(f"  Value: {data.get('value')}")
print(f"  Gas Limit: {data.get('gasLimit')}")
print(f"  Gas Used: {data.get('gasUsed')}")

# Print data field
if 'data' in data and data['data']:
    decoded_data = b64decode(data['data']).decode('utf-8', errors='ignore')
    print(f"\n📝 TRANSACTION DATA:")
    print(f"  {decoded_data}")

# Print smart contract results (THIS IS WHERE ERRORS USUALLY ARE!)
if 'results' in data and data['results']:
    print(f"\n🔧 SMART CONTRACT RESULTS:")
    for i, result in enumerate(data['results'], 1):
        print(f"\n  Result #{i}:")
        if 'returnMessage' in result and result['returnMessage']:
            print(f"    ❌ RETURN MESSAGE: {result['returnMessage']}")
        if 'data' in result and result['data']:
            try:
                decoded = b64decode(result['data']).decode('utf-8', errors='ignore')
                print(f"    Data: {decoded[:200]}")
            except:
                print(f"    Data (raw): {result['data'][:100]}")

# Print operations (token transfers, etc)
if 'operations' in data and data['operations']:
    print(f"\n💸 OPERATIONS:")
    for op in data['operations']:
        print(f"  - {op.get('action')}: {op.get('type')} {op.get('value')} {op.get('identifier', '')}")

# Print logs and events
if 'logs' in data and 'events' in data['logs']:
    print(f"\n📢 EVENTS:")
    for event in data['logs']['events']:
        identifier = event.get('identifier', 'unknown')
        print(f"\n  Event: {identifier}")
        
        # Decode topics
        if 'topics' in event and event['topics']:
            print(f"    Topics:")
            for j, topic in enumerate(event['topics']):
                try:
                    decoded = b64decode(topic).decode('utf-8', errors='ignore')
                    if decoded.strip():
                        print(f"      [{j}]: {decoded}")
                    else:
                        # Try hex representation
                        topic_bytes = b64decode(topic)
                        print(f"      [{j}]: {topic_bytes.hex()}")
                except:
                    print(f"      [{j}]: (decode failed)")
        
        # Decode data
        if 'data' in event and event['data']:
            try:
                decoded = b64decode(event['data']).decode('utf-8', errors='ignore')
                if decoded.strip():
                    print(f"    Data: {decoded}")
            except:
                pass

print("\n" + "=" * 80)
