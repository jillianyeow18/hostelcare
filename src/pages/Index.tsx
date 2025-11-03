import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Wrench, Clock, Users, Shield, ArrowRight } from "lucide-react";
import logo from "@/assets/hostelcare-logo.png";

const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (profile?.role === "student") {
        navigate("/student");
      } else if (profile?.role === "staff" || profile?.role === "admin") {
        navigate("/staff");
      }
    }
  };

  const features = [
    {
      icon: Clock,
      title: "24/7 Reporting",
      description: "Submit maintenance complaints anytime, anywhere",
    },
    {
      icon: Wrench,
      title: "Fast Resolution",
      description: "Track your tickets from submission to completion",
    },
    {
      icon: Users,
      title: "Transparent Process",
      description: "Real-time updates on your complaint status",
    },
    {
      icon: Shield,
      title: "Secure Platform",
      description: "Your data is protected and your privacy respected",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logo} alt="HostelCare" className="h-12" />
          </div>
          <Button onClick={() => navigate("/auth")} variant="outline">
            Login
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <div className="max-w-3xl mx-auto space-y-8">
          <div className="inline-block">
            <img src={logo} alt="HostelCare" className="h-32 mx-auto mb-6" />
          </div>
          
          <h1 className="text-5xl md:text-6xl font-bold leading-tight">
            Your Hostel
            <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
              {" "}Maintenance{" "}
            </span>
            Companion
          </h1>
          
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            HostelCare digitizes hostel maintenance reporting with an intuitive submission flow 
            and powerful staff management tools. Report issues, track progress, and get things fixed fast.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Button 
              size="lg" 
              onClick={() => navigate("/auth")}
              className="text-lg gap-2"
            >
              Get Started
              <ArrowRight className="h-5 w-5" />
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              onClick={() => navigate("/auth")}
              className="text-lg"
            >
              Staff Login
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Why Choose HostelCare?</h2>
          <p className="text-muted-foreground text-lg">
            Simple, fast, and reliable maintenance management
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <Card 
              key={index}
              className="shadow-lg hover:shadow-xl transition-all border-2 hover:border-primary/20"
            >
              <CardHeader>
                <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center mb-4">
                  <feature.icon className="h-6 w-6 text-primary-foreground" />
                </div>
                <CardTitle className="text-xl">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base">
                  {feature.description}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20">
        <Card className="max-w-4xl mx-auto shadow-2xl border-2">
          <CardHeader className="text-center space-y-4 pb-8">
            <CardTitle className="text-3xl md:text-4xl font-bold">
              Ready to Improve Your Hostel Experience?
            </CardTitle>
            <CardDescription className="text-lg">
              Join HostelCare today and experience hassle-free maintenance management
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row gap-4 justify-center pb-8">
            <Button 
              size="lg"
              onClick={() => navigate("/auth")}
              className="text-lg"
            >
              Sign Up Now
            </Button>
            <Button 
              size="lg"
              variant="secondary"
              onClick={() => navigate("/auth")}
              className="text-lg"
            >
              Learn More
            </Button>
          </CardContent>
        </Card>
      </section>

      {/* Footer */}
      <footer className="border-t bg-card/50 backdrop-blur-sm mt-20">
        <div className="container mx-auto px-4 py-8 text-center text-muted-foreground">
          <p>© 2025 HostelCare. Making hostel maintenance simple and transparent.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
