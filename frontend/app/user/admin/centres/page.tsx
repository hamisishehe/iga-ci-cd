"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Swal from "sweetalert2";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

/* ===================== TYPES ===================== */

interface Zone {
  id: number;
  name: string;
  code: string;
}

interface Centre {
  id: number;
  name: string;
  rank: string;
  code: string;
  zones: Zone;
}

/* ===================== CONSTANTS ===================== */

const ROWS_PER_PAGE = 5;

/* ===================== COMPONENT ===================== */

export default function CentresPage() {
  const router = useRouter();

  const API_URL =
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api";

  /* ===================== STATE ===================== */

  const [centres, setCentres] = useState<Centre[]>([]);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  /* ===================== FETCH CENTRES ===================== */

  useEffect(() => {
    loadCentres();
  }, []);

  const loadCentres = async () => {
    try {

       const token = localStorage.getItem("authToken");
        const apiKey = process.env.NEXT_PUBLIC_API_KEY;
    
        if (!token || !apiKey) {
          toast("Missing authentication credentials");
          return;
        }

        
      const res = await fetch(`${API_URL}/centre/get`, {
        method: "GET",
           headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`, 
        "X-API-KEY": apiKey,              
      },
      });
      if (!res.ok) throw new Error();

      const data = await res.json();
      setCentres(data);
    } catch {
      toast.error("Failed to load centres");
    }
  };

  /* ===================== UPDATE CENTRE ===================== */

  const handleEditCentre = async (centre: Centre) => {
    const zoneOptions = centres
      .map(
        (c) =>
          `<option value="${c.zones.id}" ${
            c.zones.id === centre.zones.id ? "selected" : ""
          }>
            ${c.zones.name}
          </option>`
      )
      .join("");

    const result = await Swal.fire({
      title: "Update Centre",
      html: `
        <input id="name" class="swal2-input" value="${centre.name}" placeholder="Centre Name" />
        <input id="rank" class="swal2-input" value="${centre.rank}" placeholder="Rank" />
        <select id="zone" class="swal2-select">
          ${zoneOptions}
        </select>
      `,
      showCancelButton: true,
      confirmButtonText: "Update",
      focusConfirm: false,
      preConfirm: () => {
        const name = (document.getElementById("name") as HTMLInputElement).value;
        const rank = (document.getElementById("rank") as HTMLInputElement).value;
        const zoneId = (document.getElementById("zone") as HTMLSelectElement).value;

        if (!name || !rank || !zoneId) {
          Swal.showValidationMessage("All fields are required");
          return;
        }

        return { name, rank, zoneId: Number(zoneId) };
      },
    });

    if (!result.isConfirmed || !result.value) return;

    try {
        const token = localStorage.getItem("authToken");
        const apiKey = process.env.NEXT_PUBLIC_API_KEY;
    
        if (!token || !apiKey) {
          toast("Missing authentication credentials");
          return;
        }

      const res = await fetch(`${API_URL}/centre/update/${centre.id}`, {
        method: "PUT",
           headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`, 
        "X-API-KEY": apiKey,              
      },
        body: JSON.stringify({
          name: result.value.name,
          rank: result.value.rank,
          zone_id: result.value.zoneId,
        }),
      });

      if (!res.ok) throw new Error();

      toast.success("Centre updated successfully");
      loadCentres();
    } catch {
      toast.error("Failed to update centre");
    }
  };

  /* ===================== FILTER + PAGINATION ===================== */

  const filteredCentres = centres.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.ceil(filteredCentres.length / ROWS_PER_PAGE);
  const startIndex = (currentPage - 1) * ROWS_PER_PAGE;

  const paginatedCentres = filteredCentres.slice(
    startIndex,
    startIndex + ROWS_PER_PAGE
  );

  /* ===================== UI ===================== */

  return (
    <div className="space-y-6 p-6">
      {/* Breadcrumb */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/user/admin/dashboard">
              Dashboard
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>Centres</BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <h2 className="text-xl font-semibold">Centres Management</h2>

      {/* Search */}
      <Input
        placeholder="Search centre..."
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
              <th className="p-3 text-left">Rank</th>
              <th className="p-3 text-left">Zone</th>
              <th className="p-3 text-left">Action</th>
            </tr>
          </thead>

          <tbody>
            {paginatedCentres.length ? (
              paginatedCentres.map((c, i) => (
                <tr key={c.id} className="border-t hover:bg-gray-50">
                  <td className="p-3">{startIndex + i + 1}</td>
                  <td className="p-3">{c.name}</td>
                  <td className="p-3">{c.rank}</td>
                  <td className="p-3">{c.zones?.name}</td>
                  <td className="p-3">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEditCentre(c)}
                    >
                      Edit
                    </Button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="py-6 text-center text-gray-500">
                  No centres found
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
          {Math.min(startIndex + ROWS_PER_PAGE, filteredCentres.length)} of{" "}
          {filteredCentres.length}
        </span>

        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((p) => p - 1)}
          >
            Prev
          </Button>
          <Button
            size="sm"
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
