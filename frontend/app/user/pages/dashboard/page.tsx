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
import { Banknote, FileText, PieChart, Building2 } from "lucide-react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { fi } from "zod/v4/locales";
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
  date: string;
  dateObj: Date;
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
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api";

  const CENTER_RESTRICTED_ROLES = ["BURSAR", "ACCOUNT_OFFICER","ASSISTANT_ACCOUNT_OFFICER","PRINCIPAL"];
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

  const filterByDate = (payments: Payment[], filterType: "day" | "yesterday" | "month") => {
  const now = new Date();

  // Start of today (00:00:00)
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

  // Start & end of yesterday
  const yesterdayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  const yesterdayEnd = todayStart;

  // Start & end of this month
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  return payments.filter((p) => {
    const d = p.dateObj;

    if (filterType === "day") {
      return d >= todayStart && d < todayEnd;
    }

    if (filterType === "yesterday") {
      return d >= yesterdayStart && d < yesterdayEnd;
    }

    // this month
    return d >= monthStart && d < monthEnd;
  });
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
        "Authorization": `Bearer ${token}`, 
        "X-API-KEY": apiKey,              
      },
    });
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const data: ApiItem[] = await res.json();

    console.log(data);
    const mappedData: Payment[] = data
      .map((item) => {
        const dateIso = item.date ?? "";
        if (!dateIso) return null; // skip invalid

        const dateObj = new Date(dateIso);
        // Handle invalid dates
        if (isNaN(dateObj.getTime())) return null;

        const datePart = dateIso.split("T")[0];
        const serviceDesc = item.gfsCode?.description ?? "";

        return {
          name: item.customer?.name ?? "Unknown",
          center: item.customer?.centre?.name ?? "No Center",
          zone: item.customer?.centre?.zones?.name ?? "-",
          serviceCode: item.gfsCode?.code ?? "N/A",
          service: serviceDesc,
          course: formatCourseName(serviceDesc),
          amount: Number(item.amount ?? 0),
          date: datePart,
          dateObj,
        };
      })
      .filter(Boolean) as Payment[]; // remove nulls

    // Step 1: Role-based filtering (CHIEF_ACCOUNTANT sees only their center)
   // Step 1: Role-based filtering
let filteredData: Payment[] = CENTER_RESTRICTED_ROLES.includes(storedRole)
  ? mappedData.filter((p) => p.center === storedCentre)
  : mappedData;

// Step 2: Date filtering (Today / Yesterday / Month)
filteredData = filterByDate(filteredData, filterType);



    // Rest of summary calculation remains same...
    const serviceAcc: Record<string, ServiceSummary> = {};
    const centerAcc: Record<string, CenterSummary> = {};

    for (const p of filteredData) {
      const sKey = p.serviceCode || p.service || "Unknown";
      if (!serviceAcc[sKey]) {
        serviceAcc[sKey] = {
          serviceCode: sKey,
          service: p.service,
          total: 0,
        };
      }
      serviceAcc[sKey].total += p.amount;

      const cKey = p.center || "Unknown";
      if (!centerAcc[cKey]) {
        centerAcc[cKey] = { center: cKey, total: 0 };
      }
      centerAcc[cKey].total += p.amount;
    }

    const serviceSummary = Object.values(serviceAcc)
      .sort((a, b) => b.total - a.total);

    const centersSummary = Object.values(centerAcc);
    const topCenters = [...centersSummary]
      .sort((a, b) => b.total - a.total)
      .slice(0, 3);
    const bottomCenters = [...centersSummary]
      .sort((a, b) => a.total - b.total)
      .slice(0, 3);

    // Recent payments - global (not filtered by time), latest 8 unique
    const uniquePaymentsMap = new Map<string, Payment>();
    for (const p of mappedData) {
      const key = `${p.name}-${p.service}-${p.amount}-${p.date}`;
      if (!uniquePaymentsMap.has(key)) {
        uniquePaymentsMap.set(key, p);
      }
    }
    const recentPayments = Array.from(uniquePaymentsMap.values())
      .sort((a, b) => b.dateObj.getTime() - a.dateObj.getTime())
      .slice(0, 8);

    setSummary({
      totalIncome: filteredData.reduce((sum, p) => sum + p.amount, 0),
      totalTransactions: filteredData.length,
      topServices: serviceSummary.slice(0, 3),
      topCenters,
      bottomCenters,
      recentPayments,
    });

    setLastUpdated(new Date().toLocaleTimeString());
    setLoading(false);
  } catch (error) {
    console.error("Error fetching dashboard data:", error);
    setLoading(false);
  }
}, [apiUrl, filterType, userCentre]); 

  useEffect(() => {
    fetchData();

    console.log("=======================>");
    console.log(role);
     console.log("=======================>");

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
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-sky-800 border-solid"></div>
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
<div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
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

      <p className="text-sm font-medium text-slate-600 text-center">Top Service</p>

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

  {/* Top Center (DG/DOF/FINANCE_MANAGER only) */}
  {(role === "DIRECTOR_GENERAL" ||
    role === "DIRECTOR_OF_FINANCE" ||
    role === "FINANCE_MANAGER") && (
    <Card className="relative overflow-hidden rounded-2xl border-slate-200/60 bg-white shadow-sm transition hover:shadow-md">
      <div className="absolute inset-0 bg-gradient-to-br from-fuchsia-500/12 via-transparent to-rose-500/12" />
      <CardContent className="relative pt-6">
        <div className="mx-auto mb-3 grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-fuchsia-500 to-rose-500 text-white shadow-sm">
          <Building2 size={22} />
        </div>

        <p className="text-sm font-medium text-slate-600 text-center">Top Center</p>

        <p className="mt-2 text-center text-xl font-semibold tracking-tight text-slate-900">
          {summary?.topCenters?.[0]?.center || "-"}
        </p>

        <div className="mt-3 flex items-center justify-center gap-2 text-xs text-slate-600">
          <span className="inline-flex h-2 w-2 rounded-full bg-fuchsia-500" />
          Best performing center
        </div>
      </CardContent>
    </Card>
  )}
</div>



      {/* Charts */}
{(role === "DIRECTOR_GENERAL" ||
  role === "DIRECTOR_OF_FINANCE" ||
  role === "FINANCE_MANAGER") && (
  <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
    <Card className="rounded-2xl border-slate-200/60 bg-white shadow-sm lg:col-span-2">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-base text-slate-900">Top Services</CardTitle>
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
          <CardTitle className="text-base text-slate-900">Top 3 Centers</CardTitle>
          <p className="text-xs text-slate-600">Highest revenue centers</p>
        </CardHeader>
        <CardContent className="h-56 sm:h-64">
          <div className="h-full rounded-2xl border border-slate-200/60 bg-gradient-to-b from-slate-50 to-white p-3">
            <Doughnut
              data={topCentersData}
              options={{ responsive: true, maintainAspectRatio: false }}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-slate-200/60 bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="text-base text-slate-900">Bottom 3 Centers</CardTitle>
          <p className="text-xs text-slate-600">Lowest revenue centers</p>
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
)}


      {(role === "BURSAR" ||
  role === "ACCOUNT_OFFICER" ||
  role === "ASSISTANT_ACCOUNT_OFFICER" ||
  role === "PRINCIPAL") && (
  <div className="grid gap-6 grid-cols-1">
    <Card className="rounded-2xl border-slate-200/60 bg-white shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-base text-slate-900">Top Services</CardTitle>
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
          <CardTitle className="text-base text-slate-900">Recent Payments</CardTitle>
          <CardDescription className="text-slate-600">
            Latest 8 transactions{" "}
            {role === "CHIEF_ACCOUNTANT"
              ? `(filtered by your center, ${
                  filterType === "day" ? "today" : filterType === "yesterday" ? "yesterday" : "this month"
                })`
              : ""}
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
