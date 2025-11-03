-- Add type column to discussion_messages for user vs system messages
ALTER TABLE public.discussion_messages
ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'user' CHECK (type IN ('user', 'system'));

-- Create function to post system message to channel
CREATE OR REPLACE FUNCTION public.post_system_message_to_channel(
  p_category TEXT,
  p_content TEXT,
  p_ticket_id UUID DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
      '00000000-0000-0000-0000-000000000000', -- System user ID
      p_content,
      'system',
      p_ticket_id
    );
  END IF;
END;
$$;

-- Trigger function for new tickets
CREATE OR REPLACE FUNCTION public.notify_ticket_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_creator_name TEXT;
  v_message TEXT;
BEGIN
  -- Get creator name
  SELECT full_name INTO v_creator_name
  FROM profiles
  WHERE id = NEW.created_by;

  -- Format system message
  v_message := format(
    E'🎫 %s **created** a Maintenance Ticket\n\n**HC-%s** %s\n\nStatus: %s | Assignee: %s | Priority: %s',
    COALESCE(v_creator_name, 'Someone'),
    substring(NEW.id::text, 1, 8),
    NEW.title,
    NEW.status,
    COALESCE((SELECT full_name FROM profiles WHERE id = NEW.assigned_to), 'Unassigned'),
    NEW.urgency
  );

  -- Post to channel
  PERFORM post_system_message_to_channel(NEW.category, v_message, NEW.id);

  RETURN NEW;
END;
$$;

-- Trigger function for ticket updates
CREATE OR REPLACE FUNCTION public.notify_ticket_updated()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_updater_name TEXT;
  v_message TEXT;
  v_assignee_name TEXT;
BEGIN
  -- Get updater name
  SELECT full_name INTO v_updater_name
  FROM profiles
  WHERE id = auth.uid();

  -- Get assignee name
  SELECT full_name INTO v_assignee_name
  FROM profiles
  WHERE id = NEW.assigned_to;

  -- Check for status change
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    v_message := format(
      E'🔄 %s **transitioned** a Maintenance Ticket from **%s** to **%s**\n\n**HC-%s** %s\n\nStatus: %s | Assignee: %s | Priority: %s',
      COALESCE(v_updater_name, 'Someone'),
      OLD.status,
      NEW.status,
      substring(NEW.id::text, 1, 8),
      NEW.title,
      NEW.status,
      COALESCE(v_assignee_name, 'Unassigned'),
      NEW.urgency
    );
    PERFORM post_system_message_to_channel(NEW.category, v_message, NEW.id);
  END IF;

  -- Check for assignment change
  IF OLD.assigned_to IS DISTINCT FROM NEW.assigned_to THEN
    v_message := format(
      E'👤 Ticket **HC-%s** %s assigned to **%s**',
      substring(NEW.id::text, 1, 8),
      NEW.title,
      COALESCE(v_assignee_name, 'Unassigned')
    );
    PERFORM post_system_message_to_channel(NEW.category, v_message, NEW.id);
  END IF;

  -- Check for urgency escalation
  IF OLD.urgency != NEW.urgency AND NEW.urgency = 'high' THEN
    v_message := format(
      E'🚨 **Ticket requires attention**: %s – Critical Escalation\n\n**HC-%s**\n\nPlease assign a handler soon to prevent delays.',
      NEW.title,
      substring(NEW.id::text, 1, 8)
    );
    PERFORM post_system_message_to_channel(NEW.category, v_message, NEW.id);
  END IF;

  RETURN NEW;
END;
$$;

-- Create triggers
DROP TRIGGER IF EXISTS trigger_notify_ticket_created ON public.tickets;
CREATE TRIGGER trigger_notify_ticket_created
AFTER INSERT ON public.tickets
FOR EACH ROW
EXECUTE FUNCTION public.notify_ticket_created();

DROP TRIGGER IF EXISTS trigger_notify_ticket_updated ON public.tickets;
CREATE TRIGGER trigger_notify_ticket_updated
AFTER UPDATE ON public.tickets
FOR EACH ROW
EXECUTE FUNCTION public.notify_ticket_updated();