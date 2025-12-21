"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { toast } from "sonner";
import {
  IconUsers,
  IconBuildingCommunity,
  IconHierarchy,
} from "@tabler/icons-react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";

/* ================= TYPES ================= */

interface Zone {
  id: number;
  name: string;
}

interface Centre {
  id: number;
  name: string;
  zones?: Zone;
}

interface Department {
  id: number;
  name: string;
}

interface User {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  status: "ACTIVE" | "INACTIVE";
  centres?: Centre;
}

/* ================= AUTH SCOPE ================= */

const getAuthScope = () => {
  if (typeof window === "undefined") return null;

  return {
    userType: localStorage.getItem("userType"), // HQ | ZONE | CENTRE
    centre: localStorage.getItem("centre"),
    zone: localStorage.getItem("zone"),
  };
};

/* ================= FILTER HELPERS ================= */

const filterUsersByScope = (users: User[]) => {
  const auth = getAuthScope();
  if (!auth) return [];

  // HQ → all data
  if (auth.userType === "HQ") return users;

  // ZONE → only zone users
  if (auth.userType === "ZONE") {
    return users.filter(
      (u) => u.centres?.zones?.name === auth.zone
    );
  }

  // CENTRE → only centre users
  if (auth.userType === "CENTRE") {
    return users.filter(
      (u) => u.centres?.name === auth.centre
    );
  }

  return [];
};

const filterCentresByScope = (centres: Centre[]) => {
  const auth = getAuthScope();
  if (!auth) return [];

  if (auth.userType === "HQ") return centres;

  if (auth.userType === "ZONE") {
    return centres.filter(
      (c) => c.zones?.name === auth.zone
    );
  }

  if (auth.userType === "CENTRE") {
    return centres.filter(
      (c) => c.name === auth.centre
    );
  }

  return [];
};

/* ================= COMPONENT ================= */

export default function AdminDashboardPage() {
  const router = useRouter();
  const apiUrl =
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api";

  const [users, setUsers] = useState<User[]>([]);
  const [centres, setCentres] = useState<Centre[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);

  /* ================= FETCH ================= */

  const fetchUsers = async () => {
    try {

    const token = localStorage.getItem("authToken");
    const apiKey = process.env.NEXT_PUBLIC_API_KEY;

    if (!token || !apiKey) {
      toast("Missing authentication credentials");
      return;
    }

      const res = await fetch(`${apiUrl}/users/get`, {
        method: "GET",
        headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`, 
        "X-API-KEY": apiKey,              
      },
      });
      if (!res.ok) throw new Error();
      const data: User[] = await res.json();
      setUsers(filterUsersByScope(data));
    } catch {
      toast("Failed to load users");
    }
  };

  const fetchCentres = async () => {
    try {

    const token = localStorage.getItem("authToken");
    const apiKey = process.env.NEXT_PUBLIC_API_KEY;

    if (!token || !apiKey) {
      toast("Missing authentication credentials");
      return;
    }

      const res = await fetch(`${apiUrl}/centre/get`, {
        method: "GET",
        headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`, 
        "X-API-KEY": apiKey,              
      },
      });
      if (!res.ok) throw new Error();
      const data: Centre[] = await res.json();
      setCentres(filterCentresByScope(data));
    } catch {
      toast("Failed to load centres");
    }
  };

  const fetchDepartments = async () => {
    try {

    const token = localStorage.getItem("authToken");
    const apiKey = process.env.NEXT_PUBLIC_API_KEY;

    if (!token || !apiKey) {
      toast("Missing authentication credentials");
      return;
    }

    const res = await fetch(`${apiUrl}/department/get`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`, 
        "X-API-KEY": apiKey,              
      },
    });

    console.log("Fetch Departments Request Headers:", {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
      "X-API-KEY": apiKey,
    });
    console.log("Fetch Departments Response Status:", res.status);

      if (!res.ok) throw new Error();
      const data: Department[] = await res.json();
      setDepartments(data);
    } catch {
      toast("Failed to load departments");
    }
  };

  /* ================= INIT ================= */

  useEffect(() => {
    Promise.all([
      fetchUsers(),
      fetchCentres(),
      fetchDepartments(),
    ]).finally(() => setLoading(false));
  }, []);

  /* ================= CHART DATA ================= */

  const statusData = [
    { name: "Active", value: users.filter(u => u.status === "ACTIVE").length },
    { name: "Inactive", value: users.filter(u => u.status === "INACTIVE").length },
  ];

  const centreData = centres.map((c) => ({
    name: c.name,
    users: users.filter((u) => u.centres?.id === c.id).length,
  }));

  const COLORS = ["#0284c7", "#f59e0b", "#10b981", "#ef4444"];

  /* ================= LOADING ================= */

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin h-16 w-16 border-t-4 border-sky-800 rounded-full"></div>
      </div>
    );
  }

  /* ================= UI ================= */

  return (
    <div className="p-6 space-y-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/user/admin/dashboard">Admin</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>Dashboard</BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-sky-800">
          Dashboard Overview
        </h1>
        <Button
          onClick={() => router.push("/user/admin/users")}
          className="bg-sky-800 text-white"
        >
          Manage Users
        </Button>
      </div>

      {/* SUMMARY */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex justify-between">
            <CardTitle>Users</CardTitle>
            <IconUsers size={28} className="text-sky-800" />
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">{users.length}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex justify-between">
            <CardTitle>Centres</CardTitle>
            <IconBuildingCommunity size={28} className="text-sky-800" />
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">{centres.length}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex justify-between">
            <CardTitle>Departments</CardTitle>
            <IconHierarchy size={28} className="text-sky-800" />
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">{departments.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* CHARTS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>User Status</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={statusData} dataKey="value" outerRadius={100} label>
                  {statusData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Users per Centre</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={centreData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="users" fill="#0284c7" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
