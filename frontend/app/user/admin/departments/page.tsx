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
      const res = await fetch(`${apiUrl}/department/get`);
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
      const res = await fetch(`${apiUrl}/department/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
      const res = await fetch(
        `${apiUrl}/department/update/${department.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
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
    <div className="space-y-6 p-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/user/admin/dashboard">
              Dashboard
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>Departments</BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Department Management</h2>
        <Button onClick={handleAddDepartment}>Add Department</Button>
      </div>

      <Input
        placeholder="Search department..."
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setCurrentPage(1);
        }}
        className="max-w-sm"
      />

      {/* Table */}
      <div className="overflow-x-auto border rounded-xl">
        <table className="min-w-full">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-3 text-left">#</th>
              <th className="p-3 text-left">Name</th>
              <th className="p-3 text-left">Action</th>
            </tr>
          </thead>
          <tbody>
            {paginated.length ? (
              paginated.map((d, i) => (
                <tr key={d.id} className="border-t hover:bg-gray-50">
                  <td className="p-3">{startIndex + i + 1}</td>
                  <td className="p-3">{d.name}</td>
                  <td className="p-3">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEditDepartment(d)}
                    >
                      Edit
                    </Button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={3} className="py-6 text-center text-gray-500">
                  No Department found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex justify-between items-center">
        <span className="text-sm text-gray-600">
          Showing {startIndex + 1}–
          {Math.min(startIndex + rowsPerPage, filtered.length)} of{" "}
          {filtered.length}
        </span>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" disabled={currentPage === 1} onClick={prevPage}>
            Prev
          </Button>
          <Button
            size="sm"
            variant="outline"
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
