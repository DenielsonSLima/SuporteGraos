import json
import unicodedata

# Load required crossover partners
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

# Read partners list from output file
with open("/Users/denielson/.gemini/antigravity-ide/brain/b4ea7f16-071b-4785-b564-ddb8ec4f1921/.system_generated/steps/81/output.txt") as f:
    raw_data = json.load(f)
    partners = json.loads(raw_data['result'].split("<untrusted-data-023b504d-97fa-4fea-ade7-612f06dede38>\n")[1].split("\n</untrusted-data-023b504d-97fa-4fea-ade7-612f06dede38>")[0])

def clean_string(s):
    if not s:
        return ""
    s = unicodedata.normalize('NFKD', s).encode('ASCII', 'ignore').decode('ASCII')
    return s.strip().lower().replace("  ", " ")

db_names = {clean_string(p['name']): p for p in partners}

print("=== CLIENTS ===")
missing_clients = []
for name in required_clients:
    clean = clean_string(name)
    match = None
    for db_c, p in db_names.items():
        if clean in db_c or db_c in clean:
            match = p
            break
    if match:
        print(f"✅ Client '{name}' matches DB '{match['name']}' (ID: {match['id']})")
    else:
        print(f"❌ Client '{name}' NOT FOUND")
        missing_clients.append(name)

print("\n=== PRODUCERS ===")
missing_producers = []
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
        missing_producers.append(name)

print("\n=== CONSULTANTS ===")
missing_consultants = []
for name in required_consultants:
    clean = clean_string(name)
    match = None
    for db_c, p in db_names.items():
        if clean in db_c or db_c in clean:
            match = p
            break
    if match:
        print(f"✅ Consultant '{name}' matches DB '{match['name']}' (ID: {match['id']})")
    else:
        print(f"❌ Consultant '{name}' NOT FOUND")
        missing_consultants.append(name)

print("\nSUMMARY OF MISSING PARTNERS:")
print("Clients:", missing_clients)
print("Producers:", missing_producers)
print("Consultants:", missing_consultants)
