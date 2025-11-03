-- Create role enum type
CREATE TYPE public.app_role AS ENUM ('admin', 'staff', 'student');

-- Create user_roles table for secure role management
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Update handle_new_user function to insert into user_roles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  user_role TEXT;
BEGIN
  user_role := COALESCE(new.raw_user_meta_data->>'role', 'student');
  
  -- Insert into profiles
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', ''),
    user_role
  );
  
  -- Insert into user_roles with proper enum casting
  INSERT INTO public.user_roles (user_id, role)
  VALUES (new.id, user_role::app_role);
  
  RETURN new;
END;
$$;

-- RLS Policies for user_roles table
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Admins can view all roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Update tickets RLS policies to use has_role function
DROP POLICY IF EXISTS "Staff can view all tickets" ON public.tickets;
DROP POLICY IF EXISTS "Staff can update tickets" ON public.tickets;

CREATE POLICY "Staff can view all tickets"
ON public.tickets
FOR SELECT
TO authenticated
USING (
  created_by = auth.uid() 
  OR public.has_role(auth.uid(), 'staff')
  OR public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Staff can update tickets"
ON public.tickets
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'staff')
  OR public.has_role(auth.uid(), 'admin')
);

-- Update profiles RLS policies
DROP POLICY IF EXISTS "Staff can view all profiles" ON public.profiles;

CREATE POLICY "Staff can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  auth.uid() = id
  OR public.has_role(auth.uid(), 'staff')
  OR public.has_role(auth.uid(), 'admin')
);

-- Update comments RLS policies
DROP POLICY IF EXISTS "Staff can create comments" ON public.comments;
DROP POLICY IF EXISTS "Users can view comments on their tickets" ON public.comments;

CREATE POLICY "Staff can create comments"
ON public.comments
FOR INSERT
TO authenticated
WITH CHECK (
  author_id = auth.uid()
  AND (public.has_role(auth.uid(), 'staff') OR public.has_role(auth.uid(), 'admin'))
);

CREATE POLICY "Users can view comments on their tickets"
ON public.comments
FOR SELECT
TO authenticated
USING (
  (
    EXISTS (
      SELECT 1 FROM tickets
      WHERE tickets.id = comments.ticket_id
      AND tickets.created_by = auth.uid()
    )
    OR public.has_role(auth.uid(), 'staff')
    OR public.has_role(auth.uid(), 'admin')
  )
  AND (
    NOT is_internal
    OR public.has_role(auth.uid(), 'staff')
    OR public.has_role(auth.uid(), 'admin')
  )
);

-- Update attachments RLS policies
DROP POLICY IF EXISTS "Users can view attachments for their tickets" ON public.attachments;

CREATE POLICY "Users can view attachments for their tickets"
ON public.attachments
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM tickets
    WHERE tickets.id = attachments.ticket_id
    AND (
      tickets.created_by = auth.uid()
      OR public.has_role(auth.uid(), 'staff')
      OR public.has_role(auth.uid(), 'admin')
    )
  )
);