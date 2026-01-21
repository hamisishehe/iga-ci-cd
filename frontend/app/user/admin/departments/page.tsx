"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import Swal from "sweetalert2";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Card, CardContent } from "@/components/ui/card";

/* ===================== INTERFACE ===================== */

interface Department {
  id: number;
  name: string;
}

/* ===================== COMPONENT ===================== */

export default function DepartmentPage() {
  const apiUrl =
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api";

  const [departments, setDepartments] = useState<Department[]>([]);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage] = useState(5);

  /* ===================== FETCH ===================== */

  useEffect(() => {
    fetchDepartments();
  }, []);

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
      if (res.ok) {
        setDepartments(await res.json());
      }
    } catch {
      toast.error("Error loading departments");
    }
  };

  /* ===================== ADD ===================== */

  const handleAddDepartment = async () => {
    const result = await Swal.fire({
      title: "Add Department",
      input: "text",
      inputLabel: "Department Name",
      inputPlaceholder: "Enter department name",
      showCancelButton: true,
      confirmButtonText: "Save",
      preConfirm: (value) => {
        if (!value) {
          Swal.showValidationMessage("Department name is required");
        }
        return value;
      },
    });

    if (!result.isConfirmed) return;

    try {
      
           const token = localStorage.getItem("authToken");
    const apiKey = process.env.NEXT_PUBLIC_API_KEY;

    if (!token || !apiKey) {
      toast("Missing authentication credentials");
      return;
    }

      const res = await fetch(`${apiUrl}/department/create`, {
        method: "POST",
           headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`, 
        "X-API-KEY": apiKey,              
      },
        body: JSON.stringify({ name: result.value }),
      });

      if (res.ok) {
        toast.success("Department added successfully");
        fetchDepartments();
      } else {
        toast.error("Failed to add department");
      }
    } catch {
      toast.error("Error adding department");
    }
  };

  /* ===================== EDIT ===================== */

  const handleEditDepartment = async (department: Department) => {
    const result = await Swal.fire({
      title: "Edit Department",
      input: "text",
      inputValue: department.name,
      showCancelButton: true,
      confirmButtonText: "Update",
      preConfirm: (value) => {
        if (!value) {
          Swal.showValidationMessage("Department name is required");
        }
        return value;
      },
    });

    if (!result.isConfirmed) return;

    try {

       
           const token = localStorage.getItem("authToken");
    const apiKey = process.env.NEXT_PUBLIC_API_KEY;

    if (!token || !apiKey) {
      toast("Missing authentication credentials");
      return;
    }

      const res = await fetch(
        `${apiUrl}/department/update/${department.id}`,
        {
          method: "PUT",
             headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`, 
        "X-API-KEY": apiKey,              
      },
          body: JSON.stringify({ name: result.value }),
        }
      );

      if (res.ok) {
        toast.success("Department updated");
        fetchDepartments();
      } else {
        toast.error("Update failed");
      }
    } catch {
      toast.error("Error updating department");
    }
  };

  /* ===================== FILTER + PAGINATION ===================== */

  const filtered = departments.filter((d) =>
    d.name.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.ceil(filtered.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const paginated = filtered.slice(startIndex, startIndex + rowsPerPage);

  const nextPage = () =>
    currentPage < totalPages && setCurrentPage((p) => p + 1);
  const prevPage = () =>
    currentPage > 1 && setCurrentPage((p) => p - 1);

  /* ===================== UI ===================== */

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
          <BreadcrumbItem className="text-slate-600">Departments</BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
            Department Management
          </h2>
          <p className="text-sm text-slate-600">
            Create and manage departments used across the system.
          </p>
        </div>

        <Button
          onClick={handleAddDepartment}
          className="h-10 rounded-xl bg-slate-900 text-white hover:bg-slate-800 shadow-sm"
        >
          Add Department
        </Button>
      </div>

      {/* Search */}
      <Card className="relative overflow-hidden rounded-2xl border-slate-200/60 bg-white shadow-sm">
        <div className="absolute inset-0 bg-gradient-to-br from-sky-500/8 via-transparent to-indigo-500/8" />
        <CardContent className="relative p-5">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
            <div className="md:col-span-10 space-y-1.5">
              <label className="text-xs font-medium text-slate-700">
                Search department
              </label>
              <Input
                placeholder="Search by department name..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
                className="h-10 rounded-xl border-slate-200 bg-white"
              />
            </div>

            <div className="md:col-span-2">
              <div className="h-10 rounded-xl border border-slate-200 bg-white px-3 flex items-center justify-center text-xs text-slate-600">
                {paginated.length}/{filtered.length}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="rounded-2xl border-slate-200/60 bg-white shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto rounded-2xl">
            <table className="min-w-full text-sm">
              <thead className="sticky top-0 z-10 bg-slate-900 text-white">
                <tr>
                  <th className="p-3 text-left font-medium">#</th>
                  <th className="p-3 text-left font-medium">Name</th>
                  <th className="p-3 text-left font-medium">Action</th>
                </tr>
              </thead>

              <tbody>
                {paginated.length ? (
                  paginated.map((d, i) => (
                    <tr
                      key={d.id}
                      className="border-t border-slate-200/70 hover:bg-slate-50"
                    >
                      <td className="p-3 text-slate-700">{startIndex + i + 1}</td>
                      <td className="p-3">
                        <div className="font-medium text-slate-900">{d.name}</div>
                      </td>
                      <td className="p-3">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-9 rounded-xl border-slate-200 bg-white"
                          onClick={() => handleEditDepartment(d)}
                        >
                          Edit
                        </Button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="py-10 text-center text-slate-500">
                      No Department found
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
          Showing{" "}
          <span className="font-semibold text-slate-900">
            {filtered.length ? startIndex + 1 : 0}
          </span>
          –{" "}
          <span className="font-semibold text-slate-900">
            {Math.min(startIndex + rowsPerPage, filtered.length)}
          </span>{" "}
          of <span className="font-semibold text-slate-900">{filtered.length}</span>
        </span>

        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            className="h-10 rounded-xl border-slate-200 bg-white"
            disabled={currentPage === 1}
            onClick={prevPage}
          >
            Prev
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-10 rounded-xl border-slate-200 bg-white"
            disabled={currentPage === totalPages}
            onClick={nextPage}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  </div>
);

}
