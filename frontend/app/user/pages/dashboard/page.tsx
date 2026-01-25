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

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Tooltip,
  Legend
);

interface ApiGfsCode {
  code?: string;
  description?: string;
}
interface ApiCentreZones {
  name?: string;
}
interface ApiCentre {
  name?: string;
  zones?: ApiCentreZones;
}
interface ApiCustomer {
  name?: string;
  centre?: ApiCentre;
}
interface ApiItem {
  date?: string;
  amount?: number;
  customer?: ApiCustomer;
  gfsCode?: ApiGfsCode;
}

interface Payment {
  name: string;
  center: string;
  zone: string;
  serviceCode: string;
  service: string;
  course: string;
  amount: number;
  date: string; // YYYY-MM-DD
  ts: number; // numeric timestamp for recent ordering
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

export default function DashboardPage() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "/api";

  const CENTER_RESTRICTED_ROLES = [
    "BURSAR",
    "ACCOUNT_OFFICER",
    "ASSISTANT_ACCOUNT_OFFICER",
    "PRINCIPAL",
  ];

  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<string>("");
  const [userCentre, setUserCentre] = useState<string>("");
  const [filterType, setFilterType] = useState<"day" | "yesterday" | "month">(
    "month"
  );

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
    if (service === "Receipts from Application Fee")
      return "LONG AND SHORT COURSE APPLICATION FEE";
    if (service === "OTH") return "SHORT COURSES";
    if (service === "Miscellaneous receipts") return "SEPARATE PRODUCTION UNIT";
    return service.toUpperCase();
  };

  const formatCourseName = (service?: string): string => {
    if (!service) return "-";
    if (service === "OTH")
      return "SHORT COURSES, TAILOR MADE, CONTINUOUS LEARNING WORKSHOPS";
    if (service === "Miscellaneous receipts") return "SEPARATE PRODUCTION UNIT";
    return service.toUpperCase();
  };

  /**
   * SPEED IMPROVEMENTS:
   * 1) NO Date objects per row (super expensive) -> compare YYYY-MM-DD strings
   * 2) ONE PASS aggregation (no multiple map/filter/sort over full dataset)
   * 3) Recent list keeps only top 8 without sorting the whole dataset
   */

  const pad2 = (n: number) => String(n).padStart(2, "0");
  const toYMD = (d: Date) =>
    `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

  const getRange = (type: "day" | "yesterday" | "month") => {
    const now = new Date();

    if (type === "day") {
      const start = toYMD(now);
      const end = toYMD(
        new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
      );
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

      const storedRole = localStorage.getItem("userRole") || "";
      const storedCentre = localStorage.getItem("centre") || "";
      setRole(storedRole);
      setUserCentre(storedCentre);

      const res = await fetch(`${apiUrl}/collections/get`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "X-API-KEY": apiKey,
        },
        // keep default; you can change to "force-cache" only if your backend sends cache headers correctly
        cache: "no-store",
      });

      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const data: ApiItem[] = await res.json();

      const restricted = CENTER_RESTRICTED_ROLES.includes(storedRole);

      const { start: uiStart, end: uiEnd } = getRange(filterType);
      const { start: monthStart, end: monthEnd } = getRange("month");

      let totalIncome = 0;
      let totalTransactions = 0;

      const serviceAcc = new Map<string, ServiceSummary>();
      const centerAcc = new Map<string, number>(); // month-only totals

      // Recent top 8 without sorting full dataset
      const recent: Payment[] = [];
      const seenRecent = new Set<string>();

      const pushRecent = (p: Payment) => {
        const key = `${p.name}-${p.service}-${p.amount}-${p.date}`;
        if (seenRecent.has(key)) return;
        seenRecent.add(key);

        // insert in descending ts order, keep length <= 8
        let idx = 0;
        while (idx < recent.length && recent[idx].ts > p.ts) idx++;
        recent.splice(idx, 0, p);
        if (recent.length > 8) recent.pop();
      };

      for (let i = 0; i < data.length; i++) {
        const item = data[i];
        const dateIso = item.date;
        if (!dateIso) continue;

        const datePart = dateIso.includes("T")
          ? dateIso.split("T")[0]
          : dateIso; // YYYY-MM-DD
        if (datePart.length !== 10) continue;

        const center = item.customer?.centre?.name ?? "No Center";
        if (restricted && center !== storedCentre) continue;

        const serviceDesc = item.gfsCode?.description ?? "";
        const serviceCode = item.gfsCode?.code ?? "N/A";
        const amount = Number(item.amount ?? 0);

        // Build payment once (cheap)
        const p: Payment = {
          name: item.customer?.name ?? "Unknown",
          center,
          zone: item.customer?.centre?.zones?.name ?? "-",
          serviceCode,
          service: serviceDesc,
          course: formatCourseName(serviceDesc),
          amount,
          date: datePart,
          ts: Date.parse(`${datePart}T00:00:00`),
        };

        // UI filter totals + top services
        if (datePart >= uiStart && datePart < uiEnd) {
          totalIncome += amount;
          totalTransactions++;

          const sKey = serviceCode || serviceDesc || "Unknown";
          const existing = serviceAcc.get(sKey);
          if (existing) existing.total += amount;
          else
            serviceAcc.set(sKey, {
              serviceCode: sKey,
              service: serviceDesc,
              total: amount,
            });
        }

        // month-only centers (for top/bottom centers)
        if (datePart >= monthStart && datePart < monthEnd) {
          centerAcc.set(center, (centerAcc.get(center) ?? 0) + amount);
        }

        // recent payments (global)
        pushRecent(p);
      }

      const topServices = Array.from(serviceAcc.values())
        .sort((a, b) => b.total - a.total)
        .slice(0, 3);

      const centersSummary: CenterSummary[] = Array.from(centerAcc.entries()).map(
        ([center, total]) => ({ center, total })
      );

      const topCenters = [...centersSummary]
        .sort((a, b) => b.total - a.total)
        .slice(0, 3);

      const bottomCenters = [...centersSummary]
        .sort((a, b) => a.total - b.total)
        .slice(0, 3);

      setSummary({
        totalIncome,
        totalTransactions,
        topServices,
        topCenters,
        bottomCenters,
        recentPayments: recent,
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
                  <BreadcrumbLink href="/user/pages/dashboard">
                    Dashboard
                  </BreadcrumbLink>
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
              <p className="text-xs text-slate-500 mt-1">
                Last updated: {lastUpdated}
              </p>
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
                Total Income{" "}
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

              <p className="text-sm font-medium text-slate-600 text-center">
                Top Service
              </p>

              <p className="mt-2 text-center text-xl font-semibold tracking-tight text-slate-900">
                {summary?.topServices?.[0]?.service
                  ? formatServiceName(summary.topServices[0].service)
                  : "-"}
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
          <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
            <Card className="rounded-2xl border-slate-200/60 bg-white shadow-sm lg:col-span-2">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base text-slate-900">
                    Top Services
                  </CardTitle>
                  <p className="text-xs text-slate-600">
                    Revenue comparison across services
                  </p>
                </div>
                <div className="h-9 w-9 rounded-2xl bg-slate-100 grid place-items-center text-slate-700">
                  <span className="text-xs font-semibold">BAR</span>
                </div>
              </CardHeader>

              <CardContent className="h-full sm:h-80">
                <div className="h-full rounded-2xl border border-slate-200/60 bg-gradient-to-b from-slate-50 to-white p-3">
                  <Bar
                    data={barData}
                    options={{ responsive: true, maintainAspectRatio: false }}
                  />
                </div>
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card className="rounded-2xl border-slate-200/60 bg-white shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base text-slate-900">
                    Top 3 Centers
                  </CardTitle>
                  <p className="text-xs text-slate-600">
                    Highest revenue centers
                  </p>
                </CardHeader>
                <CardContent className="h-56 sm:h-64">
                  <div className="h-full rounded-2xl border border-slate-200/60 bg-gradient-to-b from-slate-50 to-white p-3">
                    <Doughnut
                      data={topCentersData}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                      }}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-2xl border-slate-200/60 bg-white shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base text-slate-900">
                    Bottom 3 Centers
                  </CardTitle>
                  <p className="text-xs text-slate-600">
                    Lowest revenue centers
                  </p>
                </CardHeader>
                <CardContent className="h-56 sm:h-64">
                  <div className="h-full rounded-2xl border border-slate-200/60 bg-gradient-to-b from-slate-50 to-white p-3">
                    <Doughnut
                      data={bottomCentersData}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                      }}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {(role === "BURSAR" ||
          role === "ACCOUNT_OFFICER" ||
          role === "ASSISTANT_ACCOUNT_OFFICER" ||
          role === "PRINCIPAL") && (
          <div className="grid gap-6 grid-cols-1">
            <Card className="rounded-2xl border-slate-200/60 bg-white shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base text-slate-900">
                    Top Services
                  </CardTitle>
                  <p className="text-xs text-slate-600">
                    Summary filtered by your center
                  </p>
                </div>
                <div className="h-9 w-9 rounded-2xl bg-slate-100 grid place-items-center text-slate-700">
                  <span className="text-xs font-semibold">BAR</span>
                </div>
              </CardHeader>

              <CardContent className="h-64 sm:h-80">
                <div className="h-full rounded-2xl border border-slate-200/60 bg-gradient-to-b from-slate-50 to-white p-3">
                  <Bar
                    data={barData}
                    options={{ responsive: true, maintainAspectRatio: false }}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <Separator className="bg-slate-200/70" />

        {/* Recent Payments */}
        <Card className="rounded-2xl border-slate-200/60 bg-white shadow-sm">
          <CardHeader className="flex flex-col gap-1">
            <CardTitle className="text-base text-slate-900">
              Recent Payments
            </CardTitle>
            <CardDescription className="text-slate-600">
              Latest 8 transactions
            </CardDescription>
          </CardHeader>

          <CardContent>
            <div className="overflow-auto max-h-72 rounded-2xl border border-slate-200/70">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left sticky top-0 z-10">
                  <tr className="border-b border-slate-200/70">
                    <th className="p-3 font-medium text-slate-700">Name</th>
                    <th className="p-3 font-medium text-slate-700">Service</th>
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
                      <td className="p-3 text-slate-700">
                        {formatServiceName(p.service)}
                      </td>
                      <td className="p-3 font-semibold text-slate-900">
                        {p.amount.toLocaleString()}{" "}
                        <span className="font-medium text-slate-500">TZS</span>
                      </td>
                      <td className="p-3 text-slate-700">{p.date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
