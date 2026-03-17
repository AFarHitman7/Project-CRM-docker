-- migration.sql
-- Create notifications table for tracking annual renewals and other alerts

CREATE TABLE IF NOT EXISTS public.notifications (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    business_id uuid NOT NULL REFERENCES public.business_clients(id) ON DELETE CASCADE,
    type text NOT NULL, -- e.g., 'ANNUAL_RENEWAL'
    message text NOT NULL,
    due_date date,
    status text DEFAULT 'pending' NOT NULL CHECK (status IN ('pending', 'completed')),
    viewed boolean DEFAULT false NOT NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_business
  ON public.notifications(business_id);

CREATE OR REPLACE TRIGGER trg_notifications_updated_at
BEFORE UPDATE ON public.notifications
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

