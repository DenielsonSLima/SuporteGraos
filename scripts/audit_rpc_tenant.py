import re
import glob
import os

files = sorted(glob.glob('supabase/migrations/*.sql'))
header_pattern = re.compile(
    r"CREATE\s+OR\s+REPLACE\s+FUNCTION\s+public\.(rpc_[a-zA-Z0-9_]+)\s*\((.*?)\)\s*RETURNS",
    re.IGNORECASE | re.DOTALL,
)

latest = {}

for file_path in files:
    text = open(file_path, encoding='utf-8').read()
    matches = list(header_pattern.finditer(text))
    for idx, match in enumerate(matches):
        name = match.group(1)
        args = ' '.join(match.group(2).split())
        start = match.start()
        end = matches[idx + 1].start() if idx + 1 < len(matches) else len(text)
        chunk = text[start:end]
        latest[name] = (os.path.basename(file_path), args, chunk)

print('rpc,file,args,has_p_company_id,has_auth_guard,has_company_helper,has_access_denied')
for name in sorted(latest):
    file_name, args, chunk = latest[name]
    lower_chunk = chunk.lower()
    has_p_company_id = 'p_company_id' in args.lower()
    has_auth_guard = ('auth.uid()' in lower_chunk) or ('auth.uid' in lower_chunk)
    has_company_helper = ('my_company_id(' in lower_chunk) or ('fn_ops_my_company_id(' in lower_chunk)
    has_access_denied = ('access denied' in lower_chunk) or ('acesso negado' in lower_chunk)
    args_safe = args.replace(',', ';')
    print(f"{name},{file_name},{args_safe},{int(has_p_company_id)},{int(has_auth_guard)},{int(has_company_helper)},{int(has_access_denied)}")
