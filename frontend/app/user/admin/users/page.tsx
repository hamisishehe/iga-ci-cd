"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import Swal from "sweetalert2";
import { Select, SelectTrigger, SelectContent, SelectValue, SelectItem } from "@/components/ui/select";
import { toast } from "sonner";
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbSeparator } from "@/components/ui/breadcrumb";

interface Centre {
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

export default function UsersPage() {
  const router = useRouter();
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api";

  const [users, setUsers] = useState<User[]>([]);
  const [centres, setCentres] = useState<Centre[]>([]);
  const [search, setSearch] = useState("");
  const [centreFilter, setCentreFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(5);

  useEffect(() => {
    fetchUsers();
    fetchCentres();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await fetch(`${apiUrl}/users/get`);
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch {
      toast("Error loading users");
    }
  };

  const fetchCentres = async () => {
    try {
      const res = await fetch(`${apiUrl}/centre/get`);
      if (res.ok) {
        const data = await res.json();
        setCentres(data);
      }
    } catch {
      toast("Error loading centres");
    }
  };

  // Filters + Pagination
  const filteredUsers = users.filter((u) => {
    const matchSearch = `${u.firstName} ${u.lastName}`.toLowerCase().includes(search.toLowerCase());
    const matchCentre = centreFilter === "all" || !centreFilter || u.centres?.id === parseInt(centreFilter);
    return matchSearch && matchCentre;
  });

  const totalPages = Math.ceil(filteredUsers.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const paginatedUsers = filteredUsers.slice(startIndex, startIndex + rowsPerPage);

  // Pagination controls
  const nextPage = () => currentPage < totalPages && setCurrentPage((p) => p + 1);
  const prevPage = () => currentPage > 1 && setCurrentPage((p) => p - 1);


   const handleResetPassword = async (userId: number) => {
    const result = await Swal.fire({
      title: "Reset Password?",
      text: "Are you sure you want to reset this user's password?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#f59e0b", // yellow
      cancelButtonColor: "#6b7280", // gray
      confirmButtonText: "Yes, reset it!",
      cancelButtonText: "Cancel",
      reverseButtons: true,
    });

    if (result.isConfirmed) {
      
       try {
      const res = await fetch(`${apiUrl}/users/reset-password/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
      });

      if (res.ok) {
        Swal.fire("Reset!", "User password has been reset.", "success");
      } else {
        Swal.fire("Reset!", "Something went wrong. Please try again.", "error");
      }
    } catch {
      toast("Something went wrong. Please try again.");
    }

      
    }
  };

  const handleDeleteUser = async (userId: number) => {
    const result = await Swal.fire({
      title: "Delete User?",
      text: "This action cannot be undone.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc2626", // red
      cancelButtonColor: "#6b7280", // gray
      confirmButtonText: "Yes, delete it!",
      cancelButtonText: "Cancel",
      reverseButtons: true,
    });

    if (result.isConfirmed) {
      // your delete logic
      toast.success("User deleted successfully!");
      Swal.fire("Deleted!", "User has been removed.", "success");
    }
  };

  return (
    <div className="space-y-6 p-6">
      <Breadcrumb className="mb-6">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/user/admin/dashboard">
              Dashboard
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>users</BreadcrumbItem>
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

      {/* Filters */}
      <div className="flex gap-2 mb-4">
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

      {/* Table */}
      <div className="overflow-x-auto border rounded-xl">
        <table className="min-w-full border-collapse shadow-sm rounded-lg overflow-hidden">
          <thead className="bg-gray-100 text-gray-700 uppercase text-sm">
            <tr>
              <th className="p-3 text-left">#</th>
              <th className="p-3 text-left">Name</th>
              <th className="p-3 text-left">Email</th>
              <th className="p-3 text-left">Role</th>
              <th className="p-3 text-left">Centre</th>
              <th className="p-3 text-left">Status</th>
              <th className="p-3 text-left">Actions</th>
              <th className="p-3 text-left">Reset Password</th>
            </tr>
          </thead>
          <tbody>
            {paginatedUsers.length ? (
              paginatedUsers.map((u, i) => (
                <tr
                  key={u.id}
                  className="border-t hover:bg-gray-50 transition-all duration-200"
                >
                  <td className="p-3">{startIndex + i + 1}</td>
                  <td className="p-3 font-medium text-gray-900">
                    {u.firstName} {u.lastName}
                  </td>
                  <td className="p-3 text-gray-700">{u.email}</td>
                  <td className="p-3">{u.role}</td>
                  <td className="p-3">{u.centres?.name || "-"}</td>
                  <td className="p-3">
                    {u.status === "ACTIVE" ? (
                      <span className="px-3 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                        Active
                      </span>
                    ) : (
                      <span className="px-3 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                        Inactive
                      </span>
                    )}
                  </td>

                 

                  {/* Actions column */}
                  <td className="p-3 flex gap-2">
                    <Button
                      className="bg-blue-800 hover:bg-blue-900 text-white"
                      size="sm"
                      onClick={() => router.push(`users/edit/${u.id}`)}
                    >
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDeleteUser(u.id)}
                    >
                      Delete
                    </Button>
                  </td>
                   {/* Reset Password column */}
                  <td className="p-3">
                    <Button
                      size="sm"
                      className="bg-yellow-500 hover:bg-yellow-600 text-white"
                      onClick={() => handleResetPassword(u.id)}
                    >
                      Reset
                    </Button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={8}
                  className="text-center py-6 text-gray-500 italic"
                >
                  No users found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex justify-between items-center mt-4">
        <div className="text-sm text-gray-600">
          Showing {startIndex + 1}–
          {Math.min(startIndex + rowsPerPage, filteredUsers.length)} of{" "}
          {filteredUsers.length} users
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage === 1}
            onClick={prevPage}
          >
            Prev
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage === totalPages}
            onClick={nextPage}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
