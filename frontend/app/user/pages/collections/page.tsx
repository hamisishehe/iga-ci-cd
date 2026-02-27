"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { toast } from "sonner";
import { motion } from "framer-motion";

/** -------- types from backend (PAYMENTS + GFS MODE) --------
 * rows are LINE-LEVEL:
 * - 1 row = 1 collections row (bill line) joined to its parent paymentId
 * - serviceCode/serviceDesc come from gfs_code
 */
interface PaymentRow {
  id: number; // collections.id (line id)
  paymentId: number; // payments.payment_id (API)
  customerName: string;
  centreName: string;
  zoneName: string;

  // ✅ from gfs_code
  serviceCode: string; // gfs_code.code
  serviceDesc: string; // gfs_code.description

  paymentType?: string;
  controlNumber?: string;

  totalBilled: number; // collections.amount_billed
  totalPaid?: number; // collections.amount_paid (nullable)
  paymentDate: string; // payments.payment_date (ISO)
}

interface ServiceSummaryRow {
  serviceCode: string;
  serviceDesc: string;
  totalBilled: number;
  totalPaid: number;
  totalTransactions: number;
}

/** UI Row (keeps your old table shape) */
interface ReportRow {
  id: number;
  customerName: string;
  centreName: string;
  zoneName: string;

  serviceCode: string;
  serviceDesc: string;

  paymentType?: string;
  controlNumber: string;

  amount: number; // billed
  amountPaid?: number; // paid
  datePaid: string; // ISO
  paymentId: number;
}

/** server filters */
interface ReportFilters {
  centres?: string[];
  zones?: string[];
  services?: Array<{ serviceCode: string; serviceDesc: string }>;
}

interface ReportResponse extends ReportFilters {
  totalIncome: number; // billed (sum)
  totalTransactions: number;
  totalPaid: number; // paid (sum)
  totalAmount: number;

  page: number;
  size: number;
  totalElements: number;
  totalPages: number;

  rows: PaymentRow[]; // ✅ line rows from server
  summaryByService: ServiceSummaryRow[]; // ✅ grouped by gfs service
}

/** -------- helpers -------- */
const pad2 = (n: number) => String(n).padStart(2, "0");
const formatDate = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

const toSafeNumber = (v: any) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const safeStr = (v: any) => (v == null ? "" : String(v));

export default function CollectionReport() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "/api";

  // dates
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const [centre, setCentre] = useState("ALL");
  const [zone, setZone] = useState("ALL");

  // ✅ now this is GFS serviceCode filter
  const [serviceCode, setServiceCode] = useState("ALL");

  // server data (UI-shape)
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [summaryByService, setSummaryByService] = useState<ServiceSummaryRow[]>([]);
  const [totalIncome, setTotalIncome] = useState(0);
  const [totalTransactions, setTotalTransactions] = useState(0);
  const [totalPaid, setTotalPaid] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);

  // dropdown options
  const [centreOptions, setCentreOptions] = useState<string[]>([]);
  const [zoneOptions, setZoneOptions] = useState<string[]>([]);
  const [serviceOptions, setServiceOptions] = useState<Array<{ serviceCode: string; serviceDesc: string }>>([]);

  const [loading, setLoading] = useState(true);

  // paging
  const [page, setPage] = useState(0);
  const size = 10;
  const [totalPages, setTotalPages] = useState(1);

  // === User Role & Permissions ===
  const userType = (typeof window !== "undefined" ? localStorage.getItem("userType") || "" : "").toUpperCase();
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

  /** ✅ Effective filters (respect role locks) */
  const effectiveZone = useMemo(() => {
    if (isZoneUser) return userZone;
    return zone === "ALL" ? null : zone;
  }, [isZoneUser, userZone, zone]);

  const effectiveCentre = useMemo(() => {
    if (isCentreUser) return userCentre;
    return centre === "ALL" ? null : centre;
  }, [isCentreUser, userCentre, centre]);

  /** build request payload */
  const payload = useMemo(() => {
    return {
      fromDate,
      toDate,
      centre: effectiveCentre,
      zone: effectiveZone,
      // ✅ now this is GFS code
      serviceCode: serviceCode === "ALL" ? null : serviceCode,
      page,
      size,
    };
  }, [fromDate, toDate, effectiveCentre, effectiveZone, serviceCode, page, size]);

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

  /** ✅ centres filtered by zone (UI dependency) */
  const filteredCentreOptions = useMemo(() => {
    if (!effectiveZone) return centreOptions;

    const centresInThisZone = Array.from(
      new Set(
        rows
          .filter((r) => (r.zoneName || "").trim() === String(effectiveZone).trim())
          .map((r) => (r.centreName || "").trim())
          .filter(Boolean)
      )
    );

    if (!centresInThisZone.length) return centreOptions;
    const set = new Set(centresInThisZone);
    return (centreOptions || []).filter((c) => set.has(String(c).trim()));
  }, [centreOptions, rows, effectiveZone]);

  /** ✅ If zone changes and selected centre is not valid, reset */
  useEffect(() => {
    if (isCentreUser) return;
    if (centre === "ALL") return;

    const exists = filteredCentreOptions.includes(centre);
    if (!exists) {
      setCentre("ALL");
      setPage(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredCentreOptions, effectiveZone]);

  /** ✅ Page totals (CLIENT) */
  const pageBilled = useMemo(() => rows.reduce((sum, r) => sum + toSafeNumber(r.amount), 0), [rows]);
  const pagePaid = useMemo(() => rows.reduce((sum, r) => sum + toSafeNumber(r.amountPaid), 0), [rows]);

  /** ✅ Server totals (GLOBAL filtered dataset) */
  const serverBilled = useMemo(() => toSafeNumber(totalIncome), [totalIncome]);
  const serverPaid = useMemo(() => toSafeNumber(totalPaid), [totalPaid]);

  const fetchReport = async (body: any) => {
    setLoading(true);
    try {
      const token = localStorage.getItem("authToken");
      const apiKey = process.env.NEXT_PUBLIC_API_KEY;

      if (!token || !apiKey) {
        toast.error("Missing authentication credentials");
        return;
      }

      // ✅ IMPORTANT: change endpoint to payments if your backend uses /payments/report
      // If you still expose it as /collections/report, keep it.
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

      console.log("Report fetch payload:", body);

      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        console.error("Report fetch failed:", res.status, txt);
        throw new Error(`HTTP ${res.status} ${txt ? `- ${txt}` : ""}`);
      }

      const data: ReportResponse = await res.json();

      /** ✅ Map PaymentRow(line) -> ReportRow (keep UI stable) */
      const normalizedRows: ReportRow[] = (data.rows || []).map((p) => {
        const billed = toSafeNumber((p as any).totalBilled);
        const paidRaw = (p as any).totalPaid;

        return {
          id: toSafeNumber(p.id),
          paymentId: toSafeNumber((p as any).paymentId),
          customerName: safeStr(p.customerName),
          centreName: safeStr(p.centreName),
          zoneName: safeStr(p.zoneName),

          serviceCode: safeStr((p as any).serviceCode),
          serviceDesc: safeStr((p as any).serviceDesc),

          paymentType: safeStr((p as any).paymentType),
          controlNumber: safeStr((p as any).controlNumber),

          amount: billed,
          amountPaid: paidRaw == null ? undefined : toSafeNumber(paidRaw),
          datePaid: safeStr((p as any).paymentDate),
        };
      });

      setRows(normalizedRows);

      setSummaryByService(
        (data.summaryByService || []).map((s: any) => ({
          serviceCode: safeStr(s.serviceCode),
          serviceDesc: safeStr(s.serviceDesc),
          totalBilled: toSafeNumber(s.totalBilled),
          totalPaid: toSafeNumber(s.totalPaid),
          totalTransactions: toSafeNumber(s.totalTransactions),
        }))
      );

      setTotalIncome(toSafeNumber(data.totalIncome));
      setTotalTransactions(toSafeNumber(data.totalTransactions));
      setTotalAmount(toSafeNumber((data as any).totalAmount));
      setTotalPaid(toSafeNumber((data as any).totalPaid));
      setTotalPages(Math.max(1, toSafeNumber(data.totalPages) || 1));

      // options from server or fallback from rows
      const serverCentres = (data.centres || []).filter(Boolean);
      const serverZones = (data.zones || []).filter(Boolean);

      // ✅ services are GFS services (code+desc)
      const serverServices = (data.services || []).filter((s) => s?.serviceCode && s?.serviceDesc);

      const fallbackCentres = Array.from(new Set(normalizedRows.map((r) => r.centreName).filter(Boolean)));
      const fallbackZones = Array.from(new Set(normalizedRows.map((r) => r.zoneName).filter(Boolean)));

      const fallbackServices = Array.from(
        new Map(
          normalizedRows
            .filter((r) => r.serviceCode && r.serviceDesc)
            .map((r) => [r.serviceCode, { serviceCode: r.serviceCode, serviceDesc: r.serviceDesc }])
        ).values()
      );

      setCentreOptions(isCentreUser ? [userCentre] : serverCentres.length ? serverCentres : fallbackCentres);
      setZoneOptions(isZoneUser ? [userZone] : serverZones.length ? serverZones : fallbackZones);
      setServiceOptions(serverServices.length ? serverServices : fallbackServices);

      if (serviceCode !== "ALL") {
        const list = serverServices.length ? serverServices : fallbackServices;
        const exists = list.some((s) => s.serviceCode === serviceCode);
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

  /** Export current page */
  const exportCurrentPageToExcel = () => {
    try {
      const ws = XLSX.utils.json_to_sheet(
        rows.map((r) => ({
          Customer: r.customerName,
          "Service Code": r.serviceCode,
          Service: r.serviceDesc,
          "Payment Type": r.paymentType || "",
          "Control Number": r.controlNumber || "",
          "Amount Billed": toSafeNumber(r.amount),
          "Amount Paid": r.amountPaid == null ? "" : toSafeNumber(r.amountPaid),
          "Date Paid": r.datePaid ? String(r.datePaid).split("T")[0] : "",
          "Payment ID": r.paymentId,
          Centre: r.centreName,
          Zone: r.zoneName,
        }))
      );
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Payments");
      XLSX.writeFile(wb, `payments_${fromDate}_${toDate}_page${page + 1}.xlsx`);
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
    <motion.div
      className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      <motion.div className="p-6 space-y-6">
        {/* Breadcrumb */}
        <motion.div className="flex items-center justify-between" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>
          <Breadcrumb className="px-1 sm:px-2">
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/user/pages/dashboard" className="font-semibold text-slate-800">
                  Dashboard
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem className="text-slate-600">Payments</BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          {isCentreUser && (
            <motion.div
              className="hidden sm:inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-700 shadow-sm"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: 0.15 }}
            >
              <motion.span
                className="h-2 w-2 rounded-full bg-emerald-500"
                animate={{ scale: [1, 1.4, 1] }}
                transition={{ duration: 1.2, repeat: Infinity }}
              />
              {userCentre}
            </motion.div>
          )}
        </motion.div>

        {/* Stats */}
        <motion.div className="grid gap-4 sm:grid-cols-3" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <Card className="rounded-2xl border border-slate-200/60 bg-gradient-to-br from-blue-50 via-white to-blue-100 shadow-sm">
            <CardHeader>
              <CardDescription className="text-slate-600">Total Billed (All Filtered)</CardDescription>
            </CardHeader>
            <CardContent className="text-2xl font-semibold text-slate-900">
              {serverBilled.toLocaleString()} <span className="text-sm text-slate-500">TZS</span>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border border-slate-200/60 bg-gradient-to-br from-green-50 via-white to-green-100 shadow-sm">
            <CardHeader>
              <CardDescription className="text-slate-600">Total Paid (All Filtered)</CardDescription>
            </CardHeader>
            <CardContent className="text-2xl font-semibold text-slate-900">
              {serverPaid.toLocaleString()} <span className="text-sm text-slate-500">TZS</span>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border border-slate-200/60 bg-gradient-to-br from-purple-50 via-white to-purple-100 shadow-sm">
            <CardHeader>
              <CardDescription className="text-slate-600">Total Transactions (All Filtered)</CardDescription>
            </CardHeader>
            <CardContent className="text-2xl font-semibold text-slate-900">
              {toSafeNumber(totalTransactions).toLocaleString()}
            </CardContent>
          </Card>

         
        </motion.div>

        {/* Filter + Table */}
        <Card className="relative overflow-hidden rounded-2xl border-slate-200/60 bg-white shadow-sm">
          <CardHeader>
            <CardDescription className="text-slate-600">Filter by date, service (GFS), centre and zone</CardDescription>
          </CardHeader>

          <CardContent>
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

                {/* SERVICE (GFS) */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-700">Service (GFS)</label>
                  <Select
                    value={serviceCode}
                    onValueChange={(v) => {
                      setPage(0);
                      setServiceCode(v);
                    }}
                  >
                    <SelectTrigger className="h-10 rounded-xl border-slate-200 bg-white">
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All</SelectItem>
                      {(serviceOptions || []).map((s) => (
                        <SelectItem key={s.serviceCode} value={s.serviceCode}>
                          {s.serviceDesc} ({s.serviceCode})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                        {(filteredCentreOptions || []).map((c) => (
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
                        setCentre("ALL");
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

             
              </div>

           
            </div>

            {/* Table */}
            <div className="mt-6 overflow-auto rounded-2xl border border-slate-200/70 bg-white">
              <table className="min-w-full text-sm text-left">
                <thead className="sticky top-0 z-10 bg-slate-900 text-white">
                  <tr>
                    <th className="p-3 font-medium">#</th>
                    <th className="p-3 font-medium">Customer</th>
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
                      <tr key={`${row.id}-${row.paymentId}`} className="border-t border-slate-200/70 hover:bg-slate-50">
                        <td className="p-3 text-slate-700">{page * size + i + 1}</td>
                        <td className="p-3 text-slate-900">{row.customerName}</td>
                        <td className="p-3 text-slate-700">{row.paymentType || "-"}</td>
                        <td className="p-3 text-slate-700">{row.controlNumber || "-"}</td>
                        <td className="p-3 text-right font-semibold text-slate-900">
                          {toSafeNumber(row.amount).toLocaleString()}
                        </td>
                        <td className="p-3 text-right font-semibold text-slate-900">
                          {row.amountPaid == null ? "-" : toSafeNumber(row.amountPaid).toLocaleString()}
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

            {/* Summary by GFS Service */}
            <div className="mt-10">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">Summary Per Service (GFS)</h3>
                  <p className="text-sm text-slate-600">Totals grouped by service (all filtered records).</p>
                </div>

                <div className="flex gap-2 flex-wrap justify-end">
                  <div className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-700 shadow-sm">
                    Billed (all filtered):{" "}
                    <span className="font-semibold">{serverBilled.toLocaleString()} TZS</span>
                  </div>
                  <div className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-700 shadow-sm">
                    Paid (all filtered):{" "}
                    <span className="font-semibold">{serverPaid.toLocaleString()} TZS</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 overflow-auto rounded-2xl border border-slate-200/70 bg-white">
                <table className="min-w-full text-sm">
                  <thead className="sticky top-0 z-10 bg-slate-900 text-white">
                    <tr>
                      <th className="p-3 font-medium">Service Code</th>
                      <th className="p-3 font-medium">Service Name</th>
                      <th className="p-3 font-medium text-right">Total Billed (TZS)</th>
                      <th className="p-3 font-medium text-right">Total Paid (TZS)</th>
                      <th className="p-3 font-medium text-right">Transactions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summaryByService.length ? (
                      summaryByService.map((s, idx) => (
                        <tr key={`${s.serviceCode}-${idx}`} className="border-t border-slate-200/70 hover:bg-slate-50">
                          <td className="p-3 text-slate-700">{s.serviceCode}</td>
                          <td className="p-3 text-slate-900">{s.serviceDesc}</td>
                          <td className="p-3 text-right font-semibold text-slate-900">
                            {toSafeNumber(s.totalBilled).toLocaleString()}
                          </td>
                          <td className="p-3 text-right font-semibold text-slate-900">
                            {toSafeNumber(s.totalPaid).toLocaleString()}
                          </td>
                          <td className="p-3 text-right text-slate-700">
                            {toSafeNumber(s.totalTransactions).toLocaleString()}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="p-10 text-center text-slate-500">
                          No summary available.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}