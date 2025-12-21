"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectTrigger, SelectContent, SelectValue, SelectItem } from "@/components/ui/select";
import { toast } from "sonner";
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbSeparator } from "@/components/ui/breadcrumb";

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
    <div className="space-y-6 p-6">

       <Breadcrumb className="mb-6">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/user/admin/dashboard">Dashboard</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>zones</BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Zones Management</h2>
    
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
     
      </div>

      {/* Table */}
      <div className="overflow-x-auto border rounded-xl">
        <table className="min-w-full border-collapse">
          <thead className="bg-gray-100 text-gray-700">
            <tr>
              <th className="p-3 text-left">#</th>
              <th className="p-3 text-left">Name</th>
            </tr>
          </thead>
          <tbody>
            {paginatedUsers.length ? (
              paginatedUsers.map((u, i) => (
                <tr key={u.id} className="border-t hover:bg-gray-50">
                  <td className="p-3">{startIndex + i + 1}</td>
                  <td className="p-3">{u.name} </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="text-center py-6 text-gray-500 italic">
                  No Zone found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex justify-between items-center mt-4">
        <div className="text-sm text-gray-600">
          Showing {startIndex + 1}–{Math.min(startIndex + rowsPerPage, filteredZones.length)} of {filteredZones.length} users
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" disabled={currentPage === 1} onClick={prevPage}>Prev</Button>
          <Button variant="outline" size="sm" disabled={currentPage === totalPages} onClick={nextPage}>Next</Button>
        </div>
      </div>
    </div>
  );
}
