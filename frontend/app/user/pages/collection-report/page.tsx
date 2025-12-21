"use client";

import { useEffect, useState } from "react";
import * as XLSX from "xlsx";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { FileSpreadsheet } from "lucide-react";
import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";
import { toast } from "sonner";

pdfMake.vfs = pdfFonts.vfs;

interface ApiCollectionItem {
  id: number;
  amount: number | string;
  date: string;
  customer?: {
    name?: string;
    centre?: {
      name?: string;
      zones?: {
        name?: string;
      };
    };
  };
  gfs_code?: {
    code?: string;
    description?: string;
  };
}

interface CollectionRecord {
  id: number;
  name: string;
  center: string;
  zone: string;
  serviceCode: string;
  service: string;
  amount: number;
  date: string;
}

interface ServiceSummary {
  serviceCode: string;
  service: string;
  total: number;
}

export default function CollectionReport() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api";

  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [service, setService] = useState("ALL");
  const [center, setCenter] = useState("ALL");
  const [zone, setZone] = useState("ALL");
  const [data, setData] = useState<CollectionRecord[]>([]);
  const [filteredData, setFilteredData] = useState<CollectionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;

  // -----------------------------
  // Get user info directly
  // -----------------------------
  const authToken = localStorage.getItem("authToken") || "";
  const userRole = localStorage.getItem("userRole") || "";
  const userCentre = localStorage.getItem("centre") || "";
  const userZone = localStorage.getItem("zone") || "";
  const userType = (localStorage.getItem("userType") || "").toUpperCase();
  let isCentreUser = null;

  if (userRole !== "DG") {
    isCentreUser = userCentre;
  }

  const isZoneUser = userZone;
  const isHQUser = userType === "HQ";

  // -----------------------------
  // Set default dates to current month
  // -----------------------------
  useEffect(() => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const formatLocalDate = (d: Date) => {
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      return `${yyyy}-${mm}-${dd}`;
    };

    setFromDate(formatLocalDate(firstDay));
    setToDate(formatLocalDate(lastDay));
  }, []);

  // -----------------------------
  // Fetch & filter data
  // -----------------------------
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);

      if (isCentreUser) {
        setCenter(userCentre);
      }

      try {
        const token = localStorage.getItem("authToken");
        const apiKey = process.env.NEXT_PUBLIC_API_KEY;

        if (!token || !apiKey) {
          toast("Missing authentication credentials");
          return;
        }

    
        const res = await fetch(`${apiUrl}/collections/get`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
            "X-API-KEY": apiKey,
          },
        });

      
        if (!res.ok) throw new Error("Network error");

        const json: ApiCollectionItem[] = await res.json();

        const mappedData: CollectionRecord[] = json.map((item) => ({
          id: item.id,
          name: item.customer?.name || "",
          center: item.customer?.centre?.name || "",
          zone: item.customer?.centre?.zones?.name || "",
          serviceCode: item.gfs_code?.code || "",
          service:
            item.gfs_code?.description === "Miscellaneous receipts"
              ? "Separate production Unit"
              : item.gfs_code?.description || "",
          amount: Number(item.amount) || 0,
          date: item.date ? item.date.split("T")[0] : "",
        }));

        // Filter immediately based on user role
        let userFilteredData = mappedData;

        if (userCentre) {
          userFilteredData = userFilteredData.filter(
            (d) => d.center === userCentre
          );
        }
        if (userZone && !userCentre) {
          userFilteredData = userFilteredData.filter(
            (d) => d.zone === userZone
          );
        }

        setData(userFilteredData); // <-- Use the filtered data here!
      } catch (err) {
        console.error("Error fetching:", err);
        setData([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [apiUrl, authToken, isCentreUser, isZoneUser, userCentre, userZone]);

  // -----------------------------
  // Date helpers
  // -----------------------------
  const toStartOfDay = (d: string) => new Date(d + "T00:00:00");
  const toEndOfDay = (d: string) => new Date(d + "T23:59:59");

  // -----------------------------
  // Filter data
  // -----------------------------
  const handleFilter = () => {
    const from = fromDate ? toStartOfDay(fromDate) : null;
    const to = toDate ? toEndOfDay(toDate) : null;

    const filtered = data.filter((item) => {
      if (!item.date) return false;
      const itemDate = new Date(item.date);
      const inRange = (!from || itemDate >= from) && (!to || itemDate <= to);
      const matchService = service === "ALL" ? true : item.service === service;
      const matchCenter = userCentre
        ? item.center === userCentre
        : center === "ALL"
        ? true
        : item.center === center;

      const matchZone = isHQUser
        ? zone === "ALL"
          ? true
          : item.zone === zone
        : true;

      return inRange && matchService && matchCenter && matchZone;
    });

    setFilteredData(filtered);
    setCurrentPage(1);
  };

  useEffect(() => {
    handleFilter();
  }, [data.length, fromDate, toDate, service, center, zone]);

  useEffect(() => {
    handleFilter();
  }, [data.length, fromDate, toDate, service, center, zone]);

  // -----------------------------
  // Pagination & summary
  // -----------------------------
  const indexOfLastRow = currentPage * rowsPerPage;
  const indexOfFirstRow = indexOfLastRow - rowsPerPage;
  const currentRows = filteredData.slice(indexOfFirstRow, indexOfLastRow);
  const totalPages = Math.max(1, Math.ceil(filteredData.length / rowsPerPage));
  const totalAmount = filteredData.reduce((s, i) => s + i.amount, 0);

  const summaryByService: ServiceSummary[] = Object.values(
    filteredData.reduce<Record<string, ServiceSummary>>((acc, curr) => {
      if (!acc[curr.serviceCode])
        acc[curr.serviceCode] = {
          serviceCode: curr.serviceCode,
          service: curr.service,
          total: 0,
        };
      acc[curr.serviceCode].total += curr.amount;
      return acc;
    }, {})
  ).sort((a, b) => b.total - a.total);

  // -----------------------------
  // Export functions
  // -----------------------------
  const exportPDF = () => {};

  const exportExcel = () => {
    const wsData = [
      [
        "#",
        "Customer",
        "Center",
        "Zone",
        "Service Code",
        "Service",
        "Amount",
        "Date",
      ],
      ...filteredData.map((r, i) => [
        i + 1,
        r.name,
        r.center,
        r.zone,
        r.serviceCode,
        r.service,
        r.amount,
        r.date,
      ]),
      ["", "", "", "", "", "TOTAL", totalAmount, ""],
    ];

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Collection Report");
    XLSX.writeFile(wb, "collection_report.xlsx");
  };

  if (loading) {
    return (
      <div className="w-full h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-sky-800 border-solid"></div>
      </div>
    );
  }

  const uniqueCenters = isCentreUser
    ? [userCentre]
    : Array.from(new Set(data.map((d) => d.center))).filter(Boolean);
  const uniqueZones = isZoneUser
    ? [userZone]
    : Array.from(new Set(data.map((d) => d.zone))).filter(Boolean);

  // -----------------------------
  // Render
  // -----------------------------
  return (
    <div className="p-6 space-y-6">
      <Breadcrumb className="px-5">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/user/pages/dashboard" className=" font-bold">
              Dashboard
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>Collections</BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <Card className=" border-none outline-none">
        <CardHeader>
          <CardTitle>{isCentreUser && `${userCentre}`}</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-4 mb-6">
            <div>
              <label className="text-sm font-medium">From</label>
              <Input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm font-medium">To</label>
              <Input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm font-medium">Service</label>
              <Select onValueChange={setService} value={service}>
                <SelectTrigger>
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All</SelectItem>
                  {Array.from(new Set(data.map((d) => d.service)))
                    .filter(Boolean)
                    .map((srv, i) => (
                      <SelectItem key={i} value={srv}>
                        {srv}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {userRole == "DG" ? (
              <div>
                <label className="text-sm font-medium">Center</label>
                <Select onValueChange={setCenter} value={center}>
                  <SelectTrigger>
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All</SelectItem>
                    {uniqueCenters.map((c, i) => (
                      <SelectItem key={i} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}

            {userRole == "DG" && (
              <div>
                <label className="text-sm font-medium">Zone</label>
                <Select onValueChange={setZone} value={zone}>
                  <SelectTrigger>
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All</SelectItem>
                    {uniqueZones.map((z, i) => (
                      <SelectItem key={i} value={z}>
                        {z}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Table */}
          <div className="overflow-auto border rounded-md">
            <table className="min-w-full text-sm text-left border-collapse table-fixed">
              <thead className=" text-white bg-blue-950">
                <tr>
                  {[
                    "#",
                    "Customer",
                    "Service Code",
                    "Service",
                    "Amount (TZS)",
                    "Date Paid",
                  ].map((h) => (
                    <th key={h} className="p-3 border">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {currentRows.map((row, i) => (
                  <tr key={`${row.id}-${i}`} className="hover:bg-sky-50">
                    <td className="p-1 border">{indexOfFirstRow + i + 1}</td>
                    <td className="p-1 border">{row.name}</td>
                    <td className="p-1 border">{row.serviceCode}</td>
                    <td className="p-1 border text-start">{row.service}</td>
                    <td className="p-1 border text-left">
                      {row.amount.toLocaleString()}
                    </td>
                    <td className="p-1 border">{row.date}</td>
                  </tr>
                ))}
                {filteredData.length === 0 && (
                  <tr>
                    <td className="p-4 border text-center" colSpan={8}>
                      No records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex justify-between items-center mt-4">
            <Button
              variant="outline"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
            >
              Previous
            </Button>

            <div className="text-sm text-gray-600">
              Page {currentPage} of {totalPages}
            </div>

            <Button
              variant="outline"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
            >
              Next
            </Button>
          </div>

          {/* Summary */}

          {/* Summary by Service */}
          <h3 className="mt-6 mb-2 font-bold">Summary Per Service</h3>
          <div className="overflow-auto border rounded-md ">
            <table className="min-w-full text-sm  ">
              <thead className="bg-blue-950 text-white">
                <tr>
                  <th className="p-3 border">Service Code</th>
                  <th className="p-3 border">Service Name</th>
                  <th className="p-3 border text-right">Total Amount (TZS)</th>
                </tr>
              </thead>
              <tbody>
                {summaryByService.map((srv) => (
                  <tr key={srv.serviceCode} className="hover:bg-sky-50">
                    <td className="p-2 border">{srv.serviceCode}</td>
                    <td className="p-2 border">{srv.service}</td>
                    <td className="p-2 border text-right font-semibold">
                      {srv.total.toLocaleString()}
                    </td>
                  </tr>
                ))}
                {summaryByService.length === 0 && (
                  <tr>
                    <td className="p-4 border text-center" colSpan={3}>
                      No summary data.
                    </td>
                  </tr>
                )}
              </tbody>

              <tfoot className=" font-bold">
                <tr>
                  <td className="p-3 border" colSpan={2}>
                    Total Income:
                  </td>
                  <td className="p-3 border text-right">
                    <div className="mt-6 text-lg font-semibold">
                      {totalAmount.toLocaleString()} TZS
                    </div>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Export */}
          <div className="flex gap-3 mt-6">
            <Button
              onClick={exportExcel}
              className="bg-green-600 hover:bg-green-700"
            >
              <FileSpreadsheet className="mr-2 h-4 w-4" /> Excel
            </Button>

            <Button
              onClick={exportPDF}
              className="bg-slate-700 hover:bg-slate-800 text-white"
            >
              Export PDF
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
