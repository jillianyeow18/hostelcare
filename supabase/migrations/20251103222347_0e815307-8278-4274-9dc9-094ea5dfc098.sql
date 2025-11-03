-- Drop existing constraints if they exist (they shouldn't based on query)
ALTER TABLE public.discussion_messages
DROP CONSTRAINT IF EXISTS discussion_messages_author_id_fkey;

ALTER TABLE public.discussion_messages
DROP CONSTRAINT IF EXISTS discussion_messages_ticket_id_fkey;

ALTER TABLE public.discussion_messages
DROP CONSTRAINT IF EXISTS discussion_messages_channel_id_fkey;

-- Add foreign key constraints for discussion_messages
ALTER TABLE public.discussion_messages
ADD CONSTRAINT discussion_messages_author_id_fkey
FOREIGN KEY (author_id)
REFERENCES public.profiles(id)
ON DELETE CASCADE;

ALTER TABLE public.discussion_messages
ADD CONSTRAINT discussion_messages_ticket_id_fkey
FOREIGN KEY (ticket_id)
REFERENCES public.tickets(id)
ON DELETE SET NULL;

ALTER TABLE public.discussion_messages
ADD CONSTRAINT discussion_messages_channel_id_fkey
FOREIGN KEY (channel_id)
REFERENCES public.discussion_channels(id)
ON DELETE CASCADE;