-- Remove discussion channels and all related functionality
-- This migration is safe to run even if the tables don't exist

-- Drop triggers first (only if tables exist)
DO $$ 
BEGIN
    DROP TRIGGER IF EXISTS ticket_status_discussion_trigger ON public.tickets;
EXCEPTION
    WHEN undefined_table THEN NULL;
END $$;

-- Drop the trigger function
DROP FUNCTION IF EXISTS public.notify_ticket_status_change CASCADE;

-- Drop the system message function
DROP FUNCTION IF EXISTS public.post_system_message_to_channel CASCADE;

-- Drop tables (this will cascade to foreign key constraints, triggers, and policies)
DROP TABLE IF EXISTS public.discussion_messages CASCADE;
DROP TABLE IF EXISTS public.discussion_channels CASCADE;
