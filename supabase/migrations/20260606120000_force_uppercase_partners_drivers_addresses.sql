-- Migration: Force UPPERCASE for Partners, Drivers, and Addresses
-- Date: 2026-06-06

-- 1. Trigger for parceiros_parceiros
CREATE OR REPLACE FUNCTION public.trg_uppercase_partner_data()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.name IS NOT NULL THEN
    NEW.name := UPPER(TRIM(NEW.name));
  END IF;
  IF NEW.nickname IS NOT NULL THEN
    NEW.nickname := UPPER(TRIM(NEW.nickname));
  END IF;
  IF NEW.trade_name IS NOT NULL THEN
    NEW.trade_name := UPPER(TRIM(NEW.trade_name));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_force_uppercase_partner ON public.parceiros_parceiros;
CREATE TRIGGER trg_force_uppercase_partner
  BEFORE INSERT OR UPDATE ON public.parceiros_parceiros
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_uppercase_partner_data();

-- 2. Trigger for parceiros_motoristas
CREATE OR REPLACE FUNCTION public.trg_uppercase_driver_data()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.name IS NOT NULL THEN
    NEW.name := UPPER(TRIM(NEW.name));
  END IF;
  IF NEW.cnh_category IS NOT NULL THEN
    NEW.cnh_category := UPPER(TRIM(NEW.cnh_category));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_force_uppercase_driver ON public.parceiros_motoristas;
CREATE TRIGGER trg_force_uppercase_driver
  BEFORE INSERT OR UPDATE ON public.parceiros_motoristas
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_uppercase_driver_data();

-- 3. Trigger for parceiros_enderecos
CREATE OR REPLACE FUNCTION public.trg_uppercase_address_data()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.street IS NOT NULL THEN
    NEW.street := UPPER(TRIM(NEW.street));
  END IF;
  IF NEW.neighborhood IS NOT NULL THEN
    NEW.neighborhood := UPPER(TRIM(NEW.neighborhood));
  END IF;
  IF NEW.complement IS NOT NULL THEN
    NEW.complement := UPPER(TRIM(NEW.complement));
  END IF;
  IF NEW.number IS NOT NULL THEN
    NEW.number := UPPER(TRIM(NEW.number));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_force_uppercase_address ON public.parceiros_enderecos;
CREATE TRIGGER trg_force_uppercase_address
  BEFORE INSERT OR UPDATE ON public.parceiros_enderecos
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_uppercase_address_data();
