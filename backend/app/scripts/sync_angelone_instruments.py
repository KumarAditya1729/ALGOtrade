import json
import logging
import urllib.request
import os

# Ensure we can import app modules
import sys
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from app.utils.db_postgres import get_pg_connection_sync
from psycopg2.extras import execute_values

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

OPENAPI_URL = "https://margincalculator.angelbroking.com/OpenAPI_File/files/OpenAPIScripMaster.json"

def classify_asset_class(instr_type: str) -> str:
    instr_type = instr_type.upper()
    if instr_type in ("AMXIDX",):
        return "index"
    if instr_type in ("EQU", "SP"):
        return "equity"
    if "OPT" in instr_type:
        return "option"
    if "FUT" in instr_type:
        return "future"
    return "unknown"

def sync_instruments():
    logger.info(f"Downloading instruments from {OPENAPI_URL}...")
    with urllib.request.urlopen(OPENAPI_URL) as response:
        data = json.loads(response.read().decode())
    
    logger.info(f"Downloaded {len(data)} instruments. Parsing...")
    
    records = []
    
    # We want NSE, BSE, NFO, BFO, MCX, CDS
    target_segments = {"NSE", "BSE", "NFO", "BFO", "MCX", "CDS", "NCX"}
    
    for item in data:
        exch_seg = str(item.get("exch_seg", "")).strip().upper()
        if exch_seg not in target_segments:
            continue
        
        token = str(item.get("token", "")).strip()
        symbol = str(item.get("symbol", "")).strip()
        name = str(item.get("name", "")).strip()
        instr_type = str(item.get("instrumenttype", "")).strip()
        
        if not symbol or not token:
            continue
            
        asset_class = classify_asset_class(instr_type)
        market_type = "derivative" if asset_class in ("option", "future") else "spot"
        
        # We use exch_seg as the market name (e.g. 'NSE', 'NFO')
        market = exch_seg
        exchange = exch_seg
        
        records.append((
            market, symbol, name, exchange, market_type, token,
            "INR", asset_class, "INR", 1, 0, 0
        ))
        
    logger.info(f"Prepared {len(records)} records for DB insertion.")
    
    conn = get_pg_connection_sync()
    cur = conn.cursor()
    try:
        # Check if constraints exist, otherwise use a fallback update logic
        # Actually ON CONFLICT requires a unique constraint. Let's find out what the unique constraint is.
        # usually it's ON CONFLICT (market, symbol, exchange, market_type, instrument_id)
        # We will try it. If it fails, we rollback.
        
        insert_query = """
            INSERT INTO qd_market_symbols (
                market, symbol, name, exchange, market_type, instrument_id,
                settle_currency, asset_class, currency, is_active, is_hot, sort_order
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (market, symbol, exchange, market_type, instrument_id)
            DO UPDATE SET 
                name = EXCLUDED.name,
                asset_class = EXCLUDED.asset_class,
                is_active = EXCLUDED.is_active
        """
        
        batch_size = 10000
        for i in range(0, len(records), batch_size):
            batch = records[i:i+batch_size]
            cur.executemany(insert_query, batch)
            logger.info(f"Inserted batch {i//batch_size + 1}")
            
        conn.commit()
        logger.info("Sync complete!")
    except Exception as e:
        conn.rollback()
        logger.error(f"Failed to sync: {e}")
        raise
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    sync_instruments()
