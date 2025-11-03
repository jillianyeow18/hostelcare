import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import StaffSidebar from "@/components/staff/StaffSidebar";
import DiscussionPanel from "@/components/staff/DiscussionPanel";

const Discussions = () => {
  const navigate = useNavigate();
  const { category } = useParams<{ category: string }>();
  const [profile, setProfile] = useState<any>(null);
  const [channelId, setChannelId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (category) {
      loadChannel();
    }
  }, [category]);

  const checkAuth = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      navigate("/auth");
      return;
    }

    const { data: profileData } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (profileData?.role === "student") {
      navigate("/student");
      return;
    }

    setProfile(profileData);
    setLoading(false);
  };

  const loadChannel = async () => {
    try {
      const { data, error } = await supabase
        .from("discussion_channels")
        .select("id, name")
        .eq("category", category)
        .single();

      if (error) throw error;
      setChannelId(data.id);
    } catch (error) {
      console.error("Error loading channel:", error);
    }
  };

  if (loading || !profile || !channelId) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <StaffSidebar profile={profile} staffCategory={profile.staff_category} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <DiscussionPanel
          channelId={channelId}
          channelName={category || ""}
          currentUserId={profile.id}
        />
      </div>
    </div>
  );
};

export default Discussions;
