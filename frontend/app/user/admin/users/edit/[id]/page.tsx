"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectTrigger,
  SelectValue,
  SelectItem,
} from "@/components/ui/select";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

type Role =
  | "ADMIN"
  | "MANAGER"
  | "CASHIER"
  | "STAFF"
  | "DG"
  | "DF"
  | "RFM"
  | "CHIEF_ACCOUNTANT"
  | "ACCOUNTANT";
type UserType = "CENTRE" | "ZONE" | "HQ";
type Status = "ACTIVE" | "INACTIVE" | "PENDING";

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
  middleName: string;
  lastName: string;
  userName: string;
  email: string;
  phoneNumber: string;
  role: Role;
  userType: UserType;
  status: Status;
  centreId: number;
  departmentId: number;
}

export default function EditUserPage() {
  const router = useRouter();
  const { id } = useParams();
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api";

  const [form, setForm] = useState<User>({
    id: 0,
    firstName: "",
    middleName: "",
    lastName: "",
    userName: "",
    email: "",
    phoneNumber: "",
    role: "STAFF",
    userType: "CENTRE",
    status: "ACTIVE",
    centreId: 0,
    departmentId: 0,
  });

  const [centres, setCentres] = useState<Centre[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCentres();
    fetchDepartments();
    if (id) fetchUserById();
  }, [id]);

  const fetchUserById = async () => {
    try {
      const res = await fetch(`${apiUrl}/users/get/${id}`);
      if (res.ok) {
        const data: User = await res.json();
        setForm(data);
      } else {
        toast("Failed to load user");
      }
    } catch {
      toast("Error fetching user");
    } finally {
      setLoading(false);
    }
  };

  const fetchCentres = async () => {
    try {
      const res = await fetch(`${apiUrl}/centre/get`);
      if (res.ok) {
        const data: Centre[] = await res.json();
        setCentres(data);
      }
    } catch {
      toast("Error loading centres");
    }
  };

  const fetchDepartments = async () => {
    try {
      const res = await fetch(`${apiUrl}/department/get`);
      if (res.ok) {
        const data: Department[] = await res.json();
        setDepartments(data);
      }
    } catch {
      toast("Error loading departments");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${apiUrl}/users/update/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (res.ok) {
        toast("User updated successfully");
        router.push("/users");
      } else {
        toast("Failed to update user");
      }
    } catch {
      toast("Error updating user");
    }
  };

  if (loading) return <div className="p-6 text-center">Loading user data...</div>;

  return (
    <div className="w-full mx-auto p-8 space-y-6">
      {/* Breadcrumb */}
       <Breadcrumb className="mb-6">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/user/admin/dashboard">Dashboard</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href="/user/admin/users">Users</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>Add User</BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Card */}
      <Card className="border rounded-2xl shadow-md">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold text-gray-800 text-start">
            Edit User
          </CardTitle>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* User Info */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input
                placeholder="First Name"
                value={form.firstName}
                onChange={(e) =>
                  setForm({ ...form, firstName: e.target.value })
                }
              />
              <Input
                placeholder="Middle Name"
                value={form.middleName}
                onChange={(e) =>
                  setForm({ ...form, middleName: e.target.value })
                }
              />
              <Input
                placeholder="Last Name"
                value={form.lastName}
                onChange={(e) => setForm({ ...form, lastName: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                placeholder="Username"
                value={form.userName}
                onChange={(e) => setForm({ ...form, userName: e.target.value })}
              />
              <Input
                placeholder="Email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>

            <Input
              placeholder="Phone Number"
              value={form.phoneNumber}
              onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })}
            />

            {/* Centre & Department */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                value={form.centreId ? form.centreId.toString() : ""}
                onValueChange={(v) =>
                  setForm({ ...form, centreId: parseInt(v) })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Centre" />
                </SelectTrigger>
                <SelectContent>
                  {centres.map((centre) => (
                    <SelectItem key={centre.id} value={centre.id.toString()}>
                      {centre.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={form.departmentId ? form.departmentId.toString() : ""}
                onValueChange={(v) =>
                  setForm({ ...form, departmentId: parseInt(v) })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Department" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((dep) => (
                    <SelectItem key={dep.id} value={dep.id.toString()}>
                      {dep.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Role / User Type / Status */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Select
                value={form.role}
                onValueChange={(v: Role) => setForm({ ...form, role: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Role" />
                </SelectTrigger>
                <SelectContent>
                  {[
                    "ADMIN",
                    "MANAGER",
                    "CASHIER",
                    "STAFF",
                    "DG",
                    "DF",
                    "RFM",
                    "CHIEF_ACCOUNTANT",
                    "ACCOUNTANT",
                  ].map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={form.userType}
                onValueChange={(v: UserType) =>
                  setForm({ ...form, userType: v })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select User Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CENTRE">CENTRE</SelectItem>
                  <SelectItem value="ZONE">ZONE</SelectItem>
                  <SelectItem value="HQ">HQ</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={form.status}
                onValueChange={(v: Status) => setForm({ ...form, status: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">ACTIVE</SelectItem>
                  <SelectItem value="INACTIVE">INACTIVE</SelectItem>
                  <SelectItem value="PENDING">PENDING</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Buttons */}
            <div className="flex justify-end gap-3 pt-4 border-t mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/users")}
              >
                Cancel
              </Button>
              <Button type="submit">Update</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
