-- Enforce that only owners or service-role can modify the 'role' column on public.profiles
CREATE OR REPLACE FUNCTION public.check_profile_role_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- If role is changing
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    -- If running in authenticated user context and not an owner
    IF auth.uid() IS NOT NULL AND NOT public.is_owner() THEN
      RAISE EXCEPTION 'Forbidden: Only owners can modify user roles.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_check_profile_role_update ON public.profiles;
CREATE TRIGGER tr_check_profile_role_update
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.check_profile_role_update();
