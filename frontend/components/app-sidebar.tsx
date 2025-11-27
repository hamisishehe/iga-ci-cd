"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"

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
} from "@tabler/icons-react"

import { NavUser } from "@/components/nav-user"
import { useAuth } from "@/context/AuthContext"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton
} from "@/components/ui/sidebar"

// Your role-based menus ONLY
const NAV_ITEMS = [
  // ADMIN
  { title: "Dashboard", url: "/user/admin/dashboard", icon: IconDashboard, roles: ["ADMIN"] },
  { title: "Manage Users", url: "/user/admin/users", icon: IconUser, roles: ["ADMIN"] },
  { title: "Manage Centres", url: "/user/admin/centres", icon: IconBuilding, roles: ["ADMIN"] },
  { title: "Manage Zones", url: "/user/admin/zones", icon: IconBuildingCommunity, roles: ["ADMIN"] },
  { title: "Manage Departments", url: "/user/admin/departments", icon: IconHierarchy, roles: ["ADMIN"] },

  // // DG
  // { title: "Dashboard", url: "/user/dg/dashboard", icon: IconDashboard, roles: ["DG"] },
  // { title: "Collection Report", url: "/user/dg/collection-report", icon: IconReceipt, roles: ["DG"] },
  // { title: "Distribution Report", url: "/user/dg/distribution-report", icon: IconArrowDownDashed, roles: ["DG"] },

  // // CHIEF ACCOUNTANT
  // { title: "Dashboard", url: "/user/chief_accountant/dashboard", icon: IconDashboard, roles: ["CHIEF_ACCOUNTANT"] },
  // { title: "Collection Report", url: "/user/chief_accountant/collection-report", icon: IconReceipt, roles: ["CHIEF_ACCOUNTANT"] },
  // { title: "Distribution Report", url: "/user/chief_accountant/distribution-report", icon: IconArrowDownDashed, roles: ["CHIEF_ACCOUNTANT"] },
  // { title: "Apposhment Report", url: "/user/chief_accountant/apposhment", icon: IconArrowsShuffle, roles: ["CHIEF_ACCOUNTANT"] },
  // { title: "Use of Proceeds", url: "/user/chief_accountant/expenditure", icon: IconCoin, roles: ["CHIEF_ACCOUNTANT"] },




   // Pages
  { title: "Dashboard", url: "/user/pages/dashboard", icon: IconDashboard, roles: ["DG", "CHIEF_ACCOUNTANT"] },
  { title: "Collection Report", url: "/user/pages/collection-report", icon: IconReceipt, roles: ["DG", "CHIEF_ACCOUNTANT"]},
  { title: "Distribution Report", url: "/user/pages/distribution-report", icon: IconArrowDownDashed, roles: ["DG", "CHIEF_ACCOUNTANT"] },
  { title: "Apposhment Report", url: "/user/pages/apposhment", icon: IconArrowsShuffle, roles: ["CHIEF_ACCOUNTANT"] },
  { title: "Use of Proceeds", url: "/user/pages/expenditure", icon: IconCoin, roles: ["CHIEF_ACCOUNTANT"] },
]

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { role } = useAuth()
  const [email, setEmail] = React.useState<string | null>(null);
  const [username, setUsername] = React.useState<string | null>(null);
  const pathname = usePathname();

  React.useEffect(() => {
    setEmail(localStorage.getItem("email"));
    setUsername(localStorage.getItem("username"));
  }, []);
  

  const filteredNav = NAV_ITEMS.filter((item) => item.roles.includes(role || ""))

 
  const userData = {
    name: username || "Guest User",
    email: email || "No email",
    avatar: "/avatars/shadcn.jpg",
  };


  return (
    <Sidebar collapsible="icon" {...props} className="bg-blue-950">
      <SidebarHeader className="bg-blue-950 border-b border-blue-800">
        <span className="font-bold text-xl text-white">Vetis</span>
      </SidebarHeader>

      <SidebarContent className="bg-blue-950 pt-4">

      
        <SidebarMenu>
          {filteredNav.map((item) => {
            const isActive = pathname === item.url

            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton asChild isActive={isActive } className={`   ${isActive  ? 'bg-white/20 text-black' : 'text-white hover:bg-white/10 hover:text-white'} `}>
                  <Link href={item.url} className="flex items-center gap-3 ">
                    <item.icon className={` w-4 h-4  ${isActive  ? 'text-black' : 'text-white' } `} />
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          })}
        </SidebarMenu>

      </SidebarContent>

      <SidebarFooter className="bg-blue-950">
        <NavUser user={userData} />
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}
