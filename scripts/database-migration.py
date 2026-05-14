#!/usr/bin/env python3
"""
Database Migration Script for Newsletter System
Executes the supabase-schema.sql safely on the Supabase database.
"""

import os
import requests
import json
from pathlib import Path
import sys

def load_env_variables():
    """Load environment variables from .env.local"""
    env_path = Path(__file__).parent.parent / ".env.local"
    env_vars = {}
    
    try:
        with open(env_path, 'r') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, value = line.split('=', 1)
                    env_vars[key] = value
        return env_vars
    except Exception as e:
        print(f"❌ Error loading environment variables: {e}")
        return None

def check_supabase_connection(url, key):
    """Test connection to Supabase"""
    try:
        headers = {
            'apikey': key,
            'Authorization': f'Bearer {key}',
            'Content-Type': 'application/json'
        }
        
        # Test with a simple query to check connection
        response = requests.get(
            f"{url}/rest/v1/newsletter_subscribers?select=count",
            headers=headers,
            timeout=10
        )
        
        if response.status_code == 200:
            return True, "Connection successful"
        elif response.status_code == 401:
            return False, "Authentication failed - check service key"
        elif response.status_code == 404:
            return False, "Tables not found - migration needed"
        else:
            return False, f"HTTP {response.status_code}: {response.text}"
    except Exception as e:
        return False, f"Connection error: {e}"

def run_sql_migration(url, key, sql_content):
    """Execute SQL migration via Supabase REST API"""
    try:
        # For safety, we'll check if tables already exist first
        print("🔍 Checking current database state...")
        
        headers = {
            'apikey': key,
            'Authorization': f'Bearer {key}',
            'Content-Type': 'application/json'
        }
        
        # Check if newsletter_subscribers table exists
        response = requests.get(
            f"{url}/rest/v1/newsletter_subscribers?select=count",
            headers=headers,
            timeout=10
        )
        
        if response.status_code == 200:
            print("⚠️  Newsletter tables already exist!")
            print("📊 Current table status:")
            
            # Check each table
            tables = [
                'newsletter_subscribers',
                'audit_requests', 
                'platform_improvement_signals',
                'newsletter_performance',
                'weekly_reports'
            ]
            
            for table in tables:
                check_response = requests.get(
                    f"{url}/rest/v1/{table}?select=count",
                    headers=headers,
                    timeout=5
                )
                status = "✅ Exists" if check_response.status_code == 200 else "❌ Missing"
                print(f"   {table}: {status}")
            
            return True, "Tables already exist - migration not needed"
        
        elif response.status_code == 404:
            print("📝 Tables not found - migration required")
            print("⚠️  Note: SQL migration requires Supabase dashboard execution")
            print("🔗 Execute the schema in: https://app.supabase.com/project/djakaudqtrmympthjscf/sql")
            return False, "Manual migration required via dashboard"
        else:
            return False, f"Error checking database state: HTTP {response.status_code}"
            
    except Exception as e:
        return False, f"Migration error: {e}"

def verify_tables_exist(url, key):
    """Verify all required tables exist"""
    tables = [
        'newsletter_subscribers',
        'audit_requests', 
        'platform_improvement_signals',
        'newsletter_performance',
        'weekly_reports'
    ]
    
    headers = {
        'apikey': key,
        'Authorization': f'Bearer {key}',
        'Content-Type': 'application/json'
    }
    
    results = {}
    for table in tables:
        try:
            response = requests.get(
                f"{url}/rest/v1/{table}?select=count",
                headers=headers,
                timeout=5
            )
            results[table] = response.status_code == 200
        except:
            results[table] = False
    
    return results

if __name__ == "__main__":
    print("🚀 Database Migration Script")
    print("=" * 50)
    
    # Step 1: Load environment variables
    env_vars = load_env_variables()
    if not env_vars:
        sys.exit(1)
    
    supabase_url = env_vars.get('NEXT_PUBLIC_SUPABASE_URL')
    supabase_key = env_vars.get('SUPABASE_SERVICE_KEY')
    
    if not supabase_url:
        print("❌ Missing NEXT_PUBLIC_SUPABASE_URL")
        sys.exit(1)
    
    if not supabase_key:
        print("❌ Missing SUPABASE_SERVICE_KEY")
        print("📝 Run the secure setup script first to configure credentials")
        sys.exit(1)
    
    print(f"🔗 Supabase URL: {supabase_url}")
    
    # Step 2: Test connection
    print("\n🔍 Testing Supabase connection...")
    connected, message = check_supabase_connection(supabase_url, supabase_key)
    
    if not connected:
        print(f"❌ Connection failed: {message}")
        sys.exit(1)
    
    print(f"✅ {message}")
    
    # Step 3: Load SQL schema
    schema_path = Path(__file__).parent.parent / "supabase-schema.sql"
    try:
        with open(schema_path, 'r') as f:
            sql_content = f.read()
        print(f"📄 Loaded schema: {len(sql_content)} characters")
    except Exception as e:
        print(f"❌ Error loading schema: {e}")
        sys.exit(1)
    
    # Step 4: Run migration
    print("\n🚀 Running database migration...")
    success, message = run_sql_migration(supabase_url, supabase_key, sql_content)
    
    if success:
        print(f"✅ {message}")
    else:
        print(f"❌ {message}")
        if "Manual migration required" in message:
            print("\n📋 Manual Steps:")
            print("1. Copy the contents of supabase-schema.sql")
            print("2. Go to https://app.supabase.com/project/djakaudqtrmympthjscf/sql")
            print("3. Paste and execute the SQL")
            print("4. Verify tables are created")
    
    # Step 5: Verify tables
    print("\n🔍 Verifying table creation...")
    if supabase_key:  # Only if we have the key
        table_status = verify_tables_exist(supabase_url, supabase_key)
        print("📊 Table Status:")
        for table, exists in table_status.items():
            status = "✅" if exists else "❌"
            print(f"   {table}: {status}")
        
        all_exist = all(table_status.values())
        if all_exist:
            print("\n🎉 All tables created successfully!")
            print("✅ Database migration complete")
        else:
            print("\n⚠️  Some tables missing - check migration logs")
    else:
        print("⚠️  Cannot verify - service key not configured")