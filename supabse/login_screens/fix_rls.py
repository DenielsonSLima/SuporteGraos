#!/usr/bin/env python3
"""
Script para corrigir RLS Error 42501 no Supabase
Executa a query SQL de correção automaticamente
"""

import requests
import json

# Credenciais Supabase
SUPABASE_URL = "https://vqhjbsiwzgxaozcedqcn.supabase.co"
SUPABASE_ANON_KEY = "sb_publishable_m8MBqafWFUIhbSmhatvDYw_NWrO_E8V"

# SQL para corrigir RLS
SQL_FIX = """
DROP POLICY IF EXISTS "LoginScreens select" ON public.login_screens;
DROP POLICY IF EXISTS "LoginScreens insert" ON public.login_screens;
DROP POLICY IF EXISTS "LoginScreens update" ON public.login_screens;
DROP POLICY IF EXISTS "LoginScreens delete" ON public.login_screens;

DROP POLICY IF EXISTS "RotationConfig select" ON public.login_rotation_config;
DROP POLICY IF EXISTS "RotationConfig insert" ON public.login_rotation_config;
DROP POLICY IF EXISTS "RotationConfig update" ON public.login_rotation_config;
DROP POLICY IF EXISTS "RotationConfig delete" ON public.login_rotation_config;

CREATE POLICY "LoginScreens select" ON public.login_screens
FOR SELECT USING (true);

CREATE POLICY "LoginScreens insert" ON public.login_screens
FOR INSERT WITH CHECK (true);

CREATE POLICY "LoginScreens update" ON public.login_screens
FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "LoginScreens delete" ON public.login_screens
FOR DELETE USING (created_by = auth.uid() OR created_by IS NULL);

CREATE POLICY "RotationConfig select" ON public.login_rotation_config
FOR SELECT USING (true);

CREATE POLICY "RotationConfig insert" ON public.login_rotation_config
FOR INSERT WITH CHECK (true);

CREATE POLICY "RotationConfig update" ON public.login_rotation_config
FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "RotationConfig delete" ON public.login_rotation_config
FOR DELETE USING (true);
"""

def fix_rls():
    """Executa o SQL de correção no Supabase"""
    
    print("🔧 Corrigindo RLS Error 42501...")
    print("=" * 60)
    
    headers = {
        "Authorization": f"Bearer {SUPABASE_ANON_KEY}",
        "Content-Type": "application/json",
        "apikey": SUPABASE_ANON_KEY,
    }
    
    # Endpoint para executar SQL
    url = f"{SUPABASE_URL}/rest/v1/rpc/sql_query"
    
    payload = {
        "query": SQL_FIX
    }
    
    try:
        response = requests.post(url, headers=headers, json=payload)
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code == 200:
            print("\n✅ RLS corrigida com sucesso!")
            return True
        else:
            print(f"\n❌ Erro ao corrigir: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Erro na requisição: {e}")
        return False

if __name__ == "__main__":
    fix_rls()
