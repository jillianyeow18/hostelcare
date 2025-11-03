import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Ticket {
  id: string;
  title: string;
  description: string;
  category: string;
  location: string;
  created_at: string;
  created_by: string;
  assigned_to: string | null;
}

interface Profile {
  email: string;
  full_name: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Calculate date 3 days ago
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    console.log("Checking for unresolved tickets older than:", threeDaysAgo.toISOString());

    // Get all tickets that are unresolved and older than 3 days
    const { data: tickets, error: ticketsError } = await supabaseClient
      .from("tickets")
      .select("id, title, description, category, location, created_at, created_by, assigned_to")
      .in("status", ["pending", "in_progress"])
      .lt("created_at", threeDaysAgo.toISOString());

    if (ticketsError) {
      console.error("Error fetching tickets:", ticketsError);
      throw ticketsError;
    }

    if (!tickets || tickets.length === 0) {
      console.log("No unresolved tickets found older than 3 days");
      return new Response(
        JSON.stringify({ message: "No unresolved tickets to escalate" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${tickets.length} unresolved tickets to escalate`);

    const emailPromises = tickets.map(async (ticket: Ticket) => {
      try {
        // Get the profile of the student who created the ticket
        const { data: studentProfile, error: studentError } = await supabaseClient
          .from("profiles")
          .select("email, full_name")
          .eq("id", ticket.created_by)
          .single();

        if (studentError) {
          console.error(`Error fetching student profile for ticket ${ticket.id}:`, studentError);
          return null;
        }

        const daysUnresolved = Math.floor(
          (new Date().getTime() - new Date(ticket.created_at).getTime()) / (1000 * 60 * 60 * 24)
        );

        let recipientEmails: string[] = [];

        // If ticket is assigned, send to assigned staff
        if (ticket.assigned_to) {
          const { data: staffProfile, error: staffError } = await supabaseClient
            .from("profiles")
            .select("email, full_name")
            .eq("id", ticket.assigned_to)
            .single();

          if (staffProfile && !staffError) {
            recipientEmails.push(staffProfile.email);
          }
        } else {
          // If not assigned, get all staff in the same category
          const { data: categoryStaff, error: categoryError } = await supabaseClient
            .from("profiles")
            .select("email, full_name")
            .eq("staff_category", ticket.category)
            .eq("role", "staff");

          if (categoryStaff && !categoryError && categoryStaff.length > 0) {
            recipientEmails = categoryStaff.map((staff: Profile) => staff.email);
          }
        }

        if (recipientEmails.length === 0) {
          console.log(`No recipients found for ticket ${ticket.id}`);
          return null;
        }

        // Send escalation email
        const emailResponse = await resend.emails.send({
          from: "HostelCare <onboarding@resend.dev>",
          to: recipientEmails,
          subject: `⚠️ URGENT: Unresolved Complaint - ${ticket.title}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #dc2626;">⚠️ Escalation Alert: Unresolved Complaint</h2>
              
              <div style="background-color: #fee2e2; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0;">
                <p style="margin: 0; font-weight: bold;">This complaint has been unresolved for ${daysUnresolved} days</p>
              </div>

              <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin-top: 0;">Complaint Details</h3>
                <p><strong>Ticket ID:</strong> ${ticket.id.substring(0, 8)}</p>
                <p><strong>Title:</strong> ${ticket.title}</p>
                <p><strong>Category:</strong> ${ticket.category}</p>
                <p><strong>Location:</strong> ${ticket.location}</p>
                <p><strong>Submitted by:</strong> ${studentProfile?.full_name} (${studentProfile?.email})</p>
                <p><strong>Date Submitted:</strong> ${new Date(ticket.created_at).toLocaleDateString()}</p>
                <p><strong>Description:</strong></p>
                <p>${ticket.description}</p>
              </div>

              <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0;">
                <p style="margin: 0;"><strong>Action Required:</strong> Please review and resolve this complaint as soon as possible.</p>
              </div>

              <p style="color: #6b7280; font-size: 12px; margin-top: 30px;">
                This is an automated escalation email from HostelCare Management System.
              </p>
            </div>
          `,
        });

        console.log(`Escalation email sent for ticket ${ticket.id}:`, emailResponse);
        return emailResponse;
      } catch (error) {
        console.error(`Error processing ticket ${ticket.id}:`, error);
        return null;
      }
    });

    const results = await Promise.all(emailPromises);
    const successCount = results.filter((r) => r !== null).length;

    console.log(`Successfully sent ${successCount} escalation emails out of ${tickets.length} tickets`);

    return new Response(
      JSON.stringify({
        message: `Escalation process completed`,
        totalTickets: tickets.length,
        emailsSent: successCount,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in escalate-unresolved-tickets function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
};

serve(handler);
