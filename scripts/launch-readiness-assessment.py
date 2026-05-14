#!/usr/bin/env python3
"""
Newsletter System Launch Readiness Assessment
Comprehensive check of all system components for production launch.
"""

import os
import requests
import json
from pathlib import Path
import sys
from datetime import datetime

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
        return {}

def test_frontend_endpoints():
    """Test frontend pages and API endpoints"""
    base_url = "http://localhost:3000"
    results = {}
    
    # Test pages
    pages = {
        'newsletter_page': '/newsletter',
        'dashboard': '/dashboard/newsletter',
        'homepage': '/'
    }
    
    for name, path in pages.items():
        try:
            response = requests.get(f"{base_url}{path}", timeout=5)
            results[name] = {
                'status': response.status_code,
                'success': response.status_code == 200,
                'size': len(response.content)
            }
        except Exception as e:
            results[name] = {
                'status': 'error',
                'success': False,
                'error': str(e)
            }
    
    # Test API endpoints
    apis = {
        'newsletter_subscribe': {
            'method': 'POST',
            'path': '/api/newsletter/subscribe',
            'data': {'email': 'test@example.com', 'source': 'test'}
        },
        'audit_request': {
            'method': 'POST',
            'path': '/api/audit/request',
            'data': {'email': 'test@example.com', 'company_name': 'Test Co', 'business_type': 'test', 'source': 'test'}
        },
        'dashboard_data': {
            'method': 'GET',
            'path': '/api/newsletter/dashboard'
        }
    }
    
    for name, config in apis.items():
        try:
            if config['method'] == 'POST':
                response = requests.post(
                    f"{base_url}{config['path']}",
                    json=config['data'],
                    timeout=10
                )
            else:
                response = requests.get(f"{base_url}{config['path']}", timeout=10)
            
            results[name] = {
                'status': response.status_code,
                'success': response.status_code == 200,
                'response_size': len(response.content)
            }
            
            if response.status_code == 200:
                try:
                    json_data = response.json()
                    results[name]['has_json'] = True
                    results[name]['json_keys'] = list(json_data.keys()) if isinstance(json_data, dict) else None
                except:
                    results[name]['has_json'] = False
            
        except Exception as e:
            results[name] = {
                'status': 'error',
                'success': False,
                'error': str(e)
            }
    
    return results

def test_beehiiv_integration(env_vars):
    """Test Beehiiv API integration"""
    api_key = env_vars.get('BEEHIIV_API_KEY')
    publication_id = env_vars.get('BEEHIIV_PUBLICATION_ID')
    
    if not api_key or not publication_id:
        return {'status': 'missing_credentials', 'success': False}
    
    try:
        headers = {
            'Authorization': f'Bearer {api_key}',
            'Content-Type': 'application/json'
        }
        
        # Test publication access
        response = requests.get(
            f'https://api.beehiiv.com/v2/publications/{publication_id}',
            headers=headers,
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            return {
                'status': response.status_code,
                'success': True,
                'publication_name': data.get('data', {}).get('name', 'Unknown'),
                'subscriber_count': data.get('data', {}).get('subscriber_count', 0)
            }
        else:
            return {
                'status': response.status_code,
                'success': False,
                'error': response.text[:200]
            }
    except Exception as e:
        return {
            'status': 'error',
            'success': False,
            'error': str(e)
        }

def test_n8n_webhooks():
    """Test n8n webhook endpoints"""
    webhooks = {
        'newsletter_signup': 'https://n8n.ottoserv.com/webhook/newsletter-signup',
        'audit_request': 'https://n8n.ottoserv.com/webhook/audit-request',
        'platform_signal': 'https://n8n.ottoserv.com/webhook/platform-signal'
    }
    
    results = {}
    
    for name, url in webhooks.items():
        try:
            test_data = {
                'test': True,
                'source': 'launch_readiness_test',
                'timestamp': datetime.utcnow().isoformat()
            }
            
            response = requests.post(
                url,
                json=test_data,
                timeout=10
            )
            
            results[name] = {
                'status': response.status_code,
                'success': response.status_code in [200, 201, 202],
                'response_size': len(response.content)
            }
        except Exception as e:
            results[name] = {
                'status': 'error',
                'success': False,
                'error': str(e)
            }
    
    return results

def check_environment_config(env_vars):
    """Check environment variable configuration"""
    required_vars = {
        'BEEHIIV_API_KEY': 'Beehiiv integration',
        'BEEHIIV_PUBLICATION_ID': 'Beehiiv publication',
        'NEXT_PUBLIC_SUPABASE_URL': 'Supabase database URL',
        'N8N_NEWSLETTER_WEBHOOK_URL': 'Newsletter notifications',
        'N8N_AUDIT_WEBHOOK_URL': 'Audit request notifications',
        'N8N_PLATFORM_SIGNAL_WEBHOOK_URL': 'Platform improvement signals'
    }
    
    optional_vars = {
        'SUPABASE_SERVICE_KEY': 'Database operations (REQUIRED FOR PRODUCTION)',
        'ELEVENLABS_API_KEY': 'Voice features',
        'JONATHAN_PASSWORD': 'Admin authentication',
        'BRANDON_PASSWORD': 'Admin authentication'
    }
    
    results = {
        'required': {},
        'optional': {},
        'missing_required': [],
        'missing_optional': []
    }
    
    for var, description in required_vars.items():
        value = env_vars.get(var)
        results['required'][var] = {
            'configured': bool(value and value.strip()),
            'description': description,
            'value_length': len(value) if value else 0
        }
        if not value or not value.strip():
            results['missing_required'].append(var)
    
    for var, description in optional_vars.items():
        value = env_vars.get(var)
        results['optional'][var] = {
            'configured': bool(value and value.strip()),
            'description': description,
            'value_length': len(value) if value else 0
        }
        if not value or not value.strip():
            results['missing_optional'].append(var)
    
    return results

def check_database_schema():
    """Check if database schema exists"""
    schema_path = Path(__file__).parent.parent / "supabase-schema.sql"
    
    if not schema_path.exists():
        return {'exists': False, 'error': 'Schema file not found'}
    
    try:
        with open(schema_path, 'r') as f:
            content = f.read()
        
        # Check for key tables
        required_tables = [
            'newsletter_subscribers',
            'audit_requests',
            'platform_improvement_signals',
            'newsletter_performance',
            'weekly_reports'
        ]
        
        table_checks = {}
        for table in required_tables:
            table_checks[table] = f'CREATE TABLE {table}' in content
        
        return {
            'exists': True,
            'size': len(content),
            'tables': table_checks,
            'all_tables_defined': all(table_checks.values())
        }
    except Exception as e:
        return {'exists': False, 'error': str(e)}

def generate_security_checklist():
    """Generate security checklist for production"""
    return {
        'environment_variables': [
            'SUPABASE_SERVICE_KEY must be set in production',
            'Never commit service keys to version control',
            'Use Vercel environment variables for production secrets',
            'Rotate API keys regularly'
        ],
        'database_security': [
            'Row Level Security (RLS) policies enabled',
            'Service role key has appropriate permissions',
            'Backup strategy in place',
            'Monitor for unusual access patterns'
        ],
        'api_security': [
            'Rate limiting enabled on API endpoints',
            'Input validation on all form submissions',
            'CORS configured appropriately',
            'Error messages don\'t expose sensitive information'
        ],
        'webhook_security': [
            'N8N webhooks use HTTPS',
            'Webhook payloads validated',
            'Failed webhook attempts logged',
            'Webhook endpoints not publicly discoverable'
        ]
    }

def main():
    print("🚀 Newsletter System Launch Readiness Assessment")
    print("=" * 60)
    print(f"Assessment Time: {datetime.utcnow().isoformat()}Z")
    print()
    
    # Load environment variables
    print("📋 Loading configuration...")
    env_vars = load_env_variables()
    
    if not env_vars:
        print("❌ Failed to load environment variables")
        return False
    
    print(f"✅ Loaded {len(env_vars)} environment variables")
    print()
    
    # Check environment configuration
    print("🔧 Checking environment configuration...")
    env_config = check_environment_config(env_vars)
    
    print("Required variables:")
    for var, config in env_config['required'].items():
        status = "✅" if config['configured'] else "❌"
        print(f"   {status} {var}: {config['description']}")
    
    print("\\nOptional variables:")
    for var, config in env_config['optional'].items():
        status = "✅" if config['configured'] else "⚠️"
        print(f"   {status} {var}: {config['description']}")
    
    if env_config['missing_required']:
        print(f"\\n❌ Missing required variables: {', '.join(env_config['missing_required'])}")
    else:
        print("\\n✅ All required environment variables configured")
    print()
    
    # Test frontend functionality
    print("🌐 Testing frontend endpoints...")
    frontend_results = test_frontend_endpoints()
    
    for endpoint, result in frontend_results.items():
        status = "✅" if result['success'] else "❌"
        print(f"   {status} {endpoint}: HTTP {result.get('status', 'error')}")
    
    frontend_success = all(r['success'] for r in frontend_results.values())
    print(f"\\n{'✅' if frontend_success else '❌'} Frontend: {'All endpoints working' if frontend_success else 'Some endpoints failing'}")
    print()
    
    # Test Beehiiv integration
    print("📬 Testing Beehiiv integration...")
    beehiiv_result = test_beehiiv_integration(env_vars)
    
    if beehiiv_result['success']:
        print(f"   ✅ Connected to: {beehiiv_result.get('publication_name', 'Unknown')}")
        print(f"   📊 Current subscribers: {beehiiv_result.get('subscriber_count', 'Unknown')}")
    else:
        print(f"   ❌ Connection failed: {beehiiv_result.get('error', 'Unknown error')}")
    print()
    
    # Test n8n webhooks
    print("🔗 Testing n8n webhooks...")
    webhook_results = test_n8n_webhooks()
    
    for webhook, result in webhook_results.items():
        status = "✅" if result['success'] else "❌"
        print(f"   {status} {webhook}: HTTP {result.get('status', 'error')}")
    
    webhook_success = all(r['success'] for r in webhook_results.values())
    print(f"\\n{'✅' if webhook_success else '❌'} Webhooks: {'All endpoints responding' if webhook_success else 'Some endpoints failing'}")
    print()
    
    # Check database schema
    print("🗄️ Checking database schema...")
    schema_result = check_database_schema()
    
    if schema_result['exists']:
        print(f"   ✅ Schema file found ({schema_result['size']} bytes)")
        if schema_result['all_tables_defined']:
            print("   ✅ All required tables defined")
        else:
            missing_tables = [t for t, exists in schema_result['tables'].items() if not exists]
            print(f"   ❌ Missing tables: {', '.join(missing_tables)}")
    else:
        print(f"   ❌ Schema check failed: {schema_result.get('error', 'Unknown error')}")
    print()
    
    # Security checklist
    print("🔐 Security Checklist:")
    security_items = generate_security_checklist()
    
    for category, items in security_items.items():
        print(f"   {category.replace('_', ' ').title()}:")
        for item in items:
            print(f"     • {item}")
    print()
    
    # Overall assessment
    print("📊 LAUNCH READINESS SUMMARY")
    print("=" * 40)
    
    # Calculate readiness score
    checks = {
        'Environment Config': len(env_config['missing_required']) == 0,
        'Frontend Functionality': frontend_success,
        'Beehiiv Integration': beehiiv_result['success'],
        'N8N Webhooks': webhook_success,
        'Database Schema': schema_result.get('all_tables_defined', False)
    }
    
    passed_checks = sum(checks.values())
    total_checks = len(checks)
    readiness_score = (passed_checks / total_checks) * 100
    
    for check, passed in checks.items():
        status = "✅" if passed else "❌"
        print(f"   {status} {check}")
    
    print(f"\\n🎯 Readiness Score: {readiness_score:.1f}% ({passed_checks}/{total_checks})")
    
    # Launch recommendations
    print("\\n📋 LAUNCH RECOMMENDATIONS:")
    
    if readiness_score >= 90:
        print("   🟢 READY FOR LAUNCH!")
        print("   • All core systems operational")
        print("   • Complete security setup in production")
        print("   • Monitor initial subscriber flow")
    elif readiness_score >= 70:
        print("   🟡 ALMOST READY - Minor fixes needed")
        print("   • Address failing checks above")
        print("   • Complete environment configuration")
        print("   • Test end-to-end flow")
    else:
        print("   🔴 NOT READY - Major issues to resolve")
        print("   • Fix all failing system checks")
        print("   • Complete missing integrations")
        print("   • Review security configuration")
    
    # Critical missing items
    if 'SUPABASE_SERVICE_KEY' in env_config['missing_optional']:
        print("\\n⚠️  CRITICAL: Supabase service key not configured!")
        print("   • Database operations will fail in production")
        print("   • Complete setup before launch")
    
    print(f"\\n🏁 Assessment complete at {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')} UTC")
    
    return readiness_score >= 70

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)