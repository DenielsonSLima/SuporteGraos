-- Cleanup orphaned freight financial entries
-- Targets entries that are either zero-amount or have no corresponding loading record

DELETE FROM public.financial_entries 
WHERE type = 'payable' 
  AND origin_type = 'freight' 
  AND (
    total_amount = 0 
    OR origin_id NOT IN (SELECT id FROM public.ops_loadings)
  );
