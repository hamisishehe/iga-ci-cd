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
  const apiUrl =
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api";

  const [users, setUsers] = useState<User[]>([]);
  const [centres, setCentres] = useState<Centre[]>([]);
  const [search, setSearch] = useState("");
  const [centreFilter, setCentreFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 5;

  /* ================= FETCH ================= */

  const fetchUsers = async () => {
    try {
      const res = await fetch(`${apiUrl}/users/get`);
      if (!res.ok) throw new Error();
      const data: User[] = await res.json();
      setUsers(filterUsersByScope(data));
    } catch {
      toast("Error loading users");
    }
  };

  const fetchCentres = async () => {
    try {
      const res = await fetch(`${apiUrl}/centre/get`);
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
          { method: "PUT" }
        );
        res.ok
          ? Swal.fire("Done", "Password reset", "success")
          : Swal.fire("Error", "Failed", "error");
      } catch {
        toast("Something went wrong");
      }
    }
  };

  /* ================= UI ================= */

  return (
    <div className="space-y-6 p-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/user/admin/dashboard">
              Dashboard
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>Users</BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Users Management</h2>
        <Button
          className="bg-blue-800"
          onClick={() => router.push("users/add")}
        >
          Add User
        </Button>
      </div>

      {/* FILTERS */}
      <div className="flex gap-2">
        <Input
          placeholder="Search users..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setCurrentPage(1);
          }}
          className="max-w-sm"
        />

        <Select
          value={centreFilter}
          onValueChange={(v) => {
            setCentreFilter(v);
            setCurrentPage(1);
          }}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by centre" />
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

      {/* TABLE */}
      <div className="overflow-x-auto border rounded-xl">
        <table className="w-full">
          <thead className="bg-gray-100 text-sm">
            <tr>
              <th className="p-3 text-left">#</th>
              <th className="p-3 text-left">Name</th>
              <th className="p-3 text-left">Email</th>
              <th className="p-3 text-left">Role</th>
              <th className="p-3 text-left">Centre</th>
              <th className="p-3 text-left">Zone</th>
              <th className="p-3 text-left">Status</th>
              <th className="p-3 text-left">Reset</th>
            </tr>
          </thead>
          <tbody>
            {paginatedUsers.length ? (
              paginatedUsers.map((u, i) => (
                <tr key={u.id} className="border-t">
                  <td className="p-3">{startIndex + i + 1}</td>
                  <td className="p-3">
                    {u.firstName} {u.lastName}
                  </td>
                  <td className="p-3">{u.email}</td>
                  <td className="p-3">{u.role}</td>
                  <td className="p-3">{u.centres?.name ?? "-"}</td>
                  <td className="p-3">{u.centres?.zones?.name ?? "-"}</td>
                  <td className="p-3">
                    {u.status === "ACTIVE" ? "Active" : "Inactive"}
                  </td>
                  <td className="p-3">

                     <Button
                      className="bg-blue-800 hover:bg-blue-900 text-white mx-3"
                      size="sm"
                      onClick={() => router.push(`users/edit/${u.id}`)}
                    >
                      Edit
                    </Button>


                    <Button
                      size="sm"
                      className="bg-yellow-500"
                      onClick={() => handleResetPassword(u.id)}
                    >
                      Reset
                    </Button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={8} className="p-6 text-center text-gray-500">
                  No users found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* PAGINATION */}
      <div className="flex justify-between items-center">
        <span className="text-sm">
          Page {currentPage} of {totalPages}
        </span>
        <div className="flex gap-2">
          <Button
            variant="outline"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((p) => p - 1)}
          >
            Prev
          </Button>
          <Button
            variant="outline"
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
