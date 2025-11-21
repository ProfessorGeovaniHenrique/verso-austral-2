import { Outlet } from "react-router-dom";
import Header from "@/components/Header";
import { DynamicBreadcrumb } from "@/components/DynamicBreadcrumb";
import { AdminSidebar } from "@/components/AdminSidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";

export default function AdminLayout() {
  return (
    <>
      <Header />
      <SidebarProvider>
        <div className="flex min-h-screen w-full">
          <AdminSidebar />
          
          <div className="flex-1 flex flex-col">
            <div className="border-b bg-background sticky top-[88px] z-40">
              <div className="container mx-auto px-6 py-4 flex items-center gap-4">
                <SidebarTrigger className="-ml-2" title="Alternar Sidebar (Ctrl+B / Cmd+B)" />
                <DynamicBreadcrumb />
              </div>
            </div>
            
            <main className="flex-1 container mx-auto px-6 pt-12 pb-8">
              <Outlet />
            </main>
          </div>
        </div>
      </SidebarProvider>
    </>
  );
}
