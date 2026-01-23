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

     const apiUrl = process.env.NEXT_PUBLIC_API_URL || "/api";

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
  <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50">
    <div className="p-6 space-y-6">
      {/* Top row */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/user/admin/dashboard">Admin</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>Dashboard</BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900">
              Dashboard Overview
            </h1>
            <p className="text-sm text-slate-600">
              Quick snapshot of users, centres and departments.
            </p>
          </div>
        </div>

        <Button
          onClick={() => router.push("/user/admin/users")}
          className="h-10 rounded-xl bg-slate-900 text-white hover:bg-slate-800 shadow-sm"
        >
          Manage Users
        </Button>
      </div>

      {/* SUMMARY */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Users */}
        <Card className="relative overflow-hidden rounded-2xl border-slate-200/60 bg-white shadow-sm transition hover:shadow-md">
          <div className="absolute inset-0 bg-gradient-to-br from-sky-500/10 via-transparent to-indigo-500/10" />
          <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-3">
            <div className="space-y-1">
              <CardTitle className="text-sm font-medium text-slate-600">
                Users
              </CardTitle>
              <p className="text-3xl font-semibold tracking-tight text-slate-900">
                {users.length}
              </p>
            </div>

            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-sky-500 to-indigo-500 text-white shadow-sm">
              <IconUsers size={22} />
            </div>
          </CardHeader>

          <CardContent className="relative pt-0">
            <div className="flex items-center gap-2 text-xs text-slate-600">
              <span className="inline-flex h-2 w-2 rounded-full bg-sky-500" />
              Total registered users
            </div>
          </CardContent>
        </Card>

        {/* Centres */}
        <Card className="relative overflow-hidden rounded-2xl border-slate-200/60 bg-white shadow-sm transition hover:shadow-md">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-transparent to-teal-500/10" />
          <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-3">
            <div className="space-y-1">
              <CardTitle className="text-sm font-medium text-slate-600">
                Centres
              </CardTitle>
              <p className="text-3xl font-semibold tracking-tight text-slate-900">
                {centres.length}
              </p>
            </div>

            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-sm">
              <IconBuildingCommunity size={22} />
            </div>
          </CardHeader>

          <CardContent className="relative pt-0">
            <div className="flex items-center gap-2 text-xs text-slate-600">
              <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              Active training centres
            </div>
          </CardContent>
        </Card>

        {/* Departments */}
        <Card className="relative overflow-hidden rounded-2xl border-slate-200/60 bg-white shadow-sm transition hover:shadow-md">
          <div className="absolute inset-0 bg-gradient-to-br from-fuchsia-500/10 via-transparent to-rose-500/10" />
          <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-3">
            <div className="space-y-1">
              <CardTitle className="text-sm font-medium text-slate-600">
                Departments
              </CardTitle>
              <p className="text-3xl font-semibold tracking-tight text-slate-900">
                {departments.length}
              </p>
            </div>

            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-fuchsia-500 to-rose-500 text-white shadow-sm">
              <IconHierarchy size={22} />
            </div>
          </CardHeader>

          <CardContent className="relative pt-0">
            <div className="flex items-center gap-2 text-xs text-slate-600">
              <span className="inline-flex h-2 w-2 rounded-full bg-fuchsia-500" />
              Organizational units
            </div>
          </CardContent>
        </Card>
      </div>

      {/* CHARTS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="rounded-2xl border-slate-200/60 bg-white shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base text-slate-900">
                User Status
              </CardTitle>
              <p className="text-xs text-slate-600">
                Distribution of account statuses
              </p>
            </div>
            <div className="h-9 w-9 rounded-2xl bg-slate-100 grid place-items-center text-slate-700">
              <span className="text-xs font-semibold">%</span>
            </div>
          </CardHeader>

          <CardContent className="pt-2">
            <div className="rounded-2xl border border-slate-200/60 bg-gradient-to-b from-slate-50 to-white p-3">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={statusData} dataKey="value" outerRadius={105} label>
                    {statusData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-slate-200/60 bg-white shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base text-slate-900">
                Users per Centre
              </CardTitle>
              <p className="text-xs text-slate-600">
                Comparison across centres
              </p>
            </div>
            <div className="h-9 w-9 rounded-2xl bg-slate-100 grid place-items-center text-slate-700">
              <span className="text-xs font-semibold">📊</span>
            </div>
          </CardHeader>

          <CardContent className="pt-2">
            <div className="rounded-2xl border border-slate-200/60 bg-gradient-to-b from-slate-50 to-white p-3">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={centreData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="users" fill="#0ea5e9" radius={[10, 10, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  </div>
);

}
