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

/* ================= CONSTANTS ================= */

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
    role: "ACCOUNTANT",
    userType: "CENTRE",
    status: "ACTIVE",
  });

  /* ================= ROLE FILTER ================= */

  const allowedRoles =
    auth.userType === "HQ" ? ROLES : FINANCE_ROLES;

  /* ================= AUTO LOCK ROLE ================= */

  useEffect(() => {
    if (auth.userType !== "HQ") {
      setForm((p) => ({
        ...p,
        role: "ACCOUNTANT",
      }));
    }
  }, []);

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
    <div className="p-8">
      <Breadcrumb className="mb-6">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/user/admin/dashboard">
              Dashboard
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>Add User</BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <Card>
        <CardHeader>
          <CardTitle>Add New User</CardTitle>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
            <Input name="firstName" placeholder="First Name" onChange={handleChange} />
            <Input name="middleName" placeholder="Middle Name" onChange={handleChange} />
            <Input name="lastName" placeholder="Last Name" onChange={handleChange} />
            <Input name="userName" placeholder="Username" onChange={handleChange} />
            <Input name="email" type="email" placeholder="Email" onChange={handleChange} />
            <Input name="phoneNumber" placeholder="Phone" onChange={handleChange} />
            <Input name="password" type="password" placeholder="Password" onChange={handleChange} />

            {/* CENTRE */}
            <Select value={form.centreId} onValueChange={(v) => handleSelect("centreId", v)}>
              <SelectTrigger><SelectValue placeholder="Select Centre" /></SelectTrigger>
              <SelectContent>
                {centres.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* DEPARTMENT */}
            <Select value={form.departmentId} onValueChange={(v) => handleSelect("departmentId", v)}>
              <SelectTrigger><SelectValue placeholder="Select Department" /></SelectTrigger>
              <SelectContent>
                {departments.map((d) => (
                  <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* ROLE */}
            <Select value={form.role} onValueChange={(v) => handleSelect("role", v as any)}>
              <SelectTrigger><SelectValue placeholder="Select Role" /></SelectTrigger>
              <SelectContent>
                {allowedRoles.map((r) => (
                  <SelectItem key={r} value={r}>{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>

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


            {/* STATUS */}
            <Select value={form.status} onValueChange={(v) => handleSelect("status", v as any)}>
              <SelectTrigger><SelectValue placeholder="Select Status" /></SelectTrigger>
              <SelectContent>
                {STATUS.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="col-span-2 flex justify-end gap-3 mt-4">
              <Button type="button" variant="outline" onClick={() => router.back()}>
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
