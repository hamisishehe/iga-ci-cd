"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Swal from "sweetalert2";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectValue,
  SelectItem,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Card, CardContent } from "@/components/ui/card";

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

  if (auth.userType === "HQ") return users;

  if (auth.userType === "ZONE") {
    return users.filter(
      (u) => u.centres?.zones?.name === auth.zone
    );
  }

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

export default function UsersPage() {
  const router = useRouter();
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "/api";

  const [users, setUsers] = useState<User[]>([]);
  const [centres, setCentres] = useState<Centre[]>([]);
  const [search, setSearch] = useState("");
  const [centreFilter, setCentreFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 5;

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
      toast("Error loading users");
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
      toast("Error loading centres");
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchCentres();
  }, []);

  /* ================= FILTER + PAGINATION ================= */

  const filteredUsers = users.filter((u) => {
    const matchSearch =
      `${u.firstName} ${u.lastName}`
        .toLowerCase()
        .includes(search.toLowerCase());

    const matchCentre =
      !centreFilter ||
      centreFilter === "all" ||
      u.centres?.id === Number(centreFilter);

    return matchSearch && matchCentre;
  });

  const totalPages = Math.ceil(filteredUsers.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const paginatedUsers = filteredUsers.slice(
    startIndex,
    startIndex + rowsPerPage
  );

  /* ================= ACTIONS ================= */

  const handleResetPassword = async (userId: number) => {

      const token = localStorage.getItem("authToken");
    const apiKey = process.env.NEXT_PUBLIC_API_KEY;

    if (!token || !apiKey) {
      toast("Missing authentication credentials");
      return;
    }


    const result = await Swal.fire({
      title: "Reset Password?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, reset",
    });

    if (result.isConfirmed) {
      try {
        const res = await fetch(
          `${apiUrl}/users/reset-password/${userId}`,
          {
            method: "PUT",
            headers: {
              "Authorization": `Bearer ${token}`,
              "X-API-KEY": apiKey,
            }
          }
        );

        if (res.ok) {
          Swal.fire("Done", "Password reset", "success");
        } else {
          Swal.fire("Error", "Failed", "error");
        }
      } catch {
        toast("Something went wrong");
      }
    }
  };

  /* ================= UI ================= */

 return (
  <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50">
    <div className="space-y-6 p-6">
      {/* Breadcrumb */}
      <Breadcrumb>
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
          <BreadcrumbItem className="text-slate-600">Users</BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
            Users Management
          </h2>
          <p className="text-sm text-slate-600">
            Search, filter by centre and manage user accounts.
          </p>
        </div>

        <Button
          className="h-10 rounded-xl bg-slate-900 text-white hover:bg-slate-800 shadow-sm"
          onClick={() => router.push("users/add")}
        >
          Add User
        </Button>
      </div>

      {/* Filters */}
      <Card className="relative overflow-hidden rounded-2xl border-slate-200/60 bg-white shadow-sm">
        <div className="absolute inset-0 bg-gradient-to-br from-sky-500/8 via-transparent to-indigo-500/8" />
        <CardContent className="relative p-5">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
            <div className="md:col-span-7 space-y-1.5">
              <label className="text-xs font-medium text-slate-700">
                Search users
              </label>
              <Input
                placeholder="Search by name, email or role..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
                className="h-10 rounded-xl border-slate-200 bg-white"
              />
            </div>

            <div className="md:col-span-4 space-y-1.5">
              <label className="text-xs font-medium text-slate-700">
                Filter by centre
              </label>
              <Select
                value={centreFilter}
                onValueChange={(v) => {
                  setCentreFilter(v);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="h-10 rounded-xl border-slate-200 bg-white">
                  <SelectValue placeholder="All Centres" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Centres</SelectItem>
                  {centres.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="md:col-span-1">
              <div className="h-10 rounded-xl border border-slate-200 bg-white px-3 flex items-center justify-center text-xs text-slate-600">
                {paginatedUsers.length}/{users.length}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="rounded-2xl border-slate-200/60 bg-white shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto rounded-2xl">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 bg-slate-900 text-white">
                <tr>
                  <th className="p-3 text-left font-medium">#</th>
                  <th className="p-3 text-left font-medium">Name</th>
                  <th className="p-3 text-left font-medium">Email</th>
                  <th className="p-3 text-left font-medium">Role</th>
                  <th className="p-3 text-left font-medium">Centre</th>
                  <th className="p-3 text-left font-medium">Zone</th>
                  <th className="p-3 text-left font-medium">Status</th>
                  <th className="p-3 text-left font-medium">Actions</th>
                </tr>
              </thead>

              <tbody>
                {paginatedUsers.length ? (
                  paginatedUsers.map((u, i) => {
                    const active = u.status === "ACTIVE";
                    return (
                      <tr
                        key={u.id}
                        className="border-t border-slate-200/70 hover:bg-slate-50"
                      >
                        <td className="p-3 text-slate-700">
                          {startIndex + i + 1}
                        </td>

                        <td className="p-3">
                          <div className="font-medium text-slate-900">
                            {u.firstName} {u.lastName}
                          </div>
                        </td>

                        <td className="p-3 text-slate-700">{u.email}</td>
                        <td className="p-3 text-slate-700">{u.role}</td>
                        <td className="p-3 text-slate-700">{u.centres?.name ?? "-"}</td>
                        <td className="p-3 text-slate-700">{u.centres?.zones?.name ?? "-"}</td>

                        <td className="p-3">
                          <span
                            className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-medium ${
                              active
                                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                : "border-amber-200 bg-amber-50 text-amber-700"
                            }`}
                          >
                            <span
                              className={`h-2 w-2 rounded-full ${
                                active ? "bg-emerald-500" : "bg-amber-500"
                              }`}
                            />
                            {active ? "Active" : "Inactive"}
                          </span>
                        </td>

                        <td className="p-3">
                          <div className="flex flex-wrap gap-2">
                            <Button
                              size="sm"
                              className="h-9 rounded-xl bg-slate-900 text-white hover:bg-slate-800"
                              onClick={() => router.push(`users/edit/${u.id}`)}
                            >
                              Edit
                            </Button>

                            <Button
                              size="sm"
                              className="h-9 rounded-xl bg-amber-500 text-white hover:bg-amber-600"
                              onClick={() => handleResetPassword(u.id)}
                            >
                              Reset
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={8} className="p-10 text-center text-slate-500">
                      No users found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <span className="text-sm text-slate-600">
          Page <span className="font-semibold text-slate-900">{currentPage}</span> of{" "}
          <span className="font-semibold text-slate-900">{totalPages}</span>
        </span>

        <div className="flex gap-2">
          <Button
            variant="outline"
            className="h-10 rounded-xl border-slate-200 bg-white"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((p) => p - 1)}
          >
            Prev
          </Button>
          <Button
            variant="outline"
            className="h-10 rounded-xl border-slate-200 bg-white"
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  </div>
);

}
