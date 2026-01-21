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
import { Card, CardContent } from "@/components/ui/card";

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
  zones: Zone | null; // Can be null for new centres
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
  const [zones, setZones] = useState<Zone[]>([]); // New: list of zones
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);

  /* ===================== FETCH DATA ===================== */
  useEffect(() => {
    loadCentres();
    loadZones();
  }, []);

  const loadCentres = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("authToken");
      const apiKey = process.env.NEXT_PUBLIC_API_KEY;

      if (!token || !apiKey) {
        toast.error("Missing authentication credentials");
        return;
      }

      const res = await fetch(`${API_URL}/centre/get`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "X-API-KEY": apiKey,
        },
      });

      if (!res.ok) throw new Error();
      const data = await res.json();
      setCentres(data);
    } catch {
      toast.error("Failed to load centres");
    } finally {
      setLoading(false);
    }
  };

  const loadZones = async () => {
    try {
      const token = localStorage.getItem("authToken");
      const apiKey = process.env.NEXT_PUBLIC_API_KEY;

      if (!token || !apiKey) return;

      const res = await fetch(`${API_URL}/zone/get`, { // Adjust endpoint if different
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "X-API-KEY": apiKey,
        },
      });

      if (!res.ok) throw new Error();
      const data = await res.json();
      setZones(data);
    } catch {
      toast.error("Failed to load zones");
    }
  };

  /* ===================== ADD CENTRE ===================== */
  const handleAddCentres = async () => {
    if (zones.length === 0) {
      toast.error("No zones available. Please add zones first.");
      return;
    }

    const zoneOptions = zones
      .map(
        (z) => `<option value="${z.id}">${z.name} (${z.code})</option>`
      )
      .join("");

    const result = await Swal.fire({
      title: "Add New Centre",
      html: `
        <input id="name" class="swal2-input" placeholder="Centre Name" />
        <input id="rank" class="swal2-input" placeholder="Rank (e.g., A, B)" />
        <select id="zone" class="swal2-select">
          <option value="" disabled selected>Select Zone</option>
          ${zoneOptions}
        </select>
      `,
      showCancelButton: true,
      confirmButtonText: "Save",
      focusConfirm: false,
      preConfirm: () => {
        const name = (document.getElementById("name") as HTMLInputElement).value.trim();
        const rank = (document.getElementById("rank") as HTMLInputElement).value.trim();
        const zoneId = (document.getElementById("zone") as HTMLSelectElement).value;

        if (!name || !rank || !zoneId) {
          Swal.showValidationMessage("All fields are required");
          return false;
        }
        return { name, rank, zoneId: Number(zoneId) };
      },
    });

    if (!result.isConfirmed || !result.value) return;

    try {
      const token = localStorage.getItem("authToken");
      const apiKey = process.env.NEXT_PUBLIC_API_KEY;

      if (!token || !apiKey) {
        toast.error("Missing authentication credentials");
        return;
      }

      const res = await fetch(`${API_URL}/centre/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "X-API-KEY": apiKey,
        },
        body: JSON.stringify({
          name: result.value.name,
          rank: result.value.rank,
          zone_id: result.value.zoneId,
        }),
      });

      if (res.ok) {
        toast.success("Centre added successfully");
        loadCentres();
      } else {
        const error = await res.json().catch(() => ({}));
        toast.error(error.message || "Failed to add centre");
      }
    } catch {
      toast.error("Error adding centre");
    }
  };

  /* ===================== UPDATE CENTRE ===================== */
  const handleEditCentre = async (centre: Centre) => {
    if (zones.length === 0) {
      toast.error("No zones loaded");
      return;
    }

    const zoneOptions = zones
      .map(
        (z) =>
          `<option value="${z.id}" ${z.id === centre.zones?.id ? "selected" : ""}>
            ${z.name} (${z.code})
          </option>`
      )
      .join("");

    const result = await Swal.fire({
      title: "Update Centre",
      html: `
        <input id="name" class="swal2-input" value="${centre.name}" />
        <input id="rank" class="swal2-input" value="${centre.rank}" />
        <select id="zone" class="swal2-select">
          ${zoneOptions}
        </select>
      `,
      showCancelButton: true,
      confirmButtonText: "Update",
      focusConfirm: false,
      preConfirm: () => {
        const name = (document.getElementById("name") as HTMLInputElement).value.trim();
        const rank = (document.getElementById("rank") as HTMLInputElement).value.trim();
        const zoneId = (document.getElementById("zone") as HTMLSelectElement).value;

        if (!name || !rank || !zoneId) {
          Swal.showValidationMessage("All fields are required");
          return false;
        }
        return { name, rank, zoneId: Number(zoneId) };
      },
    });

    if (!result.isConfirmed || !result.value) return;

    try {
      const token = localStorage.getItem("authToken");
      const apiKey = process.env.NEXT_PUBLIC_API_KEY;

      if (!token || !apiKey) {
        toast.error("Missing authentication credentials");
        return;
      }

      const res = await fetch(`${API_URL}/centre/update/${centre.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "X-API-KEY": apiKey,
        },
        body: JSON.stringify({
          name: result.value.name,
          rank: result.value.rank,
          zone_id: result.value.zoneId,
        }),
      });

      if (res.ok) {
        toast.success("Centre updated successfully");
        loadCentres();
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

  const totalPages = Math.ceil(filteredCentres.length / ROWS_PER_PAGE);
  const startIndex = (currentPage - 1) * ROWS_PER_PAGE;
  const paginatedCentres = filteredCentres.slice(
    startIndex,
    startIndex + ROWS_PER_PAGE
  );

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
          <BreadcrumbItem className="text-slate-600">Centres</BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
            Centre Management
          </h2>
          <p className="text-sm text-slate-600">
            Add, search and manage centres and their zones.
          </p>
        </div>

        <Button
          onClick={handleAddCentres}
          className="h-10 rounded-xl bg-slate-900 text-white hover:bg-slate-800 shadow-sm"
        >
          Add Centre
        </Button>
      </div>

      {/* Search */}
      <Card className="relative overflow-hidden rounded-2xl border-slate-200/60 bg-white shadow-sm">
        <div className="absolute inset-0 bg-gradient-to-br from-sky-500/8 via-transparent to-indigo-500/8" />
        <CardContent className="relative p-5">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
            <div className="md:col-span-10 space-y-1.5">
              <label className="text-xs font-medium text-slate-700">Search centre</label>
              <Input
                placeholder="Search by centre name, rank or zone..."
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
                {paginatedCentres.length}/{filteredCentres.length}
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
                  <th className="p-3 text-left font-medium">Rank</th>
                  <th className="p-3 text-left font-medium">Zone</th>
                  <th className="p-3 text-left font-medium">Action</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-slate-600">
                      Loading...
                    </td>
                  </tr>
                ) : paginatedCentres.length ? (
                  paginatedCentres.map((c, i) => (
                    <tr
                      key={c.id}
                      className="border-t border-slate-200/70 hover:bg-slate-50"
                    >
                      <td className="p-3 text-slate-700">{startIndex + i + 1}</td>
                      <td className="p-3">
                        <div className="font-medium text-slate-900">{c.name}</div>
                      </td>
                      <td className="p-3 text-slate-700">{c.rank}</td>
                      <td className="p-3 text-slate-700">{c.zones?.name || "-"}</td>
                      <td className="p-3">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-9 rounded-xl border-slate-200 bg-white"
                          onClick={() => handleEditCentre(c)}
                        >
                          Edit
                        </Button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-slate-500">
                      No centres found
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
            {filteredCentres.length ? startIndex + 1 : 0}
          </span>
          –{" "}
          <span className="font-semibold text-slate-900">
            {Math.min(startIndex + ROWS_PER_PAGE, filteredCentres.length)}
          </span>{" "}
          of <span className="font-semibold text-slate-900">{filteredCentres.length}</span>
        </span>

        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            className="h-10 rounded-xl border-slate-200 bg-white"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((p) => p - 1)}
          >
            Prev
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-10 rounded-xl border-slate-200 bg-white"
            disabled={currentPage === totalPages || totalPages === 0}
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