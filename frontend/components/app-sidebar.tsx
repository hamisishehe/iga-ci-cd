"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";

import {
  IconArrowDownDashed,
  IconArrowsShuffle,
  IconBuilding,
  IconBuildingCommunity,
  IconCoin,
  IconDashboard,
  IconHierarchy,
  IconReceipt,
  IconUser,
} from "@tabler/icons-react";

import { NavUser } from "@/components/nav-user";
import { useAuth } from "@/context/AuthContext";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";

// Role-based navigation items
const NAV_ITEMS = [
  { title: "Dashboard", url: "/user/admin/dashboard", icon: IconDashboard, roles: ["ADMIN"] },
  { title: "Manage Users", url: "/user/admin/users", icon: IconUser, roles: ["ADMIN"] },
  { title: "Manage Centres", url: "/user/admin/centres", icon: IconBuilding, roles: ["ADMIN"] },
  { title: "Manage Zones", url: "/user/admin/zones", icon: IconBuildingCommunity, roles: ["ADMIN"] },
  { title: "Manage Departments", url: "/user/admin/departments", icon: IconHierarchy, roles: ["ADMIN"] },
  { title: "Dashboard", url: "/user/pages/dashboard", icon: IconDashboard, roles: ["DG", "CHIEF_ACCOUNTANT"] },
  { title: "Collection Report", url: "/user/pages/collection-report", icon: IconReceipt, roles: ["DG", "CHIEF_ACCOUNTANT"] },
  { title: "Distribution Report", url: "/user/pages/distribution-report", icon: IconArrowDownDashed, roles: ["DG", "CHIEF_ACCOUNTANT"] },
  { title: "Apposhment Report", url: "/user/pages/apposhment", icon: IconArrowsShuffle, roles: ["CHIEF_ACCOUNTANT"] },
  { title: "Use of Proceeds", url: "/user/pages/expenditure", icon: IconCoin, roles: ["CHIEF_ACCOUNTANT"] },

];

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { role } = useAuth();
  const [email, setEmail] = React.useState<string | null>(null);
  const [username, setUsername] = React.useState<string | null>(null);
  const pathname = usePathname();

  React.useEffect(() => {
    setEmail(localStorage.getItem("email"));
    setUsername(localStorage.getItem("username"));
  }, []);

  const filteredNav = NAV_ITEMS.filter((item) => item.roles.includes(role || ""));

  const userData = {
    name: username || "Guest User",
    email: email || "No email",
    avatar: "/avatars/shadcn.jpg",
  };

  return (
    <Sidebar collapsible="icon" {...props} className="bg-blue-950 dark:bg-gray-900">
      {/* Sidebar Header */}
      <SidebarHeader className="bg-blue-950 dark:bg-gray-900 border-b border-blue-800 dark:border-gray-700 flex flex-col items-center gap-2 py-4">
        <div className="relative w-5 h-14 md:w-10 md:h-10">
          <Image
            src="/veta.png"
            alt="Logo"
            fill
            className="object-contain rounded-full "
            priority
          />
        </div>
        <span className="font-bold text-2xl text-white dark:text-gray-100">Vetis</span>
      </SidebarHeader>

      {/* Sidebar Content */}
      <SidebarContent className="pt-4 bg-blue-950 dark:bg-gray-900">
        <SidebarMenu>
          {filteredNav.map((item) => {
            const isActive = pathname === item.url;

            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  asChild
                  isActive={isActive}
                  className={`
                    ${isActive 
                      ? "bg-yellow-500 text-black dark:bg-yellow-400 dark:text-gray-900" 
                      : "text-white hover:bg-white/10 hover:text-yellow-500 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-yellow-400"}
                  `}
                >
                  <Link
                    href={item.url}
                    className="flex items-center gap-4 px-4 py-3 min-h-[56px]"
                  >
                    <item.icon
                      className={`w-6 h-6 ${isActive ? "text-black dark:text-gray-900" : "text-white dark:text-gray-300"}`}
                    />
                    <span className="text-lg font-medium">{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarContent>

      {/* Sidebar Footer */}
      <SidebarFooter className="bg-blue-950 dark:bg-gray-900">
        <NavUser user={userData} />
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
