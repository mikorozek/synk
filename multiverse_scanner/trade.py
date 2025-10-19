import os
import json
import time
from pathlib import Path
from dotenv import load_dotenv
import requests
from bs4 import BeautifulSoup


# SDK imports - using recommended entrypoint pattern
from multiversx_sdk import (
    TestnetEntrypoint,
    DevnetEntrypoint,
    MainnetEntrypoint,
    Account,
    ProxyNetworkProvider,
)
from multiversx_sdk.smart_contracts.smart_contract_transactions_factory import (
	SmartContractTransactionsFactory,
	StringValue,
	TransactionsFactoryConfig,
)
from multiversx_sdk.builders.token_transfers_data_builder import TokenTransfer
from multiversx_sdk import Transaction
from multiversx_sdk.core.address import Address

# ...existing code...


# --- config ---
load_dotenv()
PROXY_URL = os.getenv('PROXY_URL', 'https://testnet-gateway.multiversx.com')
PEM_PATH = os.getenv('PRIVATE_KEY_PEM')
POOL_MAP = json.loads(os.getenv('POOL_MAP', '{}') or '{}')
POOL_ADDR = os.getenv('POOL_ADDR')
NETWORK = os.getenv('NETWORK', 'testnet')


DEFAULT_GAS_LIMIT = 80_000_000


if not PEM_PATH or not Path(PEM_PATH).exists():
	raise RuntimeError('PRIVATE_KEY_PEM missing or file not found in .env. Run setup.py --generate-pem or supply your PEM path.')


# Initialize entrypoint based on network - recommended SDK pattern
def get_entrypoint():
	"""Get the appropriate entrypoint for the configured network."""
	network_lower = NETWORK.lower()
	if 'testnet' in network_lower:
		return TestnetEntrypoint()
	elif 'devnet' in network_lower:
		return DevnetEntrypoint()
	elif 'mainnet' in network_lower:
		return MainnetEntrypoint()
	else:
		# Fallback to custom proxy
		print(f"Warning: Unknown network '{NETWORK}', using custom proxy: {PROXY_URL}")
		return ProxyNetworkProvider(PROXY_URL)


# Initialize global entrypoint and account
entrypoint = get_entrypoint()
account = Account.new_from_pem(Path(PEM_PATH))

# Initialize account nonce from network - CRITICAL for proper nonce management
# This needs to be done before any transactions
account.nonce = entrypoint.recall_account_nonce(account.address)

# Use entrypoint's network provider for operations
if hasattr(entrypoint, 'create_network_provider'):
	provider = entrypoint.create_network_provider()
else:
	provider = entrypoint  # fallback if using ProxyNetworkProvider directly


# token identifiers we'll default to (testnet public tokens)
WEGLD = 'WEGLD-bd4d79'
USDC = 'USDC-c76f1f'


# xExchange token page URL (we'll scrape to find pool address)
XEX_TOKEN_URL = 'https://xexchange.com/explore/tokens/{}'




def discover_pool_address(token_a: str, token_b: str):
	"""
	Find the pool address on xExchange using the GraphQL API.
	Returns (pair_address, [candidates]) tuple.
	"""
	# Try xExchange GraphQL API first (most reliable)
	try:
		graphql_url = 'https://graph.xexchange.com/graphql'
		query = {
			"query": "{ pairs { address firstToken { identifier } secondToken { identifier } state } }"
		}
		r = requests.post(graphql_url, json=query, timeout=10)
		r.raise_for_status()
		data = r.json()
		
		pairs = data.get('data', {}).get('pairs', [])
		
		# Find exact match for token pair
		for pair in pairs:
			first = pair.get('firstToken', {}).get('identifier', '')
			second = pair.get('secondToken', {}).get('identifier', '')
			state = pair.get('state', '')
			
			# Match both directions (token_a/token_b or token_b/token_a)
			if state == 'Active':
				if (first == token_a and second == token_b) or (first == token_b and second == token_a):
					addr = pair.get('address')
					if addr:
						print(f'Found pool via GraphQL: {addr}')
						return addr, [addr]
		
		# If no exact match, collect candidates with either token
		candidates = []
		for pair in pairs:
			first = pair.get('firstToken', {}).get('identifier', '')
			second = pair.get('secondToken', {}).get('identifier', '')
			state = pair.get('state', '')
			
			if state == 'Active' and (token_a in [first, second] or token_b in [first, second]):
				addr = pair.get('address')
				if addr and addr not in candidates:
					candidates.append(addr)
		
		if candidates:
			print(f'Found {len(candidates)} candidate pools via GraphQL')
			return None, candidates
	
	except Exception as e:
		print(f'GraphQL API failed: {e}')
	
	# Fallback: return empty
	return None, []




def wait_for_tx(provider, tx_hash, timeout=180):
	"""
	Poll for transaction completion. Works with both API and Proxy providers.
	Returns dict with 'status' and 'receipt' fields.
	"""
	start = time.time()
	hex_hash = tx_hash.hex() if isinstance(tx_hash, bytes) else tx_hash
	print(f'Waiting for tx (hash: {hex_hash})...')
	
	while time.time() - start < timeout:
		try:
			# Use get_transaction() which works for both ApiNetworkProvider and ProxyNetworkProvider
			tx_on_network = provider.get_transaction(hex_hash)
			
			# Check if transaction is completed (using is_completed attribute)
			if hasattr(tx_on_network, 'is_completed') and tx_on_network.is_completed:
				is_successful = getattr(tx_on_network, 'is_successful', False)
				status = 'success' if is_successful else 'failed'
				
				if not is_successful:
					# Extract failure reason
					print(f'\n❌ Transaction FAILED!')
					
					# Try to get error message from various possible locations
					error_msg = None
					
					# Check for receipt/results with return message
					if hasattr(tx_on_network, 'contract_results'):
						for result in getattr(tx_on_network, 'contract_results', []):
							if hasattr(result, 'return_message'):
								error_msg = result.return_message
								print(f"   Return message: {error_msg}")
					
					# Check for logs/events
					if hasattr(tx_on_network, 'logs') and hasattr(tx_on_network.logs, 'events'):
						for event in tx_on_network.logs.events:
							if hasattr(event, 'identifier') and 'error' in str(event.identifier).lower():
								event_data = getattr(event, 'data', '')
								print(f"   Error event: {event.identifier} - {event_data}")
					
					# Try to access raw dictionary if available
					if hasattr(tx_on_network, 'raw'):
						raw = tx_on_network.raw
						if isinstance(raw, dict):
							# Check for smart contract results
							if 'smartContractResults' in raw:
								for scr_hash, scr in raw['smartContractResults'].items():
									if 'returnMessage' in scr and scr['returnMessage']:
										print(f"   SC Result message: {scr['returnMessage']}")
										error_msg = scr['returnMessage']
							# Check for receipt
							if 'receipt' in raw and 'value' in raw['receipt']:
								print(f"   Receipt value: {raw['receipt']['value']}")
				else:
					# Success - print events if available
					print(f'✅ Transaction SUCCESS!')
					
					# Print transaction events
					if hasattr(tx_on_network, 'logs') and hasattr(tx_on_network.logs, 'events'):
						events = tx_on_network.logs.events
						if events:
							print(f'\n📋 Transaction Events ({len(events)} total):')
							for i, event in enumerate(events[:10], 1):  # Show first 10 events
								identifier = getattr(event, 'identifier', 'unknown')
								print(f'   {i}. {identifier}')
				
				# Return immediately - transaction is completed
				return {'status': status, 'receipt': tx_on_network}
			
			# Check is_failed attribute if is_completed not available
			if hasattr(tx_on_network, 'is_failed') and tx_on_network.is_failed:
				print(f'\n❌ Transaction FAILED!')
				return {'status': 'failed', 'receipt': tx_on_network}
			
			# Only check status field if is_completed is not available or False
			if not hasattr(tx_on_network, 'is_completed') or not tx_on_network.is_completed:
				tx_status = getattr(tx_on_network, 'status', None)
				if tx_status:
					# Convert to string if it's an object
					status_str = str(tx_status).lower() if not isinstance(tx_status, str) else tx_status.lower()
					
					# If success/completed, return immediately
					if status_str in ('success', 'executed'):
						print(f'✅ Transaction SUCCESS!')
						
						# Print transaction events
						if hasattr(tx_on_network, 'logs') and hasattr(tx_on_network.logs, 'events'):
							events = tx_on_network.logs.events
							if events:
								print(f'\n📋 Transaction Events ({len(events)} total):')
								for i, event in enumerate(events[:10], 1):
									identifier = getattr(event, 'identifier', 'unknown')
									print(f'   {i}. {identifier}')
						
						return {'status': 'success', 'receipt': tx_on_network}
					elif status_str in ('fail', 'failed', 'invalid'):
						print(f'\n❌ Transaction FAILED!')
						return {'status': 'failed', 'receipt': tx_on_network}
					elif status_str == 'pending':
						# Only print pending once per cycle
						print(f'⏳ Pending...')
				else:
					print(f'⏳ Waiting...')
				
		except Exception as e:
			# Transaction might not be available immediately
			if '404' not in str(e) and 'not found' not in str(e).lower():
				print(f'⚠️  Check failed: {e}')
		
		time.sleep(2)
	
	return {'status': 'timeout', 'receipt': None}
		




def do_trade(order_json: dict, slippage=0.01):
	"""
	order_json example: {"coin": "USDC", "amount": "1000000", "side":"buy"}
	- coin: symbol for the non-EGLD token (we assume WEGLD is the other side)
	- amount: integer string in smallest units of the token you are SELLing (if side==sell) or BUYing (if side==buy)


	Returns dict with tx_hash and status
	"""
	coin = order_json['coin']
	amount = int(order_json['amount'])
	side = order_json.get('side', 'sell').lower()


	# determine token identifiers
	if coin.upper() == 'USDC':
		token = USDC
		other = WEGLD
	elif coin.upper() == 'WEGLD':
		token = WEGLD
		other = USDC
	else:
		raise ValueError('Unsupported coin. This minimal template supports WEGLD <-> USDC by default.')


	# find pair address: first check explicit POOL_ADDR, then POOL_MAP, then scrape xExchange
	if POOL_ADDR:
		pair_addr = POOL_ADDR
	else:
		pair_addr = POOL_MAP.get(f"{token}_{other}") or POOL_MAP.get(token) or POOL_MAP.get(other)
	if not pair_addr:
		print('Trying to auto-discover pool address on xExchange...')
		result = discover_pool_address(token, other)
		if isinstance(result, tuple):
			addr, candidates = result
		else:
			addr, candidates = result, []

		if addr:
			pair_addr = addr
			print('Discovered pair address:', pair_addr)
		else:
			print('Could not discover a definitive pool address automatically.')
			if candidates:
				print('Candidate pool addresses found on xExchange:')
				for c in candidates:
					print(' -', c)
			else:
				print('No candidate pool links found on xExchange for', token, '->', other)
			# return a helpful result instead of raising so the module can be run interactively
			return {'status': 'no_pool_found', 'candidates': candidates}


	# We'll call swapTokensFixedInput on pair using the SDK's transaction factory
	chain_id = (NETWORK[0].upper() if NETWORK else 'T')
	
	# Convert pair address string to SDK Address object
	if isinstance(pair_addr, str):
		if hasattr(Address, 'new_from_bech32'):
			contract_addr = Address.new_from_bech32(pair_addr)
		elif hasattr(Address, 'from_bech32'):
			contract_addr = Address.from_bech32(pair_addr)
		else:
			contract_addr = Address(pair_addr)
	else:
		contract_addr = pair_addr

	# For xExchange swaps, we need to send the input token to the contract
	# This is done via ESDTNFTTransfer (even for fungible tokens)
	if side == 'sell':
		# We're selling (swapping FROM) the specified token
		endpoint = 'swapTokensFixedInput'
		input_token = token
		input_amount = amount
		min_out = int(amount * (1 - slippage))
		
		# Build transaction data using ESDTNFTTransfer for proper token handling
		# Format: ESDTNFTTransfer@<token_hex>@<nonce_hex>@<amount_hex>@<destination_hex>@<function_hex>@<arg1_hex>@<arg2_hex>
		# For fungible tokens, nonce is always 0
		
		token_hex = input_token.encode().hex()
		nonce_hex = "00"  # Fungible tokens have nonce 0
		amount_hex = hex(input_amount)[2:]  # remove '0x' prefix
		destination_hex = contract_addr.to_hex()[2:]  # Pool address (remove 0x)
		function_hex = endpoint.encode().hex()
		# Arguments: token_out (output token identifier) and amount_out_min
		token_out_hex = other.encode().hex()
		min_out_hex = hex(min_out)[2:]
		
		# Build the full data string
		data = f"ESDTNFTTransfer@{token_hex}@{nonce_hex}@{amount_hex}@{destination_hex}@{function_hex}@{token_out_hex}@{min_out_hex}"
		
		print(f"Swap: {amount} {input_token} → min {min_out} {other}")
		print(f"Transaction data: {data}")
		
		# For ESDTNFTTransfer, sender sends to themselves, the destination is in the data
		tx = Transaction(
			sender=account.address,
			receiver=account.address,  # Send to self for ESDTNFTTransfer
			value=0,  # No native EGLD sent
			gas_limit=DEFAULT_GAS_LIMIT,
			data=data.encode(),
			chain_id=chain_id,
		)
	else:
		# Buy side - more complex, not implemented yet
		raise NotImplementedError("Buy side (swapTokensFixedOutput) not yet implemented with proper ESDT transfer")

	# Use entrypoint's recommended nonce management
	# Only fetch on-chain nonce if account.nonce is not already initialized
	if not hasattr(account, 'nonce') or account.nonce is None:
		print("Fetching account nonce from network...")
		account.nonce = entrypoint.recall_account_nonce(account.address)
	
	# Set nonce before signing (critical for signature validity)
	current_nonce = account.nonce
	tx.nonce = account.get_nonce_then_increment()
	print(f"Using nonce: {current_nonce} (account nonce incremented to {account.nonce})")

	# Sign transaction using account
	tx.signature = account.sign_transaction(tx)

	# Send transaction using entrypoint (recommended pattern)
	print(f"Sending transaction: {endpoint} on pool {pair_addr}")
	tx_hash = entrypoint.send_transaction(tx)
	
	print(f"Sent tx hash: {tx_hash}")
	print(f"Waiting for tx (hash: {tx_hash.hex()})...")

	# Wait for transaction completion using entrypoint
	result = wait_for_tx(provider, tx_hash, timeout=30)
	
	# Print transaction details for debugging
	print(f"\n{'='*60}")
	print(f"TRANSACTION SUMMARY")
	print(f"{'='*60}")
	print(f"Hash: {tx_hash.hex()}")
	print(f"Status: {result.get('status')}")
	print(f"Explorer: https://testnet-explorer.multiversx.com/transactions/{tx_hash.hex()}")
	
	if result.get('receipt'):
		receipt = result['receipt']
		
		# Try to extract and display more details
		if hasattr(receipt, 'raw') and isinstance(receipt.raw, dict):
			raw = receipt.raw
			print(f"\nDetailed Information:")
			
			# Show function name
			if 'function' in raw:
				print(f"  Function: {raw['function']}")
			
			# Show smart contract results
			if 'smartContractResults' in raw:
				print(f"\n  Smart Contract Results:")
				for scr_hash, scr in list(raw['smartContractResults'].items())[:3]:  # Show first 3
					if 'returnMessage' in scr and scr['returnMessage']:
						print(f"    ❌ Return Message: {scr['returnMessage']}")
					if 'data' in scr and scr['data']:
						print(f"    Data: {scr['data'][:100]}...")  # First 100 chars
			
			# Show logs/events
			if 'logs' in raw and 'events' in raw['logs']:
				print(f"\n  Events:")
				for event in raw['logs']['events'][:5]:  # Show first 5 events
					identifier = event.get('identifier', 'unknown')
					print(f"    - {identifier}")
					if 'topics' in event and event['topics']:
						# Decode first topic (usually the error/event type)
						try:
							from base64 import b64decode
							first_topic = b64decode(event['topics'][0]).decode('utf-8', errors='ignore')
							if first_topic:
								print(f"      Topic: {first_topic}")
						except:
							pass
	
	print(f"{'='*60}\n")
	
	return {'tx_hash': tx_hash.hex(), 'status': result.get('status'), 'receipt': result.get('receipt')}



if __name__ == '__main__':
	# Default JSON for quick testing without CLI args
	# Using WEGLD which you have available
	# Amount: 0.001 WEGLD (1000000000000000 = 10^15 wei, WEGLD has 18 decimals)
	jsond = {"coin": "WEGLD", "amount": "1000000000000000", "side": "sell"}
	print(f"Testing trade: Sell 0.001 WEGLD for USDC")
	print(do_trade(jsond))