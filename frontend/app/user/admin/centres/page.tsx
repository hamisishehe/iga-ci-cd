"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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

/* ===================== INTERFACES ===================== */

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

/* ===================== COMPONENT ===================== */

export default function CentresPage() {
  const router = useRouter();
  const apiUrl =
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api";

  const [centres, setCentres] = useState<Centre[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage] = useState(5);

  /* ===================== FETCH DATA ===================== */

  useEffect(() => {
    fetchCentres();
    fetchZones();
  }, []);

  const fetchCentres = async () => {
    try {
      const res = await fetch(`${apiUrl}/centre/get`);
      if (res.ok) {
        const data = await res.json();
        setCentres(data);
        console.log(data);
      }
    } catch {
      toast("Error loading centres");
    }
  };

  const fetchZones = async () => {
    try {
      const res = await fetch(`${apiUrl}/zone/get`);
      if (res.ok) {
        const data = await res.json();
        setZones(data);
        console.log(data);
      }
    } catch {
      toast("Error loading zones");
    }
  };

  /* ===================== UPDATE CENTRE ===================== */

  const handleEditCentre = async (centre: Centre) => {
    const zoneOptions = zones
      .map(
        (z) =>
          `<option value="${z.id}" ${
            z.id === centre.zones?.id ? "selected" : ""
          }>${z.name}</option>`
      )
      .join("");

    const result = await Swal.fire({
      title: "Update Centre",
      html: `
        <input id="name" class="swal2-input" placeholder="Centre Name" value="${centre.name}">
        <input id="rank" class="swal2-input" placeholder="Rank" value="${centre.rank}">
        <select id="zone" class="swal2-select">${zoneOptions}</select>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: "Update",
      preConfirm: () => {
        const name = (
          document.getElementById("name") as HTMLInputElement
        ).value;
        const rank = (
          document.getElementById("rank") as HTMLInputElement
        ).value;
        const zoneId = (
          document.getElementById("zone") as HTMLSelectElement
        ).value;

        if (!name || !rank || !zoneId) {
          Swal.showValidationMessage("All fields are required");
          return null;
        }

        return { name, rank, zoneId };
      },
    });

    if (!result.isConfirmed || !result.value) return;

    try {
      const res = await fetch(`${apiUrl}/centre/update/${centre.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: result.value.name,
          rank: result.value.rank,
          zone_id: Number(result.value.zoneId),
        }),
      });

      if (res.ok) {
        toast.success("Centre updated successfully");
        fetchCentres();
      } else {
        toast.error("Failed to update centre");
      }
    } catch {
      toast.error("Error updating centre");
    }
  };

  /* ===================== FILTER + PAGINATION ===================== */

  const filteredCentres = centres.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.ceil(filteredCentres.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const paginatedCentres = filteredCentres.slice(
    startIndex,
    startIndex + rowsPerPage
  );

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
                  No Centres found
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
          {Math.min(startIndex + rowsPerPage, filteredCentres.length)} of{" "}
          {filteredCentres.length}
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
