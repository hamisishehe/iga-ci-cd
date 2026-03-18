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

/** -------- types from backend (PAYMENTS + GFS MODE) -------- */
interface PaymentRow {
  id: number;
  paymentId: number;
  customerName: string;
  centreName: string;
  zoneName: string;
  serviceCode: string;
  serviceDesc: string;
  paymentType?: string;
  controlNumber?: string;
  totalBilled: number;
  totalPaid?: number;
  paymentDate: string;
}

interface ServiceSummaryRow {
  serviceCode: string;
  serviceDesc: string;
  totalBilled: number;
  totalPaid: number;
  totalTransactions: number;
}

interface ReportRow {
  id: number;
  customerName: string;
  centreName: string;
  zoneName: string;
  serviceCode: string;
  serviceDesc: string;
  paymentType?: string;
  controlNumber: string;
  amount: number;
  amountPaid?: number;
  datePaid: string;
  paymentId: number;
}

interface ReportFilters {
  centres?: string[];
  zones?: string[];
  services?: Array<{ serviceCode: string; serviceDesc: string }>;
}

interface ReportResponse extends ReportFilters {
  totalIncome: number;
  totalTransactions: number;
  totalPaid: number;
  totalAmount: number;

  page: number;
  size: number;
  totalElements: number;
  totalPages: number;

  rows: PaymentRow[];
  summaryByService: ServiceSummaryRow[];
}

/** -------- helpers -------- */
const pad2 = (n: number) => String(n).padStart(2, "0");
const formatDate = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

const toSafeNumber = (v: any) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const safeStr = (v: any) => (v == null ? "" : String(v));
const normalizeText = (v: any) => safeStr(v).trim();

export default function CollectionReport() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "/api";

  // dates
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const [centre, setCentre] = useState("ALL");
  const [zone, setZone] = useState("ALL");
  const [serviceCode, setServiceCode] = useState("ALL");

  // data
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
  const [loadingCentres, setLoadingCentres] = useState(false);

  // paging
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState<number>(10);
  const size = pageSize === -1 ? 100000 : pageSize;
  const [totalPages, setTotalPages] = useState(1);

  // role
  const userType = (typeof window !== "undefined" ? localStorage.getItem("userType") || "" : "").toUpperCase();
  const userCentre = typeof window !== "undefined" ? localStorage.getItem("centre") || "" : "";
  const userZone = typeof window !== "undefined" ? localStorage.getItem("zone") || "" : "";

  const isHQUser = userType === "HQ";
  const isCentreUser = userType === "CENTRE" && Boolean(userCentre);
  const isZoneUser = userType === "ZONE" && Boolean(userZone);

  // init default dates and locked filters
  useEffect(() => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    setFromDate(formatDate(firstDay));
    setToDate(formatDate(lastDay));

    if (isCentreUser) setCentre(userCentre);
    if (isZoneUser) setZone(userZone);
  }, [isCentreUser, isZoneUser, userCentre, userZone]);

  /** effective filters */
  const effectiveZone = useMemo(() => {
    if (isZoneUser) return userZone;
    return zone === "ALL" ? null : zone;
  }, [isZoneUser, userZone, zone]);

  const effectiveCentre = useMemo(() => {
    if (isCentreUser) return userCentre;
    return centre === "ALL" ? null : centre;
  }, [isCentreUser, userCentre, centre]);

  const payload = useMemo(
    () => ({
      fromDate,
      toDate,
      centre: effectiveCentre,
      zone: effectiveZone,
      serviceCode: serviceCode === "ALL" ? null : serviceCode,
      page,
      size,
    }),
    [fromDate, toDate, effectiveCentre, effectiveZone, serviceCode, page, size]
  );

  const reportDebounceRef = useRef<number | null>(null);
  const centresDebounceRef = useRef<number | null>(null);

  const fetchCentresByZone = async (zoneValue?: string | null) => {
    try {
      setLoadingCentres(true);

      const token = localStorage.getItem("authToken");
      const apiKey = process.env.NEXT_PUBLIC_API_KEY;

      if (!token || !apiKey) {
        toast.error("Missing authentication credentials");
        setCentreOptions([]);
        return;
      }

      const cleanZone = zoneValue && zoneValue !== "ALL" ? zoneValue : null;
      const q = cleanZone ? `?zone=${encodeURIComponent(cleanZone)}` : "";

      console.log("Fetching centres with zone:", cleanZone);

      const res = await fetch(`${apiUrl}/payments/centres${q}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "X-API-KEY": apiKey,
        },
        cache: "no-store",
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(`HTTP ${res.status} ${txt}`);
      }

      const data = await res.json();
      const centres = Array.isArray(data) ? data.map((x) => normalizeText(x)).filter(Boolean) : [];

      setCentreOptions(centres);
    } catch (error) {
      console.error(error);
      setCentreOptions([]);
      toast.error("Failed to load centres");
    } finally {
      setLoadingCentres(false);
    }
  };

  const fetchReport = async (body: any) => {
    setLoading(true);

    try {
      const token = localStorage.getItem("authToken");
      const apiKey = process.env.NEXT_PUBLIC_API_KEY;

      if (!token || !apiKey) {
        toast.error("Missing authentication credentials");
        setLoading(false);
        return;
      }

      const res = await fetch(`${apiUrl}/payments/report`, {
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

      const normalizedRows: ReportRow[] = (data.rows || []).map((p) => {
        const billed = toSafeNumber(p.totalBilled);
        const paidRaw = p.totalPaid;

        return {
          id: toSafeNumber(p.id),
          paymentId: toSafeNumber(p.paymentId),
          customerName: safeStr(p.customerName),
          centreName: safeStr(p.centreName),
          zoneName: safeStr(p.zoneName),
          serviceCode: safeStr(p.serviceCode),
          serviceDesc: safeStr(p.serviceDesc),
          paymentType: safeStr(p.paymentType),
          controlNumber: safeStr(p.controlNumber),
          amount: billed,
          amountPaid: paidRaw == null ? undefined : toSafeNumber(paidRaw),
          datePaid: safeStr(p.paymentDate),
        };
      });

      setRows(normalizedRows);

      setSummaryByService(
        (data.summaryByService || []).map((s) => ({
          serviceCode: safeStr(s.serviceCode),
          serviceDesc: safeStr(s.serviceDesc),
          totalBilled: toSafeNumber(s.totalBilled),
          totalPaid: toSafeNumber(s.totalPaid),
          totalTransactions: toSafeNumber(s.totalTransactions),
        }))
      );

      setTotalIncome(toSafeNumber(data.totalIncome));
      setTotalTransactions(toSafeNumber(data.totalTransactions));
      setTotalAmount(toSafeNumber(data.totalAmount));
      setTotalPaid(toSafeNumber(data.totalPaid));
      setTotalPages(Math.max(1, toSafeNumber(data.totalPages) || 1));

      const serverZones = (data.zones || []).map((z) => normalizeText(z)).filter(Boolean);
      const fallbackZones = Array.from(new Set(normalizedRows.map((r) => normalizeText(r.zoneName)).filter(Boolean)));

      const serverServices = (data.services || [])
        .filter((s) => s?.serviceCode && s?.serviceDesc)
        .map((s) => ({
          serviceCode: safeStr(s.serviceCode),
          serviceDesc: safeStr(s.serviceDesc),
        }));

      const fallbackServices = Array.from(
        new Map(
          normalizedRows
            .filter((r) => r.serviceCode && r.serviceDesc)
            .map((r) => [r.serviceCode, { serviceCode: r.serviceCode, serviceDesc: r.serviceDesc }])
        ).values()
      );

      setZoneOptions(isZoneUser ? [normalizeText(userZone)] : serverZones.length ? serverZones : fallbackZones);
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

      setZoneOptions(isZoneUser ? [normalizeText(userZone)] : []);
      setServiceOptions([]);
    } finally {
      setLoading(false);
    }
  };

  // fetch report when report filters change
  useEffect(() => {
    if (!fromDate || !toDate) return;

    if (reportDebounceRef.current) window.clearTimeout(reportDebounceRef.current);

    reportDebounceRef.current = window.setTimeout(() => {
      fetchReport(payload);
    }, 250);

    return () => {
      if (reportDebounceRef.current) window.clearTimeout(reportDebounceRef.current);
    };
  }, [payload, fromDate, toDate]);

  // fetch centres only when zone context changes
  useEffect(() => {
    if (centresDebounceRef.current) window.clearTimeout(centresDebounceRef.current);

    centresDebounceRef.current = window.setTimeout(() => {
      if (isCentreUser) {
        setCentreOptions(userCentre ? [normalizeText(userCentre)] : []);
        return;
      }

      if (isZoneUser) {
        fetchCentresByZone(userZone);
        return;
      }

      fetchCentresByZone(zone === "ALL" ? null : zone);
    }, 200);

    return () => {
      if (centresDebounceRef.current) window.clearTimeout(centresDebounceRef.current);
    };
  }, [zone, isCentreUser, isZoneUser, userCentre, userZone]);

  // reset centre if current zone no longer contains it
  useEffect(() => {
    if (isCentreUser) return;
    if (centre === "ALL") return;

    const exists = centreOptions.some((c) => normalizeText(c) === normalizeText(centre));
    if (!exists) {
      setCentre("ALL");
      setPage(0);
    }
  }, [centreOptions, centre, isCentreUser]);

  const pageBilled = useMemo(() => rows.reduce((sum, r) => sum + toSafeNumber(r.amount), 0), [rows]);
  const pagePaid = useMemo(() => rows.reduce((sum, r) => sum + toSafeNumber(r.amountPaid), 0), [rows]);

  const serverBilled = useMemo(() => toSafeNumber(totalIncome), [totalIncome]);
  const serverPaid = useMemo(() => toSafeNumber(totalPaid), [totalPaid]);

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

      const sizeLabel = pageSize === -1 ? "ALL" : `size${pageSize}`;
      XLSX.writeFile(wb, `payments_${fromDate}_${toDate}_${sizeLabel}_page${page + 1}.xlsx`);
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

        <Card className="relative overflow-hidden rounded-2xl border-slate-200/60 bg-white shadow-sm">
          <CardHeader>
            <CardDescription className="text-slate-600">Filter by date, service (GFS), centre and zone</CardDescription>
          </CardHeader>

          <CardContent>
            <div className="rounded-2xl border border-slate-200/70 bg-gradient-to-b from-slate-50 to-white p-4 sm:p-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-6">
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

                {(!isCentreUser || isHQUser) && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-700">Centre</label>
                    <Select
                      value={isCentreUser ? userCentre : centre}
                      onValueChange={(v) => {
                        setPage(0);
                        setCentre(v);
                      }}
                      disabled={isCentreUser || loadingCentres}
                    >
                      <SelectTrigger className="h-10 rounded-xl border-slate-200 bg-white">
                        <SelectValue placeholder={loadingCentres ? "Loading centres..." : "All"} />
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

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-700">Rows</label>
                  <Select
                    value={String(pageSize)}
                    onValueChange={(v) => {
                      setPage(0);
                      setPageSize(Number(v));
                    }}
                  >
                    <SelectTrigger className="h-10 rounded-xl border-slate-200 bg-white">
                      <SelectValue placeholder="10" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="20">20</SelectItem>
                      <SelectItem value="30">30</SelectItem>
                      <SelectItem value="-1">All</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

              </div>
            </div>

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
                        <td className="p-3 text-slate-700">{row.datePaid ? String(row.datePaid).split("T")[0] : ""}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="p-10 text-center text-slate-500">
                        No records found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {pageSize !== -1 && (
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
            )}

            <div className="mt-10">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">Summary Per Service (GFS)</h3>
                  <p className="text-sm text-slate-600">Totals grouped by service (all filtered records).</p>
                </div>

                <div className="flex gap-2 flex-wrap justify-end">
                  <div className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-700 shadow-sm">
                    Billed (all filtered): <span className="font-semibold">{serverBilled.toLocaleString()} TZS</span>
                  </div>
                  <div className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-700 shadow-sm">
                    Paid (all filtered): <span className="font-semibold">{serverPaid.toLocaleString()} TZS</span>
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

            <div className="mt-6 flex flex-wrap gap-3 text-sm text-slate-600">
              <div className="rounded-full border border-slate-200 bg-white px-3 py-1">
                Page billed: <span className="font-semibold text-slate-900">{pageBilled.toLocaleString()} TZS</span>
              </div>
              <div className="rounded-full border border-slate-200 bg-white px-3 py-1">
                Page paid: <span className="font-semibold text-slate-900">{pagePaid.toLocaleString()} TZS</span>
              </div>
              <div className="rounded-full border border-slate-200 bg-white px-3 py-1">
                Showing: <span className="font-semibold text-slate-900">{pageSize === -1 ? "All" : pageSize}</span>
              </div>
              <div className="rounded-full border border-slate-200 bg-white px-3 py-1">
                Total amount: <span className="font-semibold text-slate-900">{toSafeNumber(totalAmount).toLocaleString()} TZS</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}