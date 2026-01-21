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
  IconLogs,
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
  { title: "logs", url: "/user/admin/logs", icon: IconLogs, roles: ["ADMIN"] },




  { title: "Dashboard", url: "/user/pages/dashboard", icon: IconDashboard, roles: [
  "BURSAR", 
  "ACCOUNT_OFFICER", 
  "ASSISTANT_ACCOUNT",
  "PRINCIPAL",
  "REGIONAL_DIRECTOR",
  "REGIONAL_FINANCE_MANAGER",
  "DIRECTOR_GENERAL",
  "DIRECTOR_OF_FINANCE", 
  "FINANCE_MANAGER", 
  "CHIEF_ACCOUNTANT", 
  "DEVELOPER", 
  "TESTER"] },
  { title: "Collections", url: "/user/pages/collections", icon: IconReceipt, roles: [
  "BURSAR", 
  "ACCOUNT_OFFICER", 
  "ASSISTANT_ACCOUNT",
  "PRINCIPAL",
  "REGIONAL_DIRECTOR",
  "REGIONAL_FINANCE_MANAGER",
  "DIRECTOR_GENERAL",
  "DIRECTOR_OF_FINANCE", 
  "FINANCE_MANAGER", 
  "CHIEF_ACCOUNTANT", 
  "DEVELOPER", 
  "TESTER"] },
  { title: "Distributions", url: "/user/pages/distributions", icon: IconArrowDownDashed,roles: [
  "BURSAR", 
  "ACCOUNT_OFFICER", 
  "ASSISTANT_ACCOUNT",
  "PRINCIPAL",
  "REGIONAL_DIRECTOR",
  "REGIONAL_FINANCE_MANAGER",
  "DIRECTOR_GENERAL",
  "DIRECTOR_OF_FINANCE", 
  "FINANCE_MANAGER", 
  "CHIEF_ACCOUNTANT", 
  "DEVELOPER", 
  "TESTER"] },
  { title: "Apposhment", url: "/user/pages/apposhment", icon: IconArrowsShuffle, roles: [
  "BURSAR", 
  "ACCOUNT_OFFICER", 
  "ASSISTANT_ACCOUNT",
  "PRINCIPAL",
  "REGIONAL_DIRECTOR",
  "REGIONAL_FINANCE_MANAGER",
  "DIRECTOR_GENERAL",
  "DIRECTOR_OF_FINANCE", 
  "FINANCE_MANAGER", 
  "CHIEF_ACCOUNTANT", 
  "DEVELOPER", 
  "TESTER"] },
  
  { title: "Use of Proceeds", url: "/user/pages/expenditure", icon: IconCoin, roles: [
  "BURSAR"] },


  { title: "Reports", url: "/user/pages/reports", icon: IconReceipt, roles: [
  "BURSAR", 
  "ACCOUNT_OFFICER", 
  "ASSISTANT_ACCOUNT",
  "PRINCIPAL",
  "REGIONAL_DIRECTOR",
  "REGIONAL_FINANCE_MANAGER",
  "DIRECTOR_GENERAL",
  "DIRECTOR_OF_FINANCE", 
  "FINANCE_MANAGER", 
  "CHIEF_ACCOUNTANT", 
  "DEVELOPER", 
  "TESTER"] },



];

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { role } = useAuth();
  const [email, setEmail] = React.useState<string | null>(null);
  const [username, setUsername] = React.useState<string | null>(null);
  const [userType, setUserType] = React.useState<string | null>(null);
  const [zone, setZone] = React.useState<string | null>(null);
  const pathname = usePathname();

  React.useEffect(() => {
  setEmail(localStorage.getItem("email"));
  setUsername(localStorage.getItem("username"));
  setUserType(localStorage.getItem("userType"));
  setZone(localStorage.getItem("zone"));
}, []);

const CENTRE_ADMIN_ALLOWED_URLS = [
  "/user/admin/dashboard",
  "/user/admin/users",
];


  const filteredNav = NAV_ITEMS.filter((item) => {
  // existing role check (DO NOT REMOVE)
  if (!item.roles.includes(role || "")) return false;

  // NEW RULE: ADMIN + CENTRE → only dashboard & users
  if (role === "ADMIN" && (userType === "CENTRE" || userType === "ZONE")) {
    return CENTRE_ADMIN_ALLOWED_URLS.includes(item.url);
  }

  // all other users keep existing behavior
  return true;
});


  const userData = {
    name: username || "Guest User",
    email: email || "No email",
    avatar: "/avatars/shadcn.jpg",
  };

  return (
    <Sidebar collapsible="icon" {...props} className="bg-blue-950 dark:bg-gray-900">
      {/* Sidebar Header */}
<SidebarHeader className="bg-blue-950 dark:bg-gray-900 border-b border-blue-800 dark:border-gray-700 flex flex-col items-center py-4 gap-2">
  
  {/* Logo container */}
  <div className="relative w-12 h-12 md:w-16 md:h-16 p-3">
    <Image
      src="/veta.png"
      alt="VETIS Logo"
      width={64}
      height={64}
      className="rounded-full object-cover"
      priority
    />
  </div>

  {/* App name */}
  <span className="font-bold text-base md:text-xl text-white dark:text-gray-100">
    VETIS
  </span>

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
