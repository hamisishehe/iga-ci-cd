"use client";

import { useEffect, useState } from "react";
import * as XLSX from "xlsx";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  gfsCode?: {
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
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "/api";


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
          serviceCode: item.gfsCode?.code || "N/A",
          service:
            item.gfsCode?.description === "Miscellaneous receipts"
              ? "Separate production Unit"
              : item.gfsCode?.description || "N/A",
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
  <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50">
    <div className="p-6 space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center justify-between">
        <Breadcrumb className="px-1 sm:px-2">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/user/pages/dashboard" className="font-semibold text-slate-800">
                Dashboard
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem className="text-slate-600">Collections</BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* Optional small badge */}
        {isCentreUser && (
          <div className="hidden sm:inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-700 shadow-sm">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            {userCentre}
          </div>
        )}
      </div>

      {/* Page Card */}
      <Card className="relative overflow-hidden rounded-2xl border-slate-200/60 bg-white shadow-sm">
        <div className="absolute inset-0 bg-gradient-to-br from-sky-500/8 via-transparent to-indigo-500/8" />

        <CardHeader className="relative flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <CardDescription className="text-slate-600">
              Filter by date, service, centre and zone to generate the report.
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="relative">
          {/* Filters */}
          <div className="rounded-2xl border border-slate-200/70 bg-gradient-to-b from-slate-50 to-white p-4 sm:p-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-700">From</label>
                <Input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="h-10 rounded-xl border-slate-200 bg-white"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-700">To</label>
                <Input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="h-10 rounded-xl border-slate-200 bg-white"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-700">Service</label>
                <Select value={service} onValueChange={setService}>
                  <SelectTrigger className="h-10 rounded-xl border-slate-200 bg-white">
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
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-700">Centre</label>
                  <Select value={center} onValueChange={setCenter} disabled={isCentreUser}>
                    <SelectTrigger className="h-10 rounded-xl border-slate-200 bg-white">
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
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-700">Zone</label>
                  <Select value={zone} onValueChange={setZone}>
                    <SelectTrigger className="h-10 rounded-xl border-slate-200 bg-white">
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

              {/* Quick action area (optional) */}
              <div className="md:col-span-1 flex items-end">
                <div className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
                  Tip: Use “All” to include everything.
                </div>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="mt-6 overflow-auto rounded-2xl border border-slate-200/70 bg-white">
            <table className="min-w-full text-sm text-left">
              <thead className="sticky top-0 z-10 bg-slate-900 text-white">
                <tr>
                  <th className="p-3 font-medium">#</th>
                  <th className="p-3 font-medium">Customer</th>
                  <th className="p-3 font-medium">Service Code</th>
                  <th className="p-3 font-medium">Service</th>
                  <th className="p-3 font-medium text-right">Amount (TZS)</th>
                  <th className="p-3 font-medium">Date Paid</th>
                </tr>
              </thead>
              <tbody>
                {currentRows.length > 0 ? (
                  currentRows.map((row, i) => (
                    <tr
                      key={row.id}
                      className="border-t border-slate-200/70 hover:bg-slate-50"
                    >
                      <td className="p-3 text-slate-700">
                        {indexOfFirstRow + i + 1}
                      </td>
                      <td className="p-3 text-slate-900">{row.name}</td>
                      <td className="p-3 text-slate-700">{row.serviceCode}</td>
                      <td className="p-3 text-slate-700">{row.service}</td>
                      <td className="p-3 text-right font-semibold text-slate-900">
                        {row.amount.toLocaleString()}
                      </td>
                      <td className="p-3 text-slate-700">{row.date}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="p-10 text-center text-slate-500">
                      No records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Button
              variant="outline"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              className="h-10 rounded-xl border-slate-200 bg-white"
            >
              Previous
            </Button>

            <span className="text-sm text-slate-600">
              Page <span className="font-semibold text-slate-900">{currentPage}</span> of{" "}
              <span className="font-semibold text-slate-900">{totalPages}</span>
            </span>

            <Button
              variant="outline"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              className="h-10 rounded-xl border-slate-200 bg-white"
            >
              Next
            </Button>
          </div>

          {/* Summary by Service */}
          <div className="mt-10 flex items-end justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Summary Per Service</h3>
              <p className="text-sm text-slate-600">Totals grouped by service code.</p>
            </div>

            <div className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-700 shadow-sm">
              Total: <span className="font-semibold">{totalAmount.toLocaleString()} TZS</span>
            </div>
          </div>

          <div className="mt-4 overflow-auto rounded-2xl border border-slate-200/70 bg-white">
            <table className="min-w-full text-sm">
              <thead className="sticky top-0 z-10 bg-slate-900 text-white">
                <tr>
                  <th className="p-3 font-medium">Service Code</th>
                  <th className="p-3 font-medium">Service Name</th>
                  <th className="p-3 font-medium text-right">Total Amount (TZS)</th>
                </tr>
              </thead>
              <tbody>
                {summaryByService.map((s) => (
                  <tr
                    key={s.serviceCode}
                    className="border-t border-slate-200/70 hover:bg-slate-50"
                  >
                    <td className="p-3 text-slate-700">{s.serviceCode}</td>
                    <td className="p-3 text-slate-900">{s.service}</td>
                    <td className="p-3 text-right font-semibold text-slate-900">
                      {s.total.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-50">
                <tr>
                  <td colSpan={2} className="p-4 text-right font-semibold text-slate-700">
                    Total Income:
                  </td>
                  <td className="p-4 text-right text-base font-semibold text-slate-900">
                    {totalAmount.toLocaleString()}{" "}
                    <span className="text-sm font-medium text-slate-500">TZS</span>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Export Buttons */}
          <div className="mt-8 flex flex-wrap gap-3">
            <Button
              onClick={exportExcel}
              className="h-10 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm"
            >
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Export Excel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
);

}