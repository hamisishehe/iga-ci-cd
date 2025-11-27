import { AppSidebar } from "@/components/app-sidebar";
import ProtectedRoute from "@/components/ProtectedRoute";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AuthProvider } from "@/context/AuthContext";
import { Toaster } from "sonner";

export default function UserLayout({
  children,
}: {
    children: React.ReactNode;
}) {
  return (
    <div>
        <ProtectedRoute>
          <SidebarProvider
            style={
              {
                "--sidebar-width": "calc(var(--spacing) * 72)",
                "--header-height": "calc(var(--spacing) * 12)",
              } as React.CSSProperties
            }
          >
            <AppSidebar variant="inset" />
            <SidebarInset>
              <SiteHeader />
              <Toaster/>
              {children}
            </SidebarInset>
          </SidebarProvider>
        </ProtectedRoute>
    </div>
  );
}