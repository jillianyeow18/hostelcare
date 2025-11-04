import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Wrench, CheckCircle2, Clock, Shield } from "lucide-react";
import hostelcareLogo from "@/assets/hostelcare-logo.png";

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background">
      {/* Header */}
      <header className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between">
          <img src={hostelcareLogo} alt="HostelCare" className="h-16" />
          <Link to="/auth" aria-label="Login or Sign Up">
            <Button className="bg-purple-900 text-white hover:bg-purple-800 active:bg-purple-700 focus:ring-2 focus:ring-purple-300 border-transparent transition-colors duration-150">
              Login / Sign Up
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <div className="mx-auto max-w-4xl">
          <h1 className="mb-6 text-5xl font-bold leading-tight md:text-6xl lg:text-7xl">
            Report. Track. Resolve.
            <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
              {" "}
              Hostel Maintenance Made Simple
            </span>
          </h1>
          <p className="mb-12 text-xl text-muted-foreground md:text-2xl">
            Digital maintenance reporting for students and staff. Submit
            complaints 24/7, track progress in real-time, and ensure faster
            resolutions.
          </p>
          <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
            <Link to="/auth">
              <Button variant="hero" size="xl" className="w-full sm:w-auto">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 py-20">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          <FeatureCard
            icon={<Wrench className="h-8 w-8" />}
            title="Easy Reporting"
            description="Submit maintenance complaints anytime, anywhere with photo support"
          />
          <FeatureCard
            icon={<Clock className="h-8 w-8" />}
            title="Real-Time Tracking"
            description="Track your complaint status from submission to resolution"
          />
          <FeatureCard
            icon={<CheckCircle2 className="h-8 w-8" />}
            title="Efficient Management"
            description="Staff can manage and resolve issues systematically"
          />
          <FeatureCard
            icon={<Shield className="h-8 w-8" />}
            title="Full Transparency"
            description="Stay informed with automated notifications and updates"
          />
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <div className="mx-auto max-w-2xl rounded-2xl bg-gradient-to-r from-primary/10 via-secondary/10 to-accent/10 p-12">
          <h2 className="mb-4 text-3xl font-bold md:text-4xl">
            Ready to streamline your hostel maintenance?
          </h2>
          <p className="mb-8 text-lg text-muted-foreground">
            Join students and staff using HostelCare today
          </p>
          <Link to="/auth">
            <Button variant="hero" size="xl">
              Start Now
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-12">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>© 2025 HostelCare. Digital hostel maintenance reporting system.</p>
        </div>
      </footer>
    </div>
  );
};

const FeatureCard = ({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) => {
  return (
    <div className="group rounded-xl border bg-card p-6 shadow-[var(--shadow-card)] transition-all hover:shadow-[var(--shadow-glow)]">
      <div className="mb-4 inline-flex rounded-lg bg-primary/10 p-3 text-primary transition-transform group-hover:scale-110">
        {icon}
      </div>
      <h3 className="mb-2 text-xl font-semibold">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
    </div>
  );
};

export default Index;
