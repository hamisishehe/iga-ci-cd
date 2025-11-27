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
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Label } from "recharts";

// ===== Enums (match backend exactly) =====
const ROLES = [
  "ADMIN",
  "MANAGER",
  "CASHIER",
  "STAFF",
  "DG",
  "DF",
  "RFM",
  "CHIEF_ACCOUNTANT",
  "ACCOUNTANT",
] as const;

const USER_TYPES = ["CENTRE", "ZONE", "HQ"] as const;
const STATUS = ["ACTIVE", "INACTIVE"] as const;

// ===== Interfaces =====
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
  role: (typeof ROLES)[number];
  userType: (typeof USER_TYPES)[number];
  status: (typeof STATUS)[number];
}

// ===== Component =====
export default function AddUserPage() {
  const router = useRouter();
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api";

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
    role: "STAFF",
    userType: "CENTRE",
    status: "ACTIVE",
  });

  // ===== Fetch Centres & Departments =====
  useEffect(() => {
    fetchCentres();
    fetchDepartments();
  }, []);

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

  // ===== Handlers =====
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelect = <K extends keyof UserForm>(
    name: K,
    value: UserForm[K]
  ) => {
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`${apiUrl}/users/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (res.ok) {
        Swal.fire("Reset!", "User Account Created.", "success");
        router.push("/user/admin/users");
      } else {
        Swal.fire("Error!", "Something went wrong. Please try again.", "error");
      }
    } catch {
      Swal.fire("Error!", "Something went wrong. Please try again.", "error");
    } finally {
      setLoading(false);
    }
  };

  // ===== UI =====
  return (
    <div className="mx-auto p-8 w-full">
      {/* Breadcrumb */}
      <Breadcrumb className="mb-6">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/user/admin/dashboard">
              Dashboard
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href="/user/admin/users">Users</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>Add User</BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <Card className="shadow-lg border border-gray-100 rounded-2xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-semibold text-gray-800 text-start">
            Add New User
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
            <Input
              name="firstName"
              placeholder="First Name"
              value={form.firstName}
              onChange={handleChange}
            />
            <Input
              name="middleName"
              placeholder="Middle Name"
              value={form.middleName}
              onChange={handleChange}
            />
            <Input
              name="lastName"
              placeholder="Last Name"
              value={form.lastName}
              onChange={handleChange}
            />
            <Input
              name="userName"
              placeholder="Username"
              value={form.userName}
              onChange={handleChange}
            />
            <Input
              name="email"
              type="email"
              placeholder="Email"
              value={form.email}
              onChange={handleChange}
            />
            <Input
              name="phoneNumber"
              placeholder="Phone Number"
              value={form.phoneNumber}
              onChange={handleChange}
            />
            <Input
              name="password"
              type="password"
              placeholder="Password"
              value={form.password}
              onChange={handleChange}
            />

            {/* Centre Select */}
            <div className="flex flex-row">

              <h1 className=" py-1 px-3 text-black">Centre : </h1>

              <Select
                onValueChange={(v) => handleSelect("centreId", v)}
                value={form.centreId}
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
            </div>

            {/* Department Select */}
            <div className="flex flex-row">

              <h1 className=" py-1 px-3 text-black">Department : </h1>
            <Select 
            
              onValueChange={(v) => handleSelect("departmentId", v)}
              value={form.departmentId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select Department" />
              </SelectTrigger>
              <SelectContent >
                {departments.map((d) => (
                  <SelectItem key={d.id} value={String(d.id)} >
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            </div>

            {/* Role */}
            <div className="flex flex-row">

              <h1 className=" py-1 px-3 text-black">Role : </h1>
            <Select
              onValueChange={(v) => handleSelect("role", v as UserForm["role"])}
              value={form.role}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select Role" />
              </SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            </div>

            {/* User Type */}
            <div className="flex flex-row">

              <h1 className=" py-1 px-3 text-black">User Type : </h1>
            <Select
              onValueChange={(v) =>
                handleSelect("userType", v as UserForm["userType"])
              }
              value={form.userType}
            >
              <SelectTrigger>
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
            <div className="flex flex-row">

              <h1 className=" py-1 px-3 text-black">Centre : </h1>
            <Select
              onValueChange={(v) =>
                handleSelect("status", v as UserForm["status"])
              }
              value={form.status}
            >
              <SelectTrigger>
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

            {/* Submit Buttons */}
            <div className="col-span-2 flex justify-end gap-3 mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/users")}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Saving..." : "Save User"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
