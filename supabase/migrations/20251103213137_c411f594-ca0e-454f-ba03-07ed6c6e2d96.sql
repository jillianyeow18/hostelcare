-- Add category field to profiles for staff
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS staff_category TEXT;

-- Create discussion channels table (one channel per category)
CREATE TABLE IF NOT EXISTS public.discussion_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create discussion messages table
CREATE TABLE IF NOT EXISTS public.discussion_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID NOT NULL REFERENCES public.discussion_channels(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  ticket_id UUID REFERENCES public.tickets(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.discussion_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discussion_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for discussion_channels
CREATE POLICY "Staff can view all channels"
ON public.discussion_channels
FOR SELECT
USING (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for discussion_messages
CREATE POLICY "Staff can view messages in their category channels"
ON public.discussion_messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.discussion_channels dc
    JOIN public.profiles p ON p.staff_category = dc.category
    WHERE dc.id = discussion_messages.channel_id
    AND p.id = auth.uid()
    AND (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
  )
);

CREATE POLICY "Staff can create messages in their category channels"
ON public.discussion_messages
FOR INSERT
WITH CHECK (
  author_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM public.discussion_channels dc
    JOIN public.profiles p ON p.staff_category = dc.category
    WHERE dc.id = discussion_messages.channel_id
    AND p.id = auth.uid()
    AND (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
  )
);

-- Create trigger for discussion_messages updated_at
CREATE TRIGGER update_discussion_messages_updated_at
BEFORE UPDATE ON public.discussion_messages
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default channels for each category
INSERT INTO public.discussion_channels (name, category, description) VALUES
  ('Plumbing Team', 'plumbing', 'Discussion channel for plumbing-related tickets'),
  ('Electrical Team', 'electrical', 'Discussion channel for electrical-related tickets'),
  ('Furniture Team', 'furniture', 'Discussion channel for furniture-related tickets'),
  ('Cleaning Team', 'cleaning', 'Discussion channel for cleaning-related tickets'),
  ('Security Team', 'security', 'Discussion channel for security-related tickets'),
  ('Other Issues', 'other', 'Discussion channel for other tickets')
ON CONFLICT (category) DO NOTHING;

-- Enable realtime for discussion_messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.discussion_messages;