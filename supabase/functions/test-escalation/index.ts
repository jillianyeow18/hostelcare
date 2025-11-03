import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Ticket {
  id: string;
  title: string;
  description: string;
  status: string;
  urgency: string;
  category: string;
  location: string;
  created_at: string;
  created_by: string;
  assigned_to: string | null;
}

interface Profile {
  id: string;
  email: string;
  full_name: string;
  staff_category: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting test escalation check for tickets unresolved > 2 minutes');

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const resend = new Resend(Deno.env.get('RESEND_API') as string);

    // Calculate time threshold (2 minutes ago)
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
    
    console.log(`Checking for tickets created before: ${twoMinutesAgo}`);

    // Fetch tickets that are pending or in-progress for more than 2 minutes
    const { data: tickets, error: ticketsError } = await supabaseClient
      .from('tickets')
      .select('*')
      .in('status', ['pending', 'in-progress'])
      .lt('created_at', twoMinutesAgo);

    if (ticketsError) {
      console.error('Error fetching tickets:', ticketsError);
      throw ticketsError;
    }

    console.log(`Found ${tickets?.length || 0} unresolved tickets older than 2 minutes`);

    if (!tickets || tickets.length === 0) {
      return new Response(
        JSON.stringify({ 
          message: 'No tickets to escalate',
          tickets_checked: 0
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const escalationResults = [];

    for (const ticket of tickets as Ticket[]) {
      console.log(`Processing ticket ${ticket.id}: ${ticket.title}`);

      // Get the ticket creator's info
      const { data: creator } = await supabaseClient
        .from('profiles')
        .select('full_name, email')
        .eq('id', ticket.created_by)
        .single();

      // Find staff to notify
      let recipients: Profile[] = [];

      if (ticket.assigned_to) {
        // If assigned, notify the assigned staff member
        const { data: assignedStaff } = await supabaseClient
          .from('profiles')
          .select('id, email, full_name, staff_category')
          .eq('id', ticket.assigned_to)
          .single();

        if (assignedStaff) {
          recipients = [assignedStaff];
        }
      } else {
        // If not assigned, notify all staff in the category
        const { data: categoryStaff } = await supabaseClient
          .from('profiles')
          .select('id, email, full_name, staff_category')
          .eq('staff_category', ticket.category)
          .eq('role', 'staff');

        if (categoryStaff && categoryStaff.length > 0) {
          recipients = categoryStaff;
        }
      }

      console.log(`Found ${recipients.length} staff members to notify for ticket ${ticket.id}`);

      // Send escalation emails
      for (const staff of recipients) {
        try {
          const emailResponse = await resend.emails.send({
            from: 'HostelCare <onboarding@resend.dev>',
            to: [staff.email],
            subject: `🚨 TEST: Urgent - Ticket Escalation: ${ticket.title}`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #dc2626;">⚠️ TEST ESCALATION ALERT</h2>
                <p>This is a <strong>TEST</strong> escalation for tickets unresolved for more than 2 minutes.</p>
                
                <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 16px; margin: 20px 0;">
                  <h3 style="margin-top: 0;">Ticket Details</h3>
                  <p><strong>ID:</strong> HC-${ticket.id.substring(0, 8)}</p>
                  <p><strong>Title:</strong> ${ticket.title}</p>
                  <p><strong>Description:</strong> ${ticket.description}</p>
                  <p><strong>Category:</strong> ${ticket.category}</p>
                  <p><strong>Location:</strong> ${ticket.location}</p>
                  <p><strong>Urgency:</strong> ${ticket.urgency}</p>
                  <p><strong>Status:</strong> ${ticket.status}</p>
                  <p><strong>Created:</strong> ${new Date(ticket.created_at).toLocaleString()}</p>
                  ${creator ? `<p><strong>Reported by:</strong> ${creator.full_name} (${creator.email})</p>` : ''}
                </div>

                <p style="color: #dc2626; font-weight: bold;">
                  ⚠️ This ticket has been pending for more than 2 minutes and requires immediate attention.
                </p>

                <p style="margin-top: 30px; color: #6b7280; font-size: 14px;">
                  This is an automated test message from HostelCare Ticket Management System.
                </p>
              </div>
            `,
          });

          console.log(`Email sent to ${staff.email} for ticket ${ticket.id}:`, emailResponse);
          
          escalationResults.push({
            ticket_id: ticket.id,
            ticket_title: ticket.title,
            recipient: staff.email,
            status: 'sent',
            email_id: emailResponse.data?.id
          });
        } catch (emailError: any) {
          console.error(`Failed to send email to ${staff.email}:`, emailError);
          escalationResults.push({
            ticket_id: ticket.id,
            ticket_title: ticket.title,
            recipient: staff.email,
            status: 'failed',
            error: emailError.message
          });
        }
      }
    }

    return new Response(
      JSON.stringify({
        message: 'Test escalation check completed',
        tickets_processed: tickets.length,
        escalations_sent: escalationResults.filter(r => r.status === 'sent').length,
        results: escalationResults
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Error in test-escalation function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
};

serve(handler);
