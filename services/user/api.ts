import { supabaseUrl, supabaseAnonKey, getSupabaseSession } from '../supabase';

export async function invokeEdgeFunction(
  action: string,
  payload: Record<string, unknown>,
  isPublic = false,
): Promise<{ data: any; error: string | null }> {
  let headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'apikey': supabaseAnonKey,
  };

  if (!isPublic) {
    const session = await getSupabaseSession();
    if (!session?.access_token) {
      return { data: null, error: 'Sessão expirada. Faça login novamente.' };
    }
    headers['Authorization'] = `Bearer ${session.access_token}`;
  }

  let res: Response;
  try {
    res = await fetch(`${supabaseUrl}/functions/v1/manage-users`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ action, ...payload }),
    });
  } catch (networkErr: any) {
    return { data: null, error: `Erro de rede: ${networkErr.message}` };
  }

  let json: any;
  try {
    json = await res.json();
  } catch {
    return { data: null, error: `Resposta inválida do servidor (status ${res.status})` };
  }

  if (!res.ok || !json.success) {
    return { data: null, error: json.error ?? `Erro ${res.status}` };
  }

  return { data: json, error: null };
}
