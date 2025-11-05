import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import StaffSidebar from "./StaffSidebar";

interface StaffLayoutProps {
  children: React.ReactNode;
  profile: any;
  staffCategory: string;
}

export default function StaffLayout({ children, profile, staffCategory }: StaffLayoutProps) {
  return (
    <SidebarProvider>
      <div className="flex h-screen overflow-hidden bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50">
        <StaffSidebar 
          profile={profile} 
          staffCategory={staffCategory}
        />

        <SidebarInset className="flex-1 overflow-hidden w-full">
          {children}
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}