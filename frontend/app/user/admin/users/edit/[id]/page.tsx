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

interface UserResponse {
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

  centres?: { id: number; name: string };
  departments?: { id: number; name: string };
}

const FINANCE_ROLES: Role[] = ["ACCOUNTANT", "CHIEF_ACCOUNTANT"];
const ALL_ROLES: Role[] = [
  "ADMIN",
  "MANAGER",
  "CASHIER",
  "STAFF",
  "DG",
  "DF",
  "RFM",
  "CHIEF_ACCOUNTANT",
  "ACCOUNTANT",
];

// get current logged-in userType from localStorage
const getAuthScope = (): UserType => {
  return (localStorage.getItem("userType") as UserType) || "CENTRE";
};

export default function EditUserPage() {
  const router = useRouter();
  const { id } = useParams();
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api";
  const userTypeScope = getAuthScope();

  const [error, setError] = useState("");
  const [form, setForm] = useState<UserResponse>({
    id: 0,
    firstName: "",
    middleName: "",
    lastName: "",
    userName: "",
    email: "",
    phoneNumber: "",
    role: "ACCOUNTANT",
    userType: userTypeScope, // default based on logged-in user
    status: "ACTIVE",
    centreId: 0,
    departmentId: 0,
  });

  const [centres, setCentres] = useState<Centre[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);

  // allowed roles based on current user scope
  const allowedRoles = userTypeScope === "HQ" ? ALL_ROLES : FINANCE_ROLES;

  useEffect(() => {
    fetchCentres();
    fetchDepartments();
    if (id) fetchUserById();
  }, [id]);

  const fetchUserById = async () => {
    try {
      const res = await fetch(`${apiUrl}/users/get/${id}`);
      if (!res.ok) return toast("Failed to load user");
      const data: UserResponse = await res.json();

      setForm({
        ...data,
        centreId: data.centreId || data.centres?.id || 0,
        departmentId: data.departmentId || data.departments?.id || 0,
        userType: userTypeScope !== "HQ" ? userTypeScope : data.userType,
      });
    } catch {
      toast("Error fetching user");
    } finally {
      setLoading(false);
    }
  };

  const fetchCentres = async () => {
    try {
      const res = await fetch(`${apiUrl}/centre/get`);
      if (res.ok) setCentres(await res.json());
    } catch {
      toast("Error loading centres");
    }
  };

  const fetchDepartments = async () => {
    try {
      const res = await fetch(`${apiUrl}/department/get`);
      if (res.ok) setDepartments(await res.json());
    } catch {
      toast("Error loading departments");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.departmentId) {
      setError("Department is required");
      return;
    }

    const payload = {
      firstName: form.firstName,
      middleName: form.middleName,
      lastName: form.lastName,
      userName: form.userName,
      email: form.email,
      phoneNumber: form.phoneNumber,
      role: form.role,
      userType: form.userType,
      status: form.status,
      centreId: String(form.centreId),
      departmentId: String(form.departmentId),
    };

    try {
      const res = await fetch(`${apiUrl}/users/update/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        toast("User updated successfully");
        router.push("/user/admin/users");
      } else toast("Failed to update user");
    } catch {
      toast("Error updating user");
    }
  };

  if (loading) return <div className="p-6 text-center">Loading user data...</div>;

  return (
    <div className="w-full mx-auto p-8 space-y-6">
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
          <BreadcrumbItem>Edit User</BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <Card className="border rounded-2xl shadow-md">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold">Edit User</CardTitle>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Names */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input
                placeholder="First Name"
                value={form.firstName}
                onChange={(e) => setForm({ ...form, firstName: e.target.value })}
              />
              <Input
                placeholder="Middle Name"
                value={form.middleName}
                onChange={(e) => setForm({ ...form, middleName: e.target.value })}
              />
              <Input
                placeholder="Last Name"
                value={form.lastName}
                onChange={(e) => setForm({ ...form, lastName: e.target.value })}
              />
            </div>

            {/* Username + Email */}
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

            {/* Phone */}
            <Input
              placeholder="Phone Number"
              value={form.phoneNumber}
              onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })}
            />

            {/* Centre + Department */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                value={String(form.centreId)}
                onValueChange={(v) => setForm({ ...form, centreId: Number(v) })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Centre" />
                </SelectTrigger>
                <SelectContent>
                  {centres.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={form.departmentId ? String(form.departmentId) : ""}
                onValueChange={(v) => {
                  setForm({ ...form, departmentId: Number(v) });
                  setError("");
                }}
              >
                <SelectTrigger className={error ? "border-red-500 focus:ring-red-500" : ""}>
                  <SelectValue placeholder="Select Department" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={String(d.id)}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
            </div>

            {/* Role / Type / Status */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Select
                value={form.role}
                onValueChange={(v: Role) => setForm({ ...form, role: v })}
                disabled={userTypeScope !== "HQ"}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Role" />
                </SelectTrigger>
                <SelectContent>
                  {allowedRoles.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {userTypeScope === "HQ" ? (
                <Select
                  value={form.userType}
                  onValueChange={(v: UserType) => setForm({ ...form, userType: v })}
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
              ) : (
                <Input
                  value={form.userType}
                  disabled
                  className="bg-gray-100 cursor-not-allowed"
                />
              )}

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
                onClick={() => router.push("/user/admin/users")}
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
