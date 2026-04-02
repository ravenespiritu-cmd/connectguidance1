-- Add receptionist role value (separate migration so the enum commit is visible to follow-up DDL).

alter type public.app_role add value if not exists 'receptionist';
