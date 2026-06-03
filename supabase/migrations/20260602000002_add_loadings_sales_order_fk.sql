-- Migration: Add loadings sales_order foreign key constraint
-- Target schema: public

ALTER TABLE public.ops_loadings 
DROP CONSTRAINT IF EXISTS fk_ops_loadings_sales_order;

ALTER TABLE public.ops_loadings 
ADD CONSTRAINT fk_ops_loadings_sales_order
FOREIGN KEY (sales_order_id) 
REFERENCES public.ops_sales_orders(id)
ON DELETE SET NULL;
