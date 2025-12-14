"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar } from "@/components/ui/avatar";
import { User, Settings, LogOut, Sun, Moon, Maximize2, Minimize2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import Link from "next/link";

export function SiteHeader() {
  const { logout } = useAuth();
  const router = useRouter();

  const [darkMode, setDarkMode] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [role, setRole] = useState<string | null>(null);

  const handleLogout = () => {
    logout();
    router.push("/");
  };

   

  const toggleTheme = () => {
    setDarkMode(!darkMode);
    document.documentElement.classList.toggle("dark", !darkMode);
  };

  const toggleFullScreen = () => {
    if (!fullscreen) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
    setFullscreen(!fullscreen);
  };

  useEffect(() => {
    const handleFullScreenChange = () => {
      setFullscreen(!!document.fullscreenElement);
    };

     setRole(localStorage.getItem("userRole"));
 

    document.addEventListener("fullscreenchange", handleFullScreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullScreenChange);
  }, []);

  return (
    <header className="sticky-top flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mx-2 data-[orientation=vertical]:h-4"
        />

        <div className="ml-auto flex items-center gap-2">
          {/* Theme switch */}
          <Button variant="ghost" className="p-2 rounded-full" onClick={toggleTheme}>
            {darkMode ? <Sun className="h-5 w-5 text-yellow-500" /> : <Moon className="h-5 w-5 text-gray-700" />}
          </Button>

          {/* Fullscreen switch */}
          <Button variant="ghost" className="p-2 rounded-full" onClick={toggleFullScreen}>
            {fullscreen ? <Minimize2 className="h-5 w-5 text-gray-700" /> : <Maximize2 className="h-5 w-5 text-gray-700" />}
          </Button>

          {/* Profile dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 p-0 rounded-full">
               <User className="h-6 w-6 text-gray-800" />
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent className="w-48 mr-2" align="end" forceMount>
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />


             

             <Link href={role === "ADMIN" ? "/user/admin/profile" : "/user/pages/profile"}>


              <DropdownMenuItem>
                <User className="mr-2 h-4 w-4 text-gray-700" />
                Profile
              </DropdownMenuItem>
              </Link>
         
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-red-500 focus:text-red-600"
                onClick={handleLogout}
              >
                <LogOut className="mr-2 h-4 w-4 text-red-500" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
