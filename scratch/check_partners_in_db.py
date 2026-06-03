import requests
import json

url = "https://vqhjbsiwzgxaozcedqcn.supabase.co/rest/v1"
headers = {
    "apikey": "sb_publishable_m8MBqafWFUIhbSmhatvDYw_NWrO_E8V",
    "Authorization": "Bearer sb_publishable_m8MBqafWFUIhbSmhatvDYw_NWrO_E8V"
}

# Fetch all partners in the database
res = requests.get(f"{url}/parceiros_parceiros?select=id,name,document", headers=headers)
if res.status_code == 200:
    partners = res.json()
    print(f"Total partners in database: {len(partners)}")
    
    # Required crossover partners
    required_clients = [
        "Ana Maria Laroche", "Diego Atacadao Racao", "Frei Damião", 
        "Granja Cajueiro", "Pedro Falcão", "Sabormill", "Santa Cruz - RN", "São Braz Bahia"
    ]
    
    required_producers = [
        "Cardoso Aquidabã", "Elizabete", "Francisco Benjamin", 
        "Gabriel Balsas/Irineu", "Irineu/Suporte", "Izau PDF", 
        "Mateus Pereira", "Ramon", "Rodrigo Orlando"
    ]
    
    required_consultants = ["Ronaldo Silva"]
    
    import unicodedata
    def clean_string(s):
        if not s:
            return ""
        s = unicodedata.normalize('NFKD', s).encode('ASCII', 'ignore').decode('ASCII')
        return s.strip().lower().replace("  ", " ")
        
    db_names = {clean_string(p['name']): p for p in partners}
    
    print("\n--- CLIENTS STATUS ---")
    for name in required_clients:
        clean = clean_string(name)
        # Try substring match too
        match = None
        for db_c, p in db_names.items():
            if clean in db_c or db_c in clean:
                match = p
                break
        if match:
            print(f"✅ Client '{name}' matches DB '{match['name']}' (ID: {match['id']})")
        else:
            print(f"❌ Client '{name}' NOT FOUND")
            
    print("\n--- PRODUCERS STATUS ---")
    for name in required_producers:
        clean = clean_string(name)
        match = None
        for db_c, p in db_names.items():
            if clean in db_c or db_c in clean:
                match = p
                break
        if match:
            print(f"✅ Producer '{name}' matches DB '{match['name']}' (ID: {match['id']})")
        else:
            print(f"❌ Producer '{name}' NOT FOUND")
            
    # Also check app_users for consultant
    print("\n--- CONSULTANTS STATUS ---")
    res_users = requests.get(f"{url}/app_users?select=id,name,role", headers=headers)
    if res_users.status_code == 200:
        users = res_users.json()
        db_users = {clean_string(u['name']): u for u in users}
        for name in required_consultants:
            clean = clean_string(name)
            match = None
            for db_c, u in db_users.items():
                if clean in db_c or db_c in clean:
                    match = u
                    break
            if match:
                print(f"✅ Consultant '{name}' matches DB User '{match['name']}' (ID: {match['id']})")
            else:
                # Also check in partners
                match_p = None
                for db_c, p in db_names.items():
                    if clean in db_c or db_c in clean:
                        match_p = p
                        break
                if match_p:
                    print(f"✅ Consultant '{name}' matches DB Partner '{match_p['name']}' (ID: {match_p['id']})")
                else:
                    print(f"❌ Consultant '{name}' NOT FOUND")
else:
    print("Error:", res.status_code, res.text)
