"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
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

/** -------- types from backend projections -------- */
interface ReportRow {
  id: number;
  customerName: string;
  centreName: string;
  zoneName: string;
  serviceCode: string;
  serviceDesc: string;
  paymentType?: string;
  controlNumber: string;

  // ✅ existing: amount billed (backend uses amountBilled as "amount")
  amount: number;

  // ✅ NEW: amount paid per row (requires backend to return it in reportRows projection)
  amountPaid?: number;

  datePaid: string; // ISO
}

interface ServiceSummaryRow {
  serviceCode: string;
  serviceDesc: string;
  total: number;
}

/** ✅ OPTIONAL: server can return dropdown options */
interface ReportFilters {
  centres?: string[];
  zones?: string[];
  services?: Array<{ serviceCode: string; serviceDesc: string }>;
}

interface ReportResponse extends ReportFilters {
  totalIncome: number;
  totalTransactions: number;

  // ✅ NEW: total paid (sum of amountPaid)
  totalPaid: number;

  page: number;
  size: number;
  totalElements: number;
  totalPages: number;

  rows: ReportRow[];
  summaryByService: ServiceSummaryRow[];
  totalAmount: number; // exact total (filtered) for amount billed
}

/** -------- helpers -------- */
const pad2 = (n: number) => String(n).padStart(2, "0");
const formatDate = (d: Date) =>
  `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

const toSafeNumber = (v: any) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

export default function CollectionReport() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "/api";

  // dates
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const [centre, setCentre] = useState("ALL");
  const [zone, setZone] = useState("ALL");
  const [serviceCode, setServiceCode] = useState("ALL");

  // server data
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [summaryByService, setSummaryByService] = useState<ServiceSummaryRow[]>([]);
  const [totalIncome, setTotalIncome] = useState(0);
  const [totalTransactions, setTotalTransactions] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);

  // ✅ NEW
  const [totalPaid, setTotalPaid] = useState(0);

  // dropdown options
  const [centreOptions, setCentreOptions] = useState<string[]>([]);
  const [zoneOptions, setZoneOptions] = useState<string[]>([]);
  const [serviceOptions, setServiceOptions] = useState<
    Array<{ serviceCode: string; serviceDesc: string }>
  >([]);

  const [loading, setLoading] = useState(true);

  // paging
  const [page, setPage] = useState(0);
  const size = 10;
  const [totalPages, setTotalPages] = useState(1);

  // === User Role & Permissions ===
  const userType =
    (typeof window !== "undefined" ? localStorage.getItem("userType") || "" : "").toUpperCase();
  const userCentre = typeof window !== "undefined" ? localStorage.getItem("centre") || "" : "";
  const userZone = typeof window !== "undefined" ? localStorage.getItem("zone") || "" : "";

  const isHQUser = userType === "HQ";
  const isCentreUser = userType === "CENTRE" && Boolean(userCentre);
  const isZoneUser = userType === "ZONE" && Boolean(userZone);

  // === Set default date range to current month ===
  useEffect(() => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    setFromDate(formatDate(firstDay));
    setToDate(formatDate(lastDay));

    if (isCentreUser) setCentre(userCentre);
    if (isZoneUser) setZone(userZone);
  }, [isCentreUser, isZoneUser, userCentre, userZone]);

  /** build request payload */
  const payload = useMemo(() => {
    return {
      fromDate,
      toDate,
      centre: isCentreUser ? userCentre : centre === "ALL" ? null : centre,
      zone: isZoneUser ? userZone : zone === "ALL" ? null : zone,
      serviceCode: serviceCode === "ALL" ? null : serviceCode,
      page,
      size,
    };
  }, [
    fromDate,
    toDate,
    centre,
    zone,
    serviceCode,
    page,
    size,
    isCentreUser,
    isZoneUser,
    userCentre,
    userZone,
  ]);

  /** debounce fetch */
  const debounceRef = useRef<number | null>(null);

  useEffect(() => {
    if (!fromDate || !toDate) return;

    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      fetchReport(payload);
    }, 250);

    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payload]);

  const fetchReport = async (body: any) => {
    setLoading(true);
    try {
      const token = localStorage.getItem("authToken");
      const apiKey = process.env.NEXT_PUBLIC_API_KEY;

      if (!token || !apiKey) {
        toast.error("Missing authentication credentials");
        return;
      }

      const res = await fetch(`${apiUrl}/collections/report`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "X-API-KEY": apiKey,
        },
        cache: "no-store",
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        console.error("Report fetch failed:", res.status, txt);
        throw new Error(`HTTP ${res.status} ${txt ? `- ${txt}` : ""}`);
      }

      const data: ReportResponse = await res.json();

      setRows(data.rows || []);
      setSummaryByService(data.summaryByService || []);

      setTotalIncome(toSafeNumber(data.totalIncome));
      setTotalTransactions(toSafeNumber(data.totalTransactions));
      setTotalAmount(toSafeNumber(data.totalAmount));

      // ✅ NEW
      setTotalPaid(toSafeNumber((data as any).totalPaid));

      setTotalPages(Math.max(1, toSafeNumber(data.totalPages) || 1));

      const serverCentres = (data.centres || []).filter(Boolean);
      const serverZones = (data.zones || []).filter(Boolean);
      const serverServices = (data.services || []).filter((s) => s?.serviceCode && s?.serviceDesc);

      const fallbackCentres = Array.from(
        new Set((data.rows || []).map((r) => r.centreName).filter(Boolean))
      );
      const fallbackZones = Array.from(
        new Set((data.rows || []).map((r) => r.zoneName).filter(Boolean))
      );

      const fallbackServices = Array.from(
        new Map(
          (data.summaryByService || [])
            .filter((s) => s?.serviceCode && s?.serviceDesc)
            .map((s) => [s.serviceCode, { serviceCode: s.serviceCode, serviceDesc: s.serviceDesc }])
        ).values()
      );

      setCentreOptions(isCentreUser ? [userCentre] : serverCentres.length ? serverCentres : fallbackCentres);
      setZoneOptions(isZoneUser ? [userZone] : serverZones.length ? serverZones : fallbackZones);
      setServiceOptions(serverServices.length ? serverServices : fallbackServices);

      if (serviceCode !== "ALL") {
        const exists = (serverServices.length ? serverServices : fallbackServices).some(
          (s) => s.serviceCode === serviceCode
        );
        if (!exists) setServiceCode("ALL");
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to load report");

      setRows([]);
      setSummaryByService([]);
      setTotalIncome(0);
      setTotalTransactions(0);
      setTotalAmount(0);
      setTotalPaid(0);
      setTotalPages(1);

      setCentreOptions(isCentreUser ? [userCentre] : []);
      setZoneOptions(isZoneUser ? [userZone] : []);
      setServiceOptions([]);
    } finally {
      setLoading(false);
    }
  };

  /** Export: fetch all pages */
  const exportExcel = async () => {
    try {
      const token = localStorage.getItem("authToken");
      const apiKey = process.env.NEXT_PUBLIC_API_KEY;

      if (!token || !apiKey) {
        toast.error("Missing authentication credentials");
        return;
      }

      toast.message("Preparing Excel...");

      const allRows: ReportRow[] = [];
      const maxPages = totalPages;

      // also capture totals from the first page response (it already contains totals)
      let exportTotalAmount = totalAmount;
      let exportTotalPaid = totalPaid;

      for (let p = 0; p < maxPages; p++) {
        const res = await fetch(`${apiUrl}/collections/report`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            "X-API-KEY": apiKey,
          },
          cache: "no-store",
          body: JSON.stringify({ ...payload, page: p, size: 2000 }),
        });

        if (!res.ok) throw new Error("Export fetch failed");

        const data: ReportResponse = await res.json();
        allRows.push(...(data.rows || []));

        if (p === 0) {
          exportTotalAmount = toSafeNumber(data.totalAmount);
          exportTotalPaid = toSafeNumber((data as any).totalPaid);
        }

        if ((data.totalPages || 1) <= p + 1) break;
      }

      // ✅ Updated header includes Amount Paid
      const header = [
        "#",
        "Customer",
        "Center",
        "Zone",
        "Service Code",
        "Service",
        "Payment Type",
        "Control Number",
        "Amount Billed (TZS)",
        "Amount Paid (TZS)",
        "Date Paid",
      ];

      const body = allRows.map((r, i) => [
        i + 1,
        r.customerName || "N/A",
        r.centreName || "N/A",
        r.zoneName || "N/A",
        r.serviceCode || "N/A",
        r.serviceDesc || "N/A",
        r.paymentType || "",
        r.controlNumber || "",
        toSafeNumber(r.amount),
        toSafeNumber(r.amountPaid),
        r.datePaid ? String(r.datePaid).split("T")[0] : "",
      ]);

      // ✅ totals row matches header length
      const totalsRow = [
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "TOTALS",
        toSafeNumber(exportTotalAmount),
        toSafeNumber(exportTotalPaid),
        "",
      ];

      const wsData = [header, ...body, totalsRow];
      const ws = XLSX.utils.aoa_to_sheet(wsData);

      // style header
      header.forEach((_, colIndex) => {
        const cell = ws[XLSX.utils.encode_cell({ r: 0, c: colIndex })];
        if (cell) {
          cell.s = {
            font: { bold: true, color: { rgb: "FFFFFF" } },
            fill: { fgColor: { rgb: "2563EB" } },
            alignment: { vertical: "center", horizontal: "center" },
          };
        }
      });

      // numeric format for billed (col 8) + paid (col 9)
      body.forEach((_, rowIndex) => {
        const excelRow = rowIndex + 1;

        const billedCell = ws[XLSX.utils.encode_cell({ r: excelRow, c: 8 })];
        if (billedCell) {
          billedCell.t = "n";
          billedCell.z = '#,##0" TZS"';
        }

        const paidCell = ws[XLSX.utils.encode_cell({ r: excelRow, c: 9 })];
        if (paidCell) {
          paidCell.t = "n";
          paidCell.z = '#,##0" TZS"';
        }
      });

      ws["!cols"] = [
        { wch: 5 },
        { wch: 24 },
        { wch: 18 },
        { wch: 14 },
        { wch: 16 },
        { wch: 34 },
        { wch: 22 },
        { wch: 18 },
        { wch: 18 },
        { wch: 18 },
        { wch: 14 },
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Collections");
      XLSX.writeFile(wb, "collection_report.xlsx");

      toast.success("Excel exported");
    } catch (e) {
      console.error(e);
      toast.error("Export failed");
    }
  };

  if (loading) {
    return (
      <div className="w-full h-screen flex items-center justify-center">
        <div className="relative w-16 h-16">
          <span className="absolute inset-0 rounded-full bg-sky-600 animate-ping"></span>
          <span className="absolute inset-2 rounded-full bg-sky-700"></span>
        </div>
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

          {isCentreUser && (
            <div className="hidden sm:inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-700 shadow-sm">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              {userCentre}
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-4">

  {/* Total Income */}
  <Card className="rounded-2xl border border-slate-200/60 bg-gradient-to-br from-blue-50 via-white to-blue-100 shadow-sm hover:shadow-md transition">
    <CardHeader>
      <CardDescription className="text-slate-600">Total Billed</CardDescription>
    </CardHeader>
    <CardContent className="text-2xl font-semibold text-slate-900">
      {toSafeNumber(totalIncome).toLocaleString()}{" "}
      <span className="text-sm text-slate-500">TZS</span>
    </CardContent>
  </Card>

  {/* Total Paid */}
  <Card className="rounded-2xl border border-slate-200/60 bg-gradient-to-br from-green-50 via-white to-green-100 shadow-sm hover:shadow-md transition">
    <CardHeader>
      <CardDescription className="text-slate-600">Total Paid</CardDescription>
    </CardHeader>
    <CardContent className="text-2xl font-semibold text-slate-900">
      {toSafeNumber(totalPaid).toLocaleString()}{" "}
      <span className="text-sm text-slate-500">TZS</span>
    </CardContent>
  </Card>

  {/* Total Transactions */}
  <Card className="rounded-2xl border border-slate-200/60 bg-gradient-to-br from-purple-50 via-white to-purple-100 shadow-sm hover:shadow-md transition">
    <CardHeader>
      <CardDescription className="text-slate-600">Total Transactions</CardDescription>
    </CardHeader>
    <CardContent className="text-2xl font-semibold text-slate-900">
      {toSafeNumber(totalTransactions).toLocaleString()}
    </CardContent>
  </Card>

  {/* Total Amount Filtered */}
  <Card className="rounded-2xl border border-slate-200/60 bg-gradient-to-br from-orange-50 via-white to-orange-100 shadow-sm hover:shadow-md transition">
    <CardHeader>
      <CardDescription className="text-slate-600">Total Amount (Filtered)</CardDescription>
    </CardHeader>
    <CardContent className="text-2xl font-semibold text-slate-900">
      {toSafeNumber(totalAmount).toLocaleString()}{" "}
      <span className="text-sm text-slate-500">TZS</span>
    </CardContent>
  </Card>

</div>

        <Card className="relative overflow-hidden rounded-2xl border-slate-200/60 bg-white shadow-sm">
          <CardHeader className="relative">
            <CardDescription className="text-slate-600">
              Filter by date, service (name), centre and zone 
            </CardDescription>
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
                    onChange={(e) => {
                      setPage(0);
                      setFromDate(e.target.value);
                    }}
                    className="h-10 rounded-xl border-slate-200 bg-white"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-700">To</label>
                  <Input
                    type="date"
                    value={toDate}
                    onChange={(e) => {
                      setPage(0);
                      setToDate(e.target.value);
                    }}
                    className="h-10 rounded-xl border-slate-200 bg-white"
                  />
                </div>

                {/* CENTRE */}
                {(!isCentreUser || isHQUser) && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-700">Centre</label>
                    <Select
                      value={isCentreUser ? userCentre : centre}
                      onValueChange={(v) => {
                        setPage(0);
                        setCentre(v);
                      }}
                      disabled={isCentreUser}
                    >
                      <SelectTrigger className="h-10 rounded-xl border-slate-200 bg-white">
                        <SelectValue placeholder="All" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">All</SelectItem>
                        {(centreOptions || []).map((c) => (
                          <SelectItem key={c} value={c}>
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* ZONE */}
                {isHQUser && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-700">Zone</label>
                    <Select
                      value={zone}
                      onValueChange={(v) => {
                        setPage(0);
                        setZone(v);
                      }}
                    >
                      <SelectTrigger className="h-10 rounded-xl border-slate-200 bg-white">
                        <SelectValue placeholder="All" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">All</SelectItem>
                        {(zoneOptions || []).map((z) => (
                          <SelectItem key={z} value={z}>
                            {z}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="md:col-span-1 flex items-end">
                  <div className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
                    Tip: data is filtered on server (fast).
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
                    <th className="p-3 font-medium">Payment Type</th>
                    <th className="p-3 font-medium">Control Number</th>
                    <th className="p-3 font-medium text-right">Amount Billed (TZS)</th>
                    <th className="p-3 font-medium text-right">Amount Paid (TZS)</th>
                    <th className="p-3 font-medium">Date Paid</th>
                  </tr>
                </thead>

                <tbody>
                  {rows.length > 0 ? (
                    rows.map((row, i) => (
                      <tr key={row.id} className="border-t border-slate-200/70 hover:bg-slate-50">
                        <td className="p-3 text-slate-700">{page * size + i + 1}</td>
                        <td className="p-3 text-slate-900">{row.customerName}</td>
                        <td className="p-3 text-slate-700">{row.serviceCode}</td>
                        <td className="p-3 text-slate-700">{row.serviceDesc}</td>
                        <td className="p-3 text-slate-700">{row.paymentType || "-"}</td>
                        <td className="p-3 text-slate-700">{row.controlNumber || "-"}</td>
                        <td className="p-3 text-right font-semibold text-slate-900">
                          {toSafeNumber(row.amount).toLocaleString()}
                        </td>
                        <td className="p-3 text-right font-semibold text-slate-900">
                          {toSafeNumber(row.amountPaid).toLocaleString()}
                        </td>
                        <td className="p-3 text-slate-700">
                          {row.datePaid ? String(row.datePaid).split("T")[0] : ""}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={9} className="p-10 text-center text-slate-500">
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
                disabled={page === 0}
                onClick={() => setPage((p) => Math.max(p - 1, 0))}
                className="h-10 rounded-xl border-slate-200 bg-white"
              >
                Previous
              </Button>

              <span className="text-sm text-slate-600">
                Page <span className="font-semibold text-slate-900">{page + 1}</span> of{" "}
                <span className="font-semibold text-slate-900">{totalPages}</span>
              </span>

              <Button
                variant="outline"
                disabled={page + 1 >= totalPages}
                onClick={() => setPage((p) => Math.min(p + 1, totalPages - 1))}
                className="h-10 rounded-xl border-slate-200 bg-white"
              >
                Next
              </Button>
            </div>

            {/* Summary by Service */}
            <div className="mt-10 flex items-end justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Summary Per Service</h3>
                <p className="text-sm text-slate-600">Totals grouped by service.</p>
              </div>

              <div className="flex gap-2">
                <div className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-700 shadow-sm">
                  Billed: <span className="font-semibold">{toSafeNumber(totalAmount).toLocaleString()} TZS</span>
                </div>
                <div className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-700 shadow-sm">
                  Paid: <span className="font-semibold">{toSafeNumber(totalPaid).toLocaleString()} TZS</span>
                </div>
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
                    <tr key={s.serviceCode} className="border-t border-slate-200/70 hover:bg-slate-50">
                      <td className="p-3 text-slate-700">{s.serviceCode}</td>
                      <td className="p-3 text-slate-900">{s.serviceDesc}</td>
                      <td className="p-3 text-right font-semibold text-slate-900">
                        {toSafeNumber(s.total).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Export
            <div className="mt-8 flex flex-wrap gap-3">
              <Button
                onClick={exportExcel}
                className="h-10 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm"
              >
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Export Excel
              </Button>
            </div> */}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
