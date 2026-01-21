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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

type Role =
 |"ADMIN"
  |"BURSAR"
  |"ACCOUNT_OFFICER"
  |"ASSISTANT_ACCOUNT"
  |"PRINCIPAL"
  |"REGIONAL_DIRECTOR"
  |"REGIONAL_FINANCE_MANAGER"
  |"DIRECTOR_GENERAL"
  |"DIRECTOR_OF_FINANCE" 
  |"FINANCE_MANAGER"
  |"CHIEF_ACCOUNTANT" 
  |"DEVELOPER"
  |"TESTER";



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

const FINANCE_ROLES: Role[] = ["ACCOUNT_OFFICER", "CHIEF_ACCOUNTANT"];
const ALL_ROLES: Role[] = [
   "ADMIN",
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
  "TESTER"
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
    role: "ACCOUNT_OFFICER",
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


         const token = localStorage.getItem("authToken");
    const apiKey = process.env.NEXT_PUBLIC_API_KEY;

    if (!token || !apiKey) {
      toast("Missing authentication credentials");
      return;
    }


      const res = await fetch(`${apiUrl}/users/get/${id}`, {
        method: "GET",
            headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`, 
        "X-API-KEY": apiKey,              
      },
      });
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

      
         const token = localStorage.getItem("authToken");
    const apiKey = process.env.NEXT_PUBLIC_API_KEY;

    if (!token || !apiKey) {
      toast("Missing authentication credentials");
      return;
    }

      const res = await fetch(`${apiUrl}/centre/get`, {
             headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`, 
        "X-API-KEY": apiKey,              
      },
      });
      if (res.ok) setCentres(await res.json());
    } catch {
      toast("Error loading centres");
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

           const token = localStorage.getItem("authToken");
    const apiKey = process.env.NEXT_PUBLIC_API_KEY;

    if (!token || !apiKey) {
      toast("Missing authentication credentials");
      return;
    }


      const res = await fetch(`${apiUrl}/users/update/${id}`, {
        method: "PUT",
             headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`, 
        "X-API-KEY": apiKey,              
      },
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
  <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50">
    <div className="w-full mx-auto p-6 sm:p-8 space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb className="mb-2">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink
              href="/user/admin/dashboard"
              className="font-semibold text-slate-800"
            >
              Dashboard
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink
              href="/user/admin/users"
              className="font-semibold text-slate-800"
            >
              Users
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem className="text-slate-600">Edit User</BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Page Title */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Edit User
        </h1>
        <p className="text-sm text-slate-600">
          Update user profile, assignments and account status.
        </p>
      </div>

      {/* Form Card */}
      <Card className="relative overflow-hidden rounded-2xl border-slate-200/60 bg-white shadow-sm">
        <div className="absolute inset-0 bg-gradient-to-br from-sky-500/8 via-transparent to-indigo-500/8" />

        <CardHeader className="relative">
          <CardTitle className="text-lg text-slate-900">User Information</CardTitle>
          <CardDescription className="text-slate-600">
            Make changes then click update to save.
          </CardDescription>
        </CardHeader>

        <CardContent className="relative">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Names */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-700">First Name</label>
                <Input
                  placeholder="First Name"
                  value={form.firstName}
                  onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                  className="h-10 rounded-xl border-slate-200 bg-white"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-700">Middle Name</label>
                <Input
                  placeholder="Middle Name"
                  value={form.middleName}
                  onChange={(e) => setForm({ ...form, middleName: e.target.value })}
                  className="h-10 rounded-xl border-slate-200 bg-white"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-700">Last Name</label>
                <Input
                  placeholder="Last Name"
                  value={form.lastName}
                  onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                  className="h-10 rounded-xl border-slate-200 bg-white"
                />
              </div>
            </div>

            {/* Username + Email */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-700">Username</label>
                <Input
                  placeholder="Username"
                  value={form.userName}
                  onChange={(e) => setForm({ ...form, userName: e.target.value })}
                  className="h-10 rounded-xl border-slate-200 bg-white"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-700">Email</label>
                <Input
                  placeholder="Email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="h-10 rounded-xl border-slate-200 bg-white"
                />
              </div>
            </div>

            {/* Phone */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-700">Phone Number</label>
              <Input
                placeholder="Phone Number"
                value={form.phoneNumber}
                onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })}
                className="h-10 rounded-xl border-slate-200 bg-white"
              />
            </div>

            {/* Centre + Department */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-700">Centre</label>
                <Select
                  value={String(form.centreId)}
                  onValueChange={(v) => setForm({ ...form, centreId: Number(v) })}
                >
                  <SelectTrigger className="h-10 rounded-xl border-slate-200 bg-white">
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
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-700">Department</label>
                <Select
                  value={form.departmentId ? String(form.departmentId) : ""}
                  onValueChange={(v) => {
                    setForm({ ...form, departmentId: Number(v) });
                    setError("");
                  }}
                >
                  <SelectTrigger
                    className={`h-10 rounded-xl border-slate-200 bg-white ${
                      error ? "border-red-500 focus:ring-red-500" : ""
                    }`}
                  >
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
                {error && <p className="text-sm text-red-600">{error}</p>}
              </div>
            </div>

            {/* Role / Type / Status */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-700">Role</label>
                <Select
                  value={form.role}
                  onValueChange={(v: Role) => setForm({ ...form, role: v })}
                  disabled={userTypeScope !== "HQ"}
                >
                  <SelectTrigger className="h-10 rounded-xl border-slate-200 bg-white">
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
                {userTypeScope !== "HQ" && (
                  <p className="text-xs text-slate-500">Role changes restricted to HQ.</p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-700">User Type</label>
                {userTypeScope === "HQ" ? (
                  <Select
                    value={form.userType}
                    onValueChange={(v: UserType) => setForm({ ...form, userType: v })}
                  >
                    <SelectTrigger className="h-10 rounded-xl border-slate-200 bg-white">
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
                    className="h-10 rounded-xl border-slate-200 bg-slate-100 cursor-not-allowed"
                  />
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-700">Status</label>
                <Select
                  value={form.status}
                  onValueChange={(v: Status) => setForm({ ...form, status: v })}
                >
                  <SelectTrigger className="h-10 rounded-xl border-slate-200 bg-white">
                    <SelectValue placeholder="Select Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">ACTIVE</SelectItem>
                    <SelectItem value="INACTIVE">INACTIVE</SelectItem>
                    <SelectItem value="PENDING">PENDING</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-5 border-t border-slate-200/70">
              <Button
                type="button"
                variant="outline"
                className="h-10 rounded-xl border-slate-200 bg-white"
                onClick={() => router.push("/user/admin/users")}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="h-10 rounded-xl bg-slate-900 text-white hover:bg-slate-800 shadow-sm"
              >
                Update
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  </div>
);

}
