"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Swal from "sweetalert2";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";

/* ================= CONSTANTS ================= */

const ROLES = [
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
] as const;

const FINANCE_ROLES = ["ACCOUNTANT", "CHIEF_ACCOUNTANT"] as const;
const USER_TYPES = ["CENTRE", "ZONE", "HQ"] as const;
const STATUS = ["ACTIVE", "INACTIVE"] as const;

/* ================= TYPES ================= */

interface Centre {
  id: number;
  name: string;
}

interface Department {
  id: number;
  name: string;
}

interface UserForm {
  firstName: string;
  middleName: string;
  lastName: string;
  userName: string;
  email: string;
  phoneNumber: string;
  password: string;
  centreId: string;
  departmentId: string;
  role: typeof ROLES[number];
  userType: typeof USER_TYPES[number];
  status: typeof STATUS[number];
}

/* ================= AUTH SCOPE ================= */

const getAuthScope = () => ({
  userType: localStorage.getItem("userType") as UserForm["userType"],
});

/* ================= COMPONENT ================= */

export default function AddUserPage() {
  const router = useRouter();
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api";
  const auth = getAuthScope();

  const [centres, setCentres] = useState<Centre[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState<UserForm>({
    firstName: "",
    middleName: "",
    lastName: "",
    userName: "",
    email: "",
    phoneNumber: "",
    password: "",
    centreId: "",
    departmentId: "",
    role: "ACCOUNT_OFFICER",
    userType: "CENTRE",
    status: "ACTIVE",
  });

  /* ================= ROLE FILTER ================= */

  const allowedRoles =
    auth.userType === "HQ" ? ROLES : FINANCE_ROLES;

  /* ================= AUTO LOCK ROLE ================= */

  // useEffect(() => {
  //   if (auth.userType !== "HQ") {
  //     setForm((p) => ({
  //       ...p,
  //       role: "ACCOUNTANT","",
  //     }));
  //   }
  // }, []);

  /* ================= FETCH DATA ================= */

  useEffect(() => {
    fetchCentres();
    fetchDepartments();
  }, []);

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
      setCentres(await res.json());
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
      setDepartments(await res.json());
    } catch {
      toast("Error loading departments");
    }
  };

  /* ================= HANDLERS ================= */

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
  };

  const handleSelect = <K extends keyof UserForm>(
    name: K,
    value: UserForm[K]
  ) => {
    setForm((p) => ({ ...p, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
       const token = localStorage.getItem("authToken");
    const apiKey = process.env.NEXT_PUBLIC_API_KEY;

    if (!token || !apiKey) {
      toast("Missing authentication credentials");
      return;
    }


      const res = await fetch(`${apiUrl}/users/save`, {
        method: "POST",
        headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`, 
        "X-API-KEY": apiKey,              
      },
        body: JSON.stringify(form),
      });

      if (res.ok) {
        Swal.fire("Success", "User created successfully", "success");
        router.push("/user/admin/users");
      } else {
        Swal.fire("Error", "Failed to create user", "error");
      }
    } catch {
      Swal.fire("Error", "Something went wrong", "error");
    } finally {
      setLoading(false);
    }
  };

  /* ================= UI ================= */

  return (
  <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50">
    <div className="p-6 sm:p-8 space-y-6">
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
          <BreadcrumbItem className="text-slate-600">Add User</BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Page Title */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Add New User
        </h1>
        <p className="text-sm text-slate-600">
          Create a new account and assign centre, department, role and status.
        </p>
      </div>

      {/* Form Card */}
      <Card className="relative overflow-hidden rounded-2xl border-slate-200/60 bg-white shadow-sm">
        <div className="absolute inset-0 bg-gradient-to-br from-sky-500/8 via-transparent to-indigo-500/8" />

        <CardHeader className="relative">
          <CardTitle className="text-lg text-slate-900">User Details</CardTitle>
          <CardDescription className="text-slate-600">
            Fill all required fields then save.
          </CardDescription>
        </CardHeader>

        <CardContent className="relative">
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Names */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-700">First Name</label>
              <Input
                name="firstName"
                placeholder="e.g. john"
                onChange={handleChange}
                className="h-10 rounded-xl border-slate-200 bg-white"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-700">Middle Name</label>
              <Input
                name="middleName"
                placeholder="Optional"
                onChange={handleChange}
                className="h-10 rounded-xl border-slate-200 bg-white"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-700">Last Name</label>
              <Input
                name="lastName"
                placeholder="e.g. doe"
                onChange={handleChange}
                className="h-10 rounded-xl border-slate-200 bg-white"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-700">Username</label>
              <Input
                name="userName"
                placeholder="e.g. jdoe"
                onChange={handleChange}
                className="h-10 rounded-xl border-slate-200 bg-white"
              />
            </div>

            {/* Contact */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-700">Email</label>
              <Input
                name="email"
                type="email"
                placeholder="name@example.com"
                onChange={handleChange}
                className="h-10 rounded-xl border-slate-200 bg-white"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-700">Phone Number</label>
              <Input
                name="phoneNumber"
                placeholder="e.g. 07XXXXXXXX"
                onChange={handleChange}
                className="h-10 rounded-xl border-slate-200 bg-white"
              />
            </div>

            {/* Password */}
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-medium text-slate-700">Password</label>
              <Input
                name="password"
                type="password"
                placeholder="Create a strong password"
                onChange={handleChange}
                className="h-10 rounded-xl border-slate-200 bg-white"
              />
              <p className="text-xs text-slate-500">
                Tip: Use 8+ characters with letters, numbers and symbols.
              </p>
            </div>

            {/* Centre */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-700">Centre</label>
              <Select value={form.centreId} onValueChange={(v) => handleSelect("centreId", v)}>
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

            {/* Department */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-700">Department</label>
              <Select
                value={form.departmentId}
                onValueChange={(v) => handleSelect("departmentId", v)}
              >
                <SelectTrigger className="h-10 rounded-xl border-slate-200 bg-white">
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
            </div>

            {/* Role */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-700">Role</label>
              <Select value={form.role} onValueChange={(v) => handleSelect("role", v as any)}>
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
            </div>

            {/* User Type */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-700">User Type</label>
              <Select
                onValueChange={(v) => handleSelect("userType", v as UserForm["userType"])}
                value={form.userType}
              >
                <SelectTrigger className="h-10 rounded-xl border-slate-200 bg-white">
                  <SelectValue placeholder="Select User Type" />
                </SelectTrigger>
                <SelectContent>
                  {USER_TYPES.map((u) => (
                    <SelectItem key={u} value={u}>
                      {u}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Status */}
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-medium text-slate-700">Status</label>
              <Select value={form.status} onValueChange={(v) => handleSelect("status", v as any)}>
                <SelectTrigger className="h-10 rounded-xl border-slate-200 bg-white">
                  <SelectValue placeholder="Select Status" />
                </SelectTrigger>
                <SelectContent>
                  {STATUS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Actions */}
            <div className="sm:col-span-2 flex flex-col-reverse sm:flex-row justify-end gap-3 mt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                className="h-10 rounded-xl border-slate-200 bg-white"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="h-10 rounded-xl bg-slate-900 text-white hover:bg-slate-800 shadow-sm disabled:opacity-60"
              >
                {loading ? "Saving..." : "Save User"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  </div>
);

}
