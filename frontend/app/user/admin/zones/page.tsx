"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectTrigger, SelectContent, SelectValue, SelectItem } from "@/components/ui/select";
import { toast } from "sonner";
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Card, CardContent } from "@/components/ui/card";

interface Zone {
  id: number;
  name: string;
}


export default function CentresPage() {
  const router = useRouter();
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api";

  const [zone, setZone] = useState<Zone[]>([]);
  const [search, setSearch] = useState("");
  const [centreFilter, setCentreFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(5);

  useEffect(() => {
    fetchZones();
  }, []);



  const fetchZones = async () => {
    try {

        const token = localStorage.getItem("authToken");
        const apiKey = process.env.NEXT_PUBLIC_API_KEY;
    
        if (!token || !apiKey) {
          toast("Missing authentication credentials");
          return;
        }
        
      const res = await fetch(`${apiUrl}/zone/get`, {
        method: "GET",
         headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`, 
        "X-API-KEY": apiKey,              
      },
      });
   
      if (res.ok) {
        const data = await res.json();
        setZone(data);
      }
    } catch {
      toast("Error loading zones");
    }
  };

  // Filters + Pagination
  const filteredZones = zone.filter((u) => {
    const matchSearch = `${u.name}`.toLowerCase().includes(search.toLowerCase());
    return matchSearch;
  });

  const totalPages = Math.ceil(filteredZones.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const paginatedUsers = filteredZones.slice(startIndex, startIndex + rowsPerPage);

  // Pagination controls
  const nextPage = () => currentPage < totalPages && setCurrentPage((p) => p + 1);
  const prevPage = () => currentPage > 1 && setCurrentPage((p) => p - 1);

  return (
  <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50">
    <div className="space-y-6 p-6">
      {/* Breadcrumb */}
      <Breadcrumb className="mb-2">
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
          <BreadcrumbItem className="text-slate-600">Zones</BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
            Zones Management
          </h2>
          <p className="text-sm text-slate-600">
            Search and view system zones.
          </p>
        </div>
      </div>

      {/* Search */}
      <Card className="relative overflow-hidden rounded-2xl border-slate-200/60 bg-white shadow-sm">
        <div className="absolute inset-0 bg-gradient-to-br from-sky-500/8 via-transparent to-indigo-500/8" />
        <CardContent className="relative p-5">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
            <div className="md:col-span-10 space-y-1.5">
              <label className="text-xs font-medium text-slate-700">Search zones</label>
              <Input
                placeholder="Search by zone name..."
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
                {paginatedUsers.length}/{filteredZones.length}
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
                </tr>
              </thead>

              <tbody>
                {paginatedUsers.length ? (
                  paginatedUsers.map((u, i) => (
                    <tr
                      key={u.id}
                      className="border-t border-slate-200/70 hover:bg-slate-50"
                    >
                      <td className="p-3 text-slate-700">{startIndex + i + 1}</td>
                      <td className="p-3">
                        <div className="font-medium text-slate-900">{u.name}</div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={2} className="py-10 text-center text-slate-500">
                      No Zone found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mt-2">
        <div className="text-sm text-slate-600">
          Showing{" "}
          <span className="font-semibold text-slate-900">
            {filteredZones.length ? startIndex + 1 : 0}
          </span>
          –{" "}
          <span className="font-semibold text-slate-900">
            {Math.min(startIndex + rowsPerPage, filteredZones.length)}
          </span>{" "}
          of <span className="font-semibold text-slate-900">{filteredZones.length}</span> zones
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-10 rounded-xl border-slate-200 bg-white"
            disabled={currentPage === 1}
            onClick={prevPage}
          >
            Prev
          </Button>
          <Button
            variant="outline"
            size="sm"
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
