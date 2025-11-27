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

interface Centre {
  id: number;
  name: string;
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

export default function AdminDashboardPage() {
  const router = useRouter();
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api";

  const [users, setUsers] = useState<User[]>([]);
  const [centres, setCentres] = useState<Centre[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetchUsers(), fetchCentres(), fetchDepartments()]).finally(() =>
      setLoading(false)
    );
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await fetch(`${apiUrl}/users/get`);
      if (!res.ok) throw new Error("Failed to load users");
      const data: User[] = await res.json();
      setUsers(data);
    } catch {
      toast("Error loading users");
    }
  };

  const fetchCentres = async () => {
    try {
      const res = await fetch(`${apiUrl}/centre/get`);
      if (!res.ok) throw new Error("Failed to load centres");
      const data: Centre[] = await res.json();
      setCentres(data);
    } catch {
      toast("Error loading centres");
    }
  };

  const fetchDepartments = async () => {
    try {
      const res = await fetch(`${apiUrl}/department/get`);
      if (!res.ok) throw new Error("Failed to load departments");
      const data: Department[] = await res.json();
      setDepartments(data);
    } catch {
      toast("Error loading departments");
    }
  };

  // Prepare chart data
  const statusData = [
    { name: "Active", value: users.filter((u) => u.status === "ACTIVE").length },
    { name: "Inactive", value: users.filter((u) => u.status === "INACTIVE").length },
  ];

  const centreData = centres.map((c) => ({
    name: c.name,
    users: users.filter((u) => u.centres?.id === c.id).length,
  }));

  const COLORS = ["#0284c7", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6"];


  if (loading) {
  return (
    <div className="w-full h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-sky-800 border-solid"></div>
    </div>
  );
}


  return (
    <div className="p-6 space-y-6">
      {/* Breadcrumb */}
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
        <h1 className="text-2xl font-semibold tracking-tight text-sky-800">
       
        </h1>
        <Button
          onClick={() => router.push("/user/admin/users")}
          className="bg-sky-800 hover:bg-sky-900 text-white"
        >
          Manage Users
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="shadow-md hover:shadow-lg transition">
          <CardHeader className="flex items-center justify-between">
            <CardTitle className="text-gray-700">Users</CardTitle>
            <IconUsers className="text-sky-800" size={28} />
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold text-gray-800">
              {loading ? "..." : users.length}
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-md hover:shadow-lg transition">
          <CardHeader className="flex items-center justify-between">
            <CardTitle className="text-gray-700">Centres</CardTitle>
            <IconBuildingCommunity className="text-sky-800" size={28} />
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold text-gray-800">
              {loading ? "..." : centres.length}
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-md hover:shadow-lg transition">
          <CardHeader className="flex items-center justify-between">
            <CardTitle className="text-gray-700">Departments</CardTitle>
            <IconHierarchy className="text-sky-800" size={28} />
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold text-gray-800">
              {loading ? "..." : departments.length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        {/* Pie Chart - User Status */}
        <Card className="shadow-md border border-gray-200">
          <CardHeader>
            <CardTitle className="text-gray-700">User Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                  label
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Bar Chart - Users by Centre */}
        <Card className="shadow-md border border-gray-200">
          <CardHeader>
            <CardTitle className="text-gray-700">Users per Centre</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={centreData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="users" fill="#0284c7" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
