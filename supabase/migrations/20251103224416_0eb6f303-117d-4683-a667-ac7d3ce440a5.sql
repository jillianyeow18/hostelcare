-- Make author_id nullable for system messages
ALTER TABLE public.discussion_messages 
ALTER COLUMN author_id DROP NOT NULL;

-- Drop and recreate the foreign key to allow null
ALTER TABLE public.discussion_messages 
DROP CONSTRAINT IF EXISTS discussion_messages_author_id_fkey;

ALTER TABLE public.discussion_messages 
ADD CONSTRAINT discussion_messages_author_id_fkey 
FOREIGN KEY (author_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Update the post_system_message_to_channel function to use NULL for system messages
CREATE OR REPLACE FUNCTION public.post_system_message_to_channel(
  p_category text,
  p_content text,
  p_ticket_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_channel_id UUID;
BEGIN
  -- Get channel ID for the category
  SELECT id INTO v_channel_id
  FROM discussion_channels
  WHERE category = p_category
  LIMIT 1;

  -- Insert system message if channel exists
  IF v_channel_id IS NOT NULL THEN
    INSERT INTO discussion_messages (channel_id, author_id, content, type, ticket_id)
    VALUES (
      v_channel_id,
      NULL, -- System messages have no author
      p_content,
      'system',
      p_ticket_id
    );
  END IF;
END;
$$;

-- Update RLS policy to allow system message inserts
DROP POLICY IF EXISTS "Staff can create messages in their category channels" ON public.discussion_messages;

CREATE POLICY "Staff can create messages in their category channels"
ON public.discussion_messages
FOR INSERT
WITH CHECK (
  -- Allow system messages (author_id IS NULL)
  (author_id IS NULL AND type = 'system')
  OR
  -- Allow staff to post in their category channels
  (
    author_id = auth.uid() 
    AND EXISTS (
      SELECT 1
      FROM discussion_channels dc
      JOIN profiles p ON p.staff_category = dc.category
      WHERE dc.id = discussion_messages.channel_id
        AND p.id = auth.uid()
        AND (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
    )
  )
);