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
import { toast } from "sonner";
import { motion } from "framer-motion";

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
  amount: number;
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
  totalPaid: number;

  page: number;
  size: number;
  totalElements: number;
  totalPages: number;

  rows: ReportRow[];
  summaryByService: ServiceSummaryRow[];
  totalAmount: number;
}

/** -------- helpers -------- */
const pad2 = (n: number) => String(n).padStart(2, "0");
const formatDate = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

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
  const [totalPaid, setTotalPaid] = useState(0);

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

  /** ✅ Effective filters (respect role locks) */
  const effectiveZone = useMemo(() => {
    if (isZoneUser) return userZone; // locked
    return zone === "ALL" ? null : zone;
  }, [isZoneUser, userZone, zone]);

  const effectiveCentre = useMemo(() => {
    if (isCentreUser) return userCentre; // locked
    return centre === "ALL" ? null : centre;
  }, [isCentreUser, userCentre, centre]);

  /** build request payload */
  const payload = useMemo(() => {
    return {
      fromDate,
      toDate,
      centre: effectiveCentre,
      zone: effectiveZone,
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
    // if zone is ALL (or null), show all centres
    if (!effectiveZone) return centreOptions;

    // build zone->centres map from current rows
    const centresInThisZone = Array.from(
      new Set(
        rows
          .filter((r) => (r.zoneName || "").trim() === String(effectiveZone).trim())
          .map((r) => (r.centreName || "").trim())
          .filter(Boolean)
      )
    );

    // if rows don't contain mapping (e.g. empty page), fallback to all centres
    if (!centresInThisZone.length) return centreOptions;

    // keep only centres that are in this zone
    const set = new Set(centresInThisZone);
    return (centreOptions || []).filter((c) => set.has(String(c).trim()));
  }, [centreOptions, rows, effectiveZone]);

  /** ✅ If zone changes and selected centre is not valid, reset */
  useEffect(() => {
    if (isCentreUser) return;

    // if centre is ALL, fine
    if (centre === "ALL") return;

    const exists = filteredCentreOptions.includes(centre);
    if (!exists) {
      setCentre("ALL");
      setPage(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredCentreOptions, effectiveZone]);

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
    <motion.div
      className="p-6 space-y-6"
      initial="hidden"
      animate="show"
      variants={{
        hidden: { opacity: 0 },
        show: { opacity: 1, transition: { staggerChildren: 0.12 } },
      }}
    >
      {/* Breadcrumb */}
      <motion.div
        className="flex items-center justify-between"
        variants={{
          hidden: { opacity: 0, y: 14 },
          show: { opacity: 1, y: 0 },
        }}
        transition={{ duration: 0.45, ease: "easeOut" }}
      >
        <Breadcrumb className="px-1 sm:px-2">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink
                href="/user/pages/dashboard"
                className="font-semibold text-slate-800"
              >
                Dashboard
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem className="text-slate-600">Collections</BreadcrumbItem>
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
      <motion.div
        className="grid gap-4 sm:grid-cols-4"
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.2 }}
        variants={{
          hidden: { opacity: 0 },
          show: { opacity: 1, transition: { staggerChildren: 0.12 } },
        }}
      >
        <motion.div
          variants={{
            hidden: { opacity: 0, y: 16, scale: 0.98 },
            show: { opacity: 1, y: 0, scale: 1 },
          }}
          whileHover={{ y: -4, scale: 1.01 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
        >
          <Card className="rounded-2xl border border-slate-200/60 bg-gradient-to-br from-blue-50 via-white to-blue-100 shadow-sm hover:shadow-md transition">
            <CardHeader>
              <CardDescription className="text-slate-600">Total Billed</CardDescription>
            </CardHeader>
            <CardContent className="text-2xl font-semibold text-slate-900">
              {toSafeNumber(totalIncome).toLocaleString()}{" "}
              <span className="text-sm text-slate-500">TZS</span>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          variants={{
            hidden: { opacity: 0, y: 16, scale: 0.98 },
            show: { opacity: 1, y: 0, scale: 1 },
          }}
          whileHover={{ y: -4, scale: 1.01 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
        >
          <Card className="rounded-2xl border border-slate-200/60 bg-gradient-to-br from-green-50 via-white to-green-100 shadow-sm hover:shadow-md transition">
            <CardHeader>
              <CardDescription className="text-slate-600">Total Paid</CardDescription>
            </CardHeader>
            <CardContent className="text-2xl font-semibold text-slate-900">
              {toSafeNumber(totalPaid).toLocaleString()}{" "}
              <span className="text-sm text-slate-500">TZS</span>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          variants={{
            hidden: { opacity: 0, y: 16, scale: 0.98 },
            show: { opacity: 1, y: 0, scale: 1 },
          }}
          whileHover={{ y: -4, scale: 1.01 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
        >
          <Card className="rounded-2xl border border-slate-200/60 bg-gradient-to-br from-purple-50 via-white to-purple-100 shadow-sm hover:shadow-md transition">
            <CardHeader>
              <CardDescription className="text-slate-600">Total Transactions</CardDescription>
            </CardHeader>
            <CardContent className="text-2xl font-semibold text-slate-900">
              {toSafeNumber(totalTransactions).toLocaleString()}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          variants={{
            hidden: { opacity: 0, y: 16, scale: 0.98 },
            show: { opacity: 1, y: 0, scale: 1 },
          }}
          whileHover={{ y: -4, scale: 1.01 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
        >
          <Card className="rounded-2xl border border-slate-200/60 bg-gradient-to-br from-orange-50 via-white to-orange-100 shadow-sm hover:shadow-md transition">
            <CardHeader>
              <CardDescription className="text-slate-600">Total Amount (Filtered)</CardDescription>
            </CardHeader>
            <CardContent className="text-2xl font-semibold text-slate-900">
              {toSafeNumber(totalAmount).toLocaleString()}{" "}
              <span className="text-sm text-slate-500">TZS</span>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      {/* Filter + Table Card */}
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        <Card className="relative overflow-hidden rounded-2xl border-slate-200/60 bg-white shadow-sm">
          <CardHeader className="relative">
            <CardDescription className="text-slate-600">
              Filter by date, service (name), centre and zone
            </CardDescription>
          </CardHeader>

          <CardContent className="relative">
            {/* Filters */}
            <motion.div
              className="rounded-2xl border border-slate-200/70 bg-gradient-to-b from-slate-50 to-white p-4 sm:p-5"
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.45, ease: "easeOut" }}
            >
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

                <div className="md:col-span-1 flex items-end">
                  <div className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
                    Tip: data is filtered on server (fast).
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Table */}
            <motion.div
              className="mt-6 overflow-auto rounded-2xl border border-slate-200/70 bg-white"
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.45, ease: "easeOut" }}
            >
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
                      <tr
                        key={row.id}
                        className="border-t border-slate-200/70 hover:bg-slate-50"
                      >
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
            </motion.div>

            {/* Pagination */}
            <motion.div
              className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            >
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
            </motion.div>

            {/* Summary by Service */}
            <motion.div
              className="mt-10"
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.45, ease: "easeOut" }}
            >
              <div className="flex items-end justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">Summary Per Service</h3>
                  <p className="text-sm text-slate-600">Totals grouped by service.</p>
                </div>

                <div className="flex gap-2">
                  <div className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-700 shadow-sm">
                    Billed:{" "}
                    <span className="font-semibold">
                      {toSafeNumber(totalAmount).toLocaleString()} TZS
                    </span>
                  </div>
                  <div className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-700 shadow-sm">
                    Paid:{" "}
                    <span className="font-semibold">
                      {toSafeNumber(totalPaid).toLocaleString()} TZS
                    </span>
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
                      <tr
                        key={s.serviceCode}
                        className="border-t border-slate-200/70 hover:bg-slate-50"
                      >
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
            </motion.div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  </motion.div>
);

}
