"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Bar, Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";

import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Banknote, FileText, PieChart } from "lucide-react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);

interface Payment {
  name: string;
  center: string;
  zone: string;
  serviceCode: string;
  service: string;
  course: string;
  amountBilled: number;
  date: string; // YYYY-MM-DD (from backend datePaid)
  ts: number;
}

interface ServiceSummary {
  serviceCode: string;
  service: string;
  total: number;
}

interface CenterSummary {
  center: string;
  total: number;
}

interface Summary {
  totalIncome: number;
  totalTransactions: number;
  topServices: ServiceSummary[];
  topCenters: CenterSummary[];
  bottomCenters: CenterSummary[];
  recentPayments: Payment[];
}

// Backend response (flexible)
type DashboardSummaryResponse = {
  totalIncome?: number | string;
  totalTransactions?: number | string;
  topServices?: Array<{
    serviceCode?: string;
    service?: string;
    total?: number | string;
  }>;
  topCenters?: Array<{ center?: string; total?: number | string }>;
  bottomCenters?: Array<{ center?: string; total?: number | string }>;
  recentPayments?: Array<{
    name?: string;
    center?: string;
    zone?: string;
    serviceCode?: string;
    service?: string;
    amountBilled?: number | string;
    amount?: number | string; // accept both
    datePaid?: string;
    date?: string; // accept both
  }>;
};

const safeNumber = (v: any): number => {
  if (v === null || v === undefined) return 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const pad2 = (n: number) => String(n).padStart(2, "0");
const toYMD = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

// endExclusive -> inclusive (endExclusive - 1 day)
const toInclusiveDate = (endExclusiveYmd: string) => {
  const d = new Date(`${endExclusiveYmd}T00:00:00`);
  d.setDate(d.getDate() - 1);
  return toYMD(d);
};

export default function DashboardPage() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "/api";

  const [loading, setLoading] = useState(true);

  // Role for UI permissions
  const [role, setRole] = useState<string>("");

  // ✅ userType controls filtering: CENTRE | ZONE | HQ
  const [userType, setUserType] = useState<string>("");
  const [userCentre, setUserCentre] = useState<string>("");
  const [userZone, setUserZone] = useState<string>("");

  const [filterType, setFilterType] = useState<"day" | "yesterday" | "month">("month");

  const [summary, setSummary] = useState<Summary>({
    totalIncome: 0,
    totalTransactions: 0,
    topServices: [],
    topCenters: [],
    bottomCenters: [],
    recentPayments: [],
  });

  const [lastUpdated, setLastUpdated] = useState<string>("");

  const formatServiceName = (service?: string): string => {
    if (!service) return "-";
    if (service === "Receipts from Application Fee") return "LONG AND SHORT COURSE APPLICATION FEE";
    if (service === "OTH") return "SHORT COURSES";
    if (service === "Miscellaneous receipts") return "SEPARATE PRODUCTION UNIT";
    return service.toUpperCase();
  };

  const formatCourseName = (service?: string): string => {
    if (!service) return "-";
    if (service === "OTH") return "SHORT COURSES, TAILOR MADE, CONTINUOUS LEARNING WORKSHOPS";
    if (service === "Miscellaneous receipts") return "SEPARATE PRODUCTION UNIT";
    return service.toUpperCase();
  };

  // returns { start, endExclusive } in YYYY-MM-DD
  const getRange = (type: "day" | "yesterday" | "month") => {
    const now = new Date();

    if (type === "day") {
      const start = toYMD(now);
      const end = toYMD(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1));
      return { start, end };
    }

    if (type === "yesterday") {
      const y = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
      const start = toYMD(y);
      const end = toYMD(now);
      return { start, end };
    }

    // month
    const start = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-01`;
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const end = toYMD(nextMonth);
    return { start, end };
  };

  const fetchData = useCallback(async () => {
    try {
      const token = localStorage.getItem("authToken");
      const apiKey = process.env.NEXT_PUBLIC_API_KEY;

      if (!token || !apiKey) {
        toast("Missing authentication credentials");
        return;
      }

      setLoading(true);

      // ✅ read from storage
      const storedRole = localStorage.getItem("userRole") || "";
      const storedType = localStorage.getItem("userType") || ""; // CENTRE | ZONE | HQ
      const storedCentre = localStorage.getItem("centre") || "";
      const storedZone = localStorage.getItem("zone") || "";

      setRole(storedRole);
      setUserType(storedType);
      setUserCentre(storedCentre);
      setUserZone(storedZone);

      const { start: uiStart, end: uiEndExclusive } = getRange(filterType);

      // ✅ body with correct inclusive toDate
      const body: any = {
        fromDate: uiStart,
        toDate: toInclusiveDate(uiEndExclusive),
      };

      // ✅ IMPORTANT: apply filtering by userType
      if (storedType === "CENTRE" && storedCentre) {
        body.centre = storedCentre;
      } else if (storedType === "ZONE" && storedZone) {
        body.zone = storedZone; // ✅ requires backend support for zone
      }
      // HQ: send no centre/zone => global summary

      const res = await fetch(`${apiUrl}/collections/summary`, {
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
        const text = await res.text().catch(() => "");
        console.error("Dashboard summary fetch failed:", res.status, text);
        throw new Error(`HTTP ${res.status}${text ? ` - ${text}` : ""}`);
      }

      const data: DashboardSummaryResponse = await res.json();

      console.log("DASHBOARD SUMMARY RAW:", data);

      const topServices: ServiceSummary[] = (data.topServices ?? []).map((s) => ({
        serviceCode: s.serviceCode ?? "N/A",
        service: s.service ?? "",
        total: safeNumber(s.total),
      }));

      const topCenters: CenterSummary[] = (data.topCenters ?? []).map((c) => ({
        center: c.center ?? "No Center",
        total: safeNumber(c.total),
      }));

      const bottomCenters: CenterSummary[] = (data.bottomCenters ?? []).map((c) => ({
        center: c.center ?? "No Center",
        total: safeNumber(c.total),
      }));

      const recentPayments: Payment[] = (data.recentPayments ?? []).map((p) => {
        const iso = p.datePaid ?? p.date ?? "";
        const datePart = iso.includes("T") ? iso.split("T")[0] : iso;

        const amount = p.amountBilled ?? p.amount ?? 0;

        return {
          name: p.name ?? "Unknown",
          center: p.center ?? "No Center",
          zone: p.zone ?? "-",
          serviceCode: p.serviceCode ?? "N/A",
          service: p.service ?? "",
          course: formatCourseName(p.service ?? ""),
          amountBilled: safeNumber(amount),
          date: datePart || "-",
          ts: datePart ? Date.parse(`${datePart}T00:00:00`) : 0,
        };
      });

      setSummary({
        totalIncome: safeNumber(data.totalIncome),
        totalTransactions: safeNumber(data.totalTransactions),
        topServices,
        topCenters,
        bottomCenters,
        recentPayments,
      });

      setLastUpdated(new Date().toLocaleTimeString());
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      toast("Failed to fetch dashboard data");
    } finally {
      setLoading(false);
    }
  }, [apiUrl, filterType]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Chart data
  const barData = {
    labels: summary.topServices.map((s) => formatServiceName(s.service)),
    datasets: [
      {
        label: "Amount Collected (TZS)",
        data: summary.topServices.map((s) => s.total),
        // keep your colors if you want
        backgroundColor: ["#0d6efd", "#198754", "#ffc107"],
      },
    ],
  };

  const topCentersData = {
    labels: summary.topCenters.map((c) => c.center),
    datasets: [
      {
        label: "Top Centers",
        data: summary.topCenters.map((c) => c.total),
        backgroundColor: ["#0d6efd", "#198754", "#ffc107"],
      },
    ],
  };

  const bottomCentersData = {
    labels: summary.bottomCenters.map((c) => c.center),
    datasets: [
      {
        label: "Bottom Centers",
        data: summary.bottomCenters.map((c) => c.total),
        backgroundColor: ["#dc3545", "#fd7e14", "#6c757d"],
      },
    ],
  };

  // Small badge text to confirm which filter is active
  const scopeLabel =
    userType === "CENTRE"
      ? `CENTRE: ${userCentre || "-"}`
      : userType === "ZONE"
      ? `ZONE: ${userZone || "-"}`
      : "HQ: ALL CENTRES";

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
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink href="/user/pages/dashboard">Dashboard</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>Dashboard</BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>

            <div>
              <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900">
                Financial Overview
              </h1>
              <p className="text-sm text-slate-600">
                Track income, transactions and performance at a glance.
              </p>

              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-700 shadow-sm">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  {scopeLabel}
                </span>

                <span className="text-xs text-slate-500">Last updated: {lastUpdated}</span>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-2">
            {[
              { id: "yesterday", label: "Yesterday" },
              { id: "day", label: "Today" },
              { id: "month", label: "This Month" },
            ].map((f) => {
              const active = filterType === (f.id as any);
              return (
                <Button
                  key={f.id}
                  onClick={() => setFilterType(f.id as any)}
                  className={
                    active
                      ? "h-10 rounded-xl bg-slate-900 text-white hover:bg-slate-800 shadow-sm"
                      : "h-10 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  }
                >
                  {f.label}
                </Button>
              );
            })}
          </div>
        </div>

        {/* Stats */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {/* Total Income */}
          <Card className="relative overflow-hidden rounded-2xl border-slate-200/60 bg-white shadow-sm transition hover:shadow-md">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/12 via-transparent to-teal-500/12" />
            <CardContent className="relative pt-6">
              <div className="mx-auto mb-3 grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-sm">
                <Banknote size={22} />
              </div>

              <p className="text-sm font-medium text-slate-600 text-center">
                Billed Amount{" "}
                <span className="text-slate-500">
                  (
                  {filterType === "day"
                    ? "Today"
                    : filterType === "yesterday"
                    ? "Yesterday"
                    : "This Month"}
                  )
                </span>
              </p>

              <p className="mt-2 text-center text-2xl font-semibold tracking-tight text-slate-900">
                {Number(summary?.totalIncome ?? 0).toLocaleString()}{" "}
                <span className="text-sm font-medium text-slate-500">TZS</span>
              </p>

              <div className="mt-3 flex items-center justify-center gap-2 text-xs text-slate-600">
                <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                Updated by selected filter
              </div>
            </CardContent>
          </Card>

          {/* Total Transactions */}
          <Card className="relative overflow-hidden rounded-2xl border-slate-200/60 bg-white shadow-sm transition hover:shadow-md">
            <div className="absolute inset-0 bg-gradient-to-br from-sky-500/12 via-transparent to-indigo-500/12" />
            <CardContent className="relative pt-6">
              <div className="mx-auto mb-3 grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-sky-500 to-indigo-500 text-white shadow-sm">
                <FileText size={22} />
              </div>

              <p className="text-sm font-medium text-slate-600 text-center">
                Total Transactions{" "}
                <span className="text-slate-500">
                  (
                  {filterType === "day"
                    ? "Today"
                    : filterType === "yesterday"
                    ? "Yesterday"
                    : "This Month"}
                  )
                </span>
              </p>

              <p className="mt-2 text-center text-2xl font-semibold tracking-tight text-slate-900">
                {Number(summary?.totalTransactions ?? 0)}
              </p>

              <div className="mt-3 flex items-center justify-center gap-2 text-xs text-slate-600">
                <span className="inline-flex h-2 w-2 rounded-full bg-sky-500" />
                Count of completed payments
              </div>
            </CardContent>
          </Card>

          {/* Top Service */}
          <Card className="relative overflow-hidden rounded-2xl border-slate-200/60 bg-white shadow-sm transition hover:shadow-md">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/12 via-transparent to-orange-500/12" />
            <CardContent className="relative pt-6">
              <div className="mx-auto mb-3 grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-sm">
                <PieChart size={22} />
              </div>

              <p className="text-sm font-medium text-slate-600 text-center">Top Service</p>

              <p className="mt-2 text-center text-xl font-semibold tracking-tight text-slate-900">
                {summary?.topServices?.[0]?.service ? formatServiceName(summary.topServices[0].service) : "-"}
              </p>

              <div className="mt-3 flex items-center justify-center gap-2 text-xs text-slate-600">
                <span className="inline-flex h-2 w-2 rounded-full bg-amber-500" />
                Highest revenue contributor
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        {(role === "DIRECTOR_GENERAL" ||
          role === "DIRECTOR_OF_FINANCE" ||
          role === "FINANCE_MANAGER") && (
          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Analytics</h2>
                <p className="text-sm text-slate-600">Revenue insights across services and centers</p>
              </div>

              <div className="hidden sm:flex items-center gap-2">
                <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-600 shadow-sm">
                  Updated: Live
                </span>
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-12">
              <Card className="lg:col-span-8 rounded-2xl border border-slate-200/60 bg-gradient-to-br from-white via-white to-slate-50 shadow-sm">
                <CardHeader className="flex flex-row items-start justify-between gap-4">
                  <div className="space-y-1">
                    <CardTitle className="text-base text-slate-900">Top Services</CardTitle>
                    <p className="text-xs text-slate-600">Revenue comparison across services</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-medium text-white">
                      Bar
                    </span>
                  </div>
                </CardHeader>

                <CardContent className="h-72 sm:h-80">
                  <div className="h-full rounded-2xl border border-slate-200/60 bg-gradient-to-b from-slate-50 to-white p-3">
                    <Bar data={barData} options={{ responsive: true, maintainAspectRatio: false }} />
                  </div>
                </CardContent>
              </Card>

              <div className="lg:col-span-4 space-y-6">
                <Card className="rounded-2xl border border-slate-200/60 bg-gradient-to-br from-white via-white to-slate-50 shadow-sm">
                  <CardHeader className="flex flex-row items-start justify-between gap-4">
                    <div className="space-y-1">
                      <CardTitle className="text-base text-slate-900">Top 3 Centers</CardTitle>
                      <p className="text-xs text-slate-600">Highest revenue centers</p>
                    </div>
                    <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-600">
                      Doughnut
                    </span>
                  </CardHeader>

                  <CardContent className="h-56 sm:h-64">
                    <div className="h-full rounded-2xl border border-slate-200/60 bg-gradient-to-b from-slate-50 to-white p-3">
                      <Doughnut data={topCentersData} options={{ responsive: true, maintainAspectRatio: false }} />
                    </div>
                  </CardContent>
                </Card>

                <Card className="rounded-2xl border border-slate-200/60 bg-gradient-to-br from-white via-white to-slate-50 shadow-sm">
                  <CardHeader className="flex flex-row items-start justify-between gap-4">
                    <div className="space-y-1">
                      <CardTitle className="text-base text-slate-900">Bottom 3 Centers</CardTitle>
                      <p className="text-xs text-slate-600">Lowest revenue centers</p>
                    </div>
                    <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-600">
                      Doughnut
                    </span>
                  </CardHeader>

                  <CardContent className="h-56 sm:h-64">
                    <div className="h-full rounded-2xl border border-slate-200/60 bg-gradient-to-b from-slate-50 to-white p-3">
                      <Doughnut
                        data={bottomCentersData}
                        options={{ responsive: true, maintainAspectRatio: false }}
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </section>
        )}

        {(role === "BURSAR" ||
          role === "ACCOUNT_OFFICER" ||
          role === "ASSISTANT_ACCOUNT_OFFICER" ||
          role === "PRINCIPAL") && (
          <section className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Analytics</h2>
              <p className="text-sm text-slate-600">Summary filtered by your center</p>
            </div>

            <Card className="rounded-2xl border border-slate-200/60 bg-gradient-to-br from-white via-white to-slate-50 shadow-sm">
              <CardHeader className="flex flex-row items-start justify-between gap-4">
                <div className="space-y-1">
                  <CardTitle className="text-base text-slate-900">Top Services</CardTitle>
                  <p className="text-xs text-slate-600">Revenue by service</p>
                </div>

                <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-medium text-white">
                  Bar
                </span>
              </CardHeader>

              <CardContent className="h-72 sm:h-80">
                <div className="h-full rounded-2xl border border-slate-200/60 bg-gradient-to-b from-slate-50 to-white p-3">
                  <Bar data={barData} options={{ responsive: true, maintainAspectRatio: false }} />
                </div>
              </CardContent>
            </Card>
          </section>
        )}

        <Separator className="bg-slate-200/70" />

        {/* Recent Payments */}
        <Card className="rounded-2xl border-slate-200/60 bg-white shadow-sm">
          <CardHeader className="flex flex-col gap-1">
            <CardTitle className="text-base text-slate-900">Recent Payments</CardTitle>
            <CardDescription className="text-slate-600">Latest 8 transactions</CardDescription>
          </CardHeader>

          <CardContent>
            <div className="overflow-auto max-h-72 rounded-2xl border border-slate-200/70">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left sticky top-0 z-10">
                  <tr className="border-b border-slate-200/70">
                    <th className="p-3 font-medium text-slate-700">Name</th>
                    <th className="p-3 font-medium text-slate-700">Service</th>
                    <th className="p-3 font-medium text-slate-700">Center</th>
                    <th className="p-3 font-medium text-slate-700">Zone</th>
                    <th className="p-3 font-medium text-slate-700">Amount</th>
                    <th className="p-3 font-medium text-slate-700">Date Paid</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.recentPayments.map((p, i) => (
                    <tr
                      key={i}
                      className="border-b border-slate-200/60 last:border-b-0 hover:bg-slate-50/70"
                    >
                      <td className="p-3 text-slate-800">{p.name}</td>
                      <td className="p-3 text-slate-700">{formatServiceName(p.service)}</td>
                      <td className="p-3 text-slate-700">{p.center}</td>
                      <td className="p-3 text-slate-700">{p.zone}</td>
                      <td className="p-3 font-semibold text-slate-900">
                        {p.amountBilled.toLocaleString()}{" "}
                        <span className="font-medium text-slate-500">TZS</span>
                      </td>
                      <td className="p-3 text-slate-700">{p.date}</td>
                    </tr>
                  ))}
                  {summary.recentPayments.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-slate-500">
                        No recent payments found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
