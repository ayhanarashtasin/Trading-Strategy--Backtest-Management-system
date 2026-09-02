--
-- Fix mutable search_path on all SECURITY DEFINER functions
--
ALTER FUNCTION public.get_auth_user_role() SET search_path = public;
ALTER FUNCTION public.is_owner() SET search_path = public;
ALTER FUNCTION public.is_editor_or_owner() SET search_path = public;
ALTER FUNCTION public.handle_new_user() SET search_path = public;
ALTER FUNCTION public.check_profile_role_update() SET search_path = public;