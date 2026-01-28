-- ============================================================================
-- FUNCTION PARA DELETAR USUÁRIO DO SUPABASE
-- ============================================================================

create or replace function delete_user_by_id(
  p_user_id uuid
)
returns jsonb
language plpgsql
security definer
as $$
begin
  -- Verificar se não é o admin principal (id do primeiro usuário)
  if p_user_id = (select id from public.app_users order by created_at limit 1) then
    return jsonb_build_object(
      'success', false,
      'error', 'Não é possível excluir o Administrador principal.'
    );
  end if;

  -- Deletar usuário
  delete from public.app_users where id = p_user_id;
  
  return jsonb_build_object('success', true);
exception
  when others then
    return jsonb_build_object('success', false, 'error', SQLERRM);
end;
$$;

grant execute on function delete_user_by_id(uuid) to authenticated;
