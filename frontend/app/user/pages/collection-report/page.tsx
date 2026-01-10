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
import { toast } from "sonner";

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

  // === User Role & Permissions ===
  const userType = (localStorage.getItem("userType") || "").toUpperCase(); // HQ, CENTRE, ZONE
  const userCentre = localStorage.getItem("centre") || "";
  const userZone = localStorage.getItem("zone") || "";

  const isHQUser = userType === "HQ";
  const isCentreUser = userType === "CENTRE" && Boolean(userCentre);
const isZoneUser = userType === "ZONE" && Boolean(userZone);

  // === Set default date range to current month ===
  useEffect(() => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const formatDate = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
        d.getDate()
      ).padStart(2, "0")}`;

    setFromDate(formatDate(firstDay));
    setToDate(formatDate(lastDay));
  }, []);

  // === Fetch data once on mount ===
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem("authToken");
        const apiKey = process.env.NEXT_PUBLIC_API_KEY;

        if (!token || !apiKey) {
          toast.error("Missing authentication credentials");
          setLoading(false);
          return;
        }

        const res = await fetch(`${apiUrl}/collections/get`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "X-API-KEY": apiKey,
          },
        });

        if (!res.ok) throw new Error("Failed to fetch collections");

        const json: ApiCollectionItem[] = await res.json();

        const mapped: CollectionRecord[] = json.map((item) => ({
          id: item.id,
          name: item.customer?.name || "N/A",
          center: item.customer?.centre?.name || "N/A",
          zone: item.customer?.centre?.zones?.name || "N/A",
          serviceCode: item.gfs_code?.code || "N/A",
          service:
            item.gfs_code?.description === "Miscellaneous receipts"
              ? "Separate production Unit"
              : item.gfs_code?.description || "N/A",
          amount: Number(item.amount) || 0,
          date: item.date ? item.date.split("T")[0] : "",
        }));

        // Pre-filter by user role (HQ sees all, others restricted)
        let filteredByRole = mapped;

        if (isCentreUser) {
          filteredByRole = mapped.filter((d) => d.center === userCentre);
          setCenter(userCentre); // Lock dropdown
        } else if (isZoneUser) {
          filteredByRole = mapped.filter((d) => d.zone === userZone);
          setZone(userZone); // Lock dropdown
        }
        // HQ sees everything → no pre-filter

        setData(filteredByRole);
      } catch (err) {
        console.error(err);
        toast.error("Failed to load collections");
        setData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // === Reactive Filtering (dates, service, center, zone) ===
  useEffect(() => {
    if (data.length === 0) {
      setFilteredData([]);
      return;
    }

    const from = fromDate ? new Date(fromDate + "T00:00:00") : null;
    const to = toDate ? new Date(toDate + "T23:59:59") : null;

    const filtered = data.filter((item) => {
      const itemDate = new Date(item.date);

      const inDateRange =
        (!from || itemDate >= from) && (!to || itemDate <= to);

      const matchService = service === "ALL" || item.service === service;

      const matchCenter =
        isCentreUser || // Centre user already filtered
        center === "ALL" ||
        item.center === center;

      const matchZone =
        !isHQUser || // Only HQ can filter by zone
        zone === "ALL" ||
        item.zone === zone;

      return inDateRange && matchService && matchCenter && matchZone;
    });

    setFilteredData(filtered);
    setCurrentPage(1);
  }, [data, fromDate, toDate, service, center, zone, isCentreUser, isHQUser]);

  // === Unique options for dropdowns ===
  const uniqueServices = Array.from(new Set(data.map((d) => d.service))).filter(
    Boolean
  );

  const uniqueCenters = isCentreUser
    ? [userCentre]
    : Array.from(new Set(data.map((d) => d.center))).filter(Boolean);

  const uniqueZones = isZoneUser
    ? [userZone]
    : Array.from(new Set(data.map((d) => d.zone))).filter(Boolean);

  // === Pagination & Totals ===
  const indexOfLastRow = currentPage * rowsPerPage;
  const indexOfFirstRow = indexOfLastRow - rowsPerPage;
  const currentRows = filteredData.slice(indexOfFirstRow, indexOfLastRow);
  const totalPages = Math.max(1, Math.ceil(filteredData.length / rowsPerPage));

  const totalAmount = filteredData.reduce((sum, item) => sum + item.amount, 0);

  const summaryByService: ServiceSummary[] = Object.values(
    filteredData.reduce<Record<string, ServiceSummary>>((acc, item) => {
      const key = item.serviceCode;
      if (!acc[key]) {
        acc[key] = { serviceCode: key, service: item.service, total: 0 };
      }
      acc[key].total += item.amount;
      return acc;
    }, {})
  ).sort((a, b) => b.total - a.total);

  // === Export Excel ===
  const exportExcel = () => {
  const header = [
    "#",
    "Customer",
    "Center",
    "Zone",
    "Service Code",
    "Service",
    "Amount (TZS)",
    "Date Paid",
  ];

  const body = filteredData.map((r, i) => [
    i + 1,
    r.name,
    r.center,
    r.zone,
    r.serviceCode,
    r.service,
    r.amount,
    r.date,
  ]);

  const totalRow = ["", "", "", "", "", "TOTAL", totalAmount, ""];

  const wsData = [header, ...body, totalRow];

  const ws = XLSX.utils.aoa_to_sheet(wsData);

  /* ---------------- HEADER STYLE ---------------- */
  header.forEach((_, colIndex) => {
    const cell = ws[XLSX.utils.encode_cell({ r: 0, c: colIndex })];
    if (cell) {
      cell.s = {
        font: { bold: true, color: { rgb: "FFFFFF" } },
        fill: { fgColor: { rgb: "2563EB" } }, // Blue
        alignment: { vertical: "center", horizontal: "center" },
        border: {
          top: { style: "thin" },
          bottom: { style: "thin" },
          left: { style: "thin" },
          right: { style: "thin" },
        },
      };
    }
  });

  /* ---------------- BODY STYLE ---------------- */
  body.forEach((_, rowIndex) => {
    const excelRow = rowIndex + 1;

    // Amount column formatting
    const amountCell = ws[XLSX.utils.encode_cell({ r: excelRow, c: 6 })];
    if (amountCell) {
      amountCell.t = "n";
      amountCell.z = '#,##0" TZS"';
      amountCell.s = {
        alignment: { horizontal: "right" },
      };
    }

    // Date column
    const dateCell = ws[XLSX.utils.encode_cell({ r: excelRow, c: 7 })];
    if (dateCell) {
      dateCell.z = "dd mmm yyyy";
    }
  });

  /* ---------------- TOTAL ROW STYLE ---------------- */
  const totalRowIndex = wsData.length - 1;

  for (let c = 0; c < header.length; c++) {
    const cell = ws[XLSX.utils.encode_cell({ r: totalRowIndex, c })];
    if (cell) {
      cell.s = {
        font: { bold: true },
        fill: { fgColor: { rgb: "DBEAFE" } }, // Light blue
        border: {
          top: { style: "medium" },
          bottom: { style: "medium" },
        },
        alignment: {
          horizontal: c === 6 ? "right" : "center",
        },
      };
    }
  }

  /* ---------------- COLUMN WIDTHS ---------------- */
  ws["!cols"] = [
    { wch: 5 },
    { wch: 22 },
    { wch: 18 },
    { wch: 14 },
    { wch: 16 },
    { wch: 24 },
    { wch: 16 },
    { wch: 16 },
  ];

  /* ---------------- WORKBOOK ---------------- */
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Collections");

  XLSX.writeFile(wb, "collection_report.xlsx");
};


  if (loading) {
    return (
      <div className="w-full h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-sky-800 border-solid"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <Breadcrumb className="px-5">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/user/pages/dashboard" className="font-bold">
              Dashboard
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>Collections</BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <Card className="border-none">
        <CardHeader>
          <CardTitle>
            Collection Report {isCentreUser && `- ${userCentre}`}
          </CardTitle>
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
              <Select value={service} onValueChange={setService}>
                <SelectTrigger>
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All</SelectItem>
                  {uniqueServices.map((s, i) => (
                    <SelectItem key={i} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Centre Filter - Visible for HQ and Zone users */}
            {(!isCentreUser || isHQUser) && (
              <div>
                <label className="text-sm font-medium">Centre</label>
                <Select value={center} onValueChange={setCenter} disabled={isCentreUser}>
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
            )}

            {/* Zone Filter - Only visible for HQ users */}
            {isHQUser && (
              <div>
                <label className="text-sm font-medium">Zone</label>
                <Select value={zone} onValueChange={setZone}>
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
            <table className="min-w-full text-sm text-left border-collapse">
              <thead className="bg-blue-950 text-white">
                <tr>
                  <th className="p-3 border">#</th>
                  <th className="p-3 border">Customer</th>
                  <th className="p-3 border">Service Code</th>
                  <th className="p-3 border">Service</th>
                  <th className="p-3 border text-right">Amount (TZS)</th>
                  <th className="p-3 border">Date Paid</th>
                </tr>
              </thead>
              <tbody>
                {currentRows.length > 0 ? (
                  currentRows.map((row, i) => (
                    <tr key={row.id} className="hover:bg-sky-50">
                      <td className="p-3 border">{indexOfFirstRow + i + 1}</td>
                      <td className="p-3 border">{row.name}</td>
                      <td className="p-3 border">{row.serviceCode}</td>
                      <td className="p-3 border">{row.service}</td>
                      <td className="p-3 border text-right">
                        {row.amount.toLocaleString()}
                      </td>
                      <td className="p-3 border">{row.date}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-gray-500">
                      No records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex justify-between items-center mt-6">
            <Button
              variant="outline"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
            >
              Previous
            </Button>
            <span className="text-sm text-gray-600">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
            >
              Next
            </Button>
          </div>

          {/* Summary by Service */}
          <h3 className="mt-8 mb-3 text-lg font-bold">Summary Per Service</h3>
          <div className="overflow-auto border rounded-md">
            <table className="min-w-full text-sm">
              <thead className="bg-blue-950 text-white">
                <tr>
                  <th className="p-3 border">Service Code</th>
                  <th className="p-3 border">Service Name</th>
                  <th className="p-3 border text-right">Total Amount (TZS)</th>
                </tr>
              </thead>
              <tbody>
                {summaryByService.map((s) => (
                  <tr key={s.serviceCode} className="hover:bg-sky-50">
                    <td className="p-3 border">{s.serviceCode}</td>
                    <td className="p-3 border">{s.service}</td>
                    <td className="p-3 border text-right font-medium">
                      {s.total.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-100 font-bold">
                <tr>
                  <td colSpan={2} className="p-4 border text-right">
                    Total Income:
                  </td>
                  <td className="p-4 border text-right text-lg">
                    {totalAmount.toLocaleString()} TZS
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Export Buttons */}
          <div className="flex gap-4 mt-8">
            <Button onClick={exportExcel} className="bg-green-600 hover:bg-green-700">
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Export Excel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}