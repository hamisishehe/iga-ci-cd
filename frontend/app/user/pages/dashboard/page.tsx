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
  gfs_code?: ApiGfsCode;
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

  const applyFilter = (payments: Payment[]): Payment[] => {
    const now = new Date();

    if (filterType === "day") {
      // Today
      return payments.filter(
        (p) =>
          p.dateObj.getDate() === now.getDate() &&
          p.dateObj.getMonth() === now.getMonth() &&
          p.dateObj.getFullYear() === now.getFullYear()
      );
    } else if (filterType === "yesterday") {
      // Yesterday
      const yesterday = new Date();
      yesterday.setDate(now.getDate() - 1);
      return payments.filter(
        (p) =>
          p.dateObj.getDate() === yesterday.getDate() &&
          p.dateObj.getMonth() === yesterday.getMonth() &&
          p.dateObj.getFullYear() === yesterday.getFullYear()
      );
    } else {
      // This Month
      return payments.filter(
        (p) =>
          p.dateObj.getMonth() === now.getMonth() &&
          p.dateObj.getFullYear() === now.getFullYear()
      );
    }
  };

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);

      const storedRole = localStorage.getItem("userRole") || "";
      const storedCentre = localStorage.getItem("centre") || "";
      setRole(storedRole);
      setUserCentre(storedCentre);

      const res = await fetch(`${apiUrl}/collections/get`);
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const data: ApiItem[] = await res.json();

      const mappedData: Payment[] = data.map((item) => {
        const dateIso = item.date ?? "";
        const dateObj = new Date(dateIso);
        const datePart = dateIso.split("T")[0] || "";
        const serviceDesc = item.gfs_code?.description ?? "";
        return {
          name: item.customer?.name ?? "Unknown",
          center: item.customer?.centre?.name ?? "No Center",
          zone: item.customer?.centre?.zones?.name ?? "-",
          serviceCode: item.gfs_code?.code ?? "N/A",
          service: serviceDesc,
          course: formatCourseName(serviceDesc),
          amount: Number(item.amount ?? 0),
          date: datePart,
          dateObj,
        };
      });

      let filteredData = mappedData;
      // Filter by role
      if (storedRole === "CHIEF_ACCOUNTANT") {
        filteredData = mappedData.filter((p) => p.center === storedCentre);
      }

      // Apply day/month filter
      filteredData = applyFilter(filteredData);

      // Summary calculations
      const serviceAcc: Record<string, ServiceSummary> = {};
      const centerAcc: Record<string, CenterSummary> = {};

      for (const p of filteredData) {
        const sKey = p.serviceCode || p.service;
        if (!serviceAcc[sKey])
          serviceAcc[sKey] = {
            serviceCode: sKey,
            service: p.service,
            total: 0,
          };
        serviceAcc[sKey].total += p.amount;

        const cKey = p.center || "UNKNOWN";
        if (!centerAcc[cKey]) centerAcc[cKey] = { center: cKey, total: 0 };
        centerAcc[cKey].total += p.amount;
      }

      const serviceSummary = Object.values(serviceAcc).sort(
        (a, b) => b.total - a.total
      );
      const centersSummary = Object.values(centerAcc);
      const topCenters = [...centersSummary]
        .sort((a, b) => b.total - a.total)
        .slice(0, 3);
      const bottomCenters = [...centersSummary]
        .sort((a, b) => a.total - b.total)
        .slice(0, 3);

      const uniquePaymentsMap = new Map<string, Payment>();
      for (const p of mappedData) {
        const key = `${p.name}-${p.service}-${p.amount}-${p.date}`;
        if (!uniquePaymentsMap.has(key)) uniquePaymentsMap.set(key, p);
      }
      const recentPayments = [...uniquePaymentsMap.values()]
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
      console.error("❌ Error fetching dashboard data:", error);
      setLoading(false);
    }
  }, [apiUrl, filterType]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
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
    <div className="p-6 space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/user/pages/dashboard">
              {role === "DG" ? "Director General" : "Accountant"}
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>Dashboard</BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Filter Buttons */}
      <div className="flex gap-2 mb-4">
       
        <Button
          variant={filterType === "yesterday" ? "default" : "outline"}
          onClick={() => setFilterType("yesterday")}
        >
          Yesterday
        </Button>
         <Button
          variant={filterType === "day" ? "default" : "outline"}
          onClick={() => setFilterType("day")}
        >
          Today
        </Button>
        <Button
          variant={filterType === "month" ? "default" : "outline"}
          onClick={() => setFilterType("month")}
        >
          This Month
        </Button>
      </div>

      {/* Stats Cards */}
      <div
        className={`grid gap-4 ${
          role === "DG"
            ? "sm:grid-cols-2 lg:grid-cols-4"
            : "sm:grid-cols-2 lg:grid-cols-3"
        }`}
      >
        <Card className="text-center">
          <CardContent className="pt-6">
            <Banknote size={30} className="mx-auto text-green-500 mb-2" />
            <CardTitle>
              Total Income ({filterType === "day" ? "Today" : "This Month"})
            </CardTitle>
            <p className="text-lg font-bold text-green-600">
              {summary.totalIncome.toLocaleString()} TZS
            </p>
          </CardContent>
        </Card>

        <Card className="text-center">
          <CardContent className="pt-6">
            <FileText size={30} className="mx-auto text-blue-500 mb-2" />
            <CardTitle>
              Total Transactions (
              {filterType === "day" ? "Today" : "This Month"})
            </CardTitle>
            <p className="text-lg font-bold text-blue-600">
              {summary.totalTransactions}
            </p>
          </CardContent>
        </Card>

        <Card className="text-center h-fit">
          <CardContent className="pt-6">
            <PieChart
              size={30}
              className="mx-auto text-yellow-500 mb-2 h-full"
            />
            <CardTitle>Top Service</CardTitle>
            <p className="text-lg font-bold text-yellow-600">
              {summary.topServices[0]?.service
                ? formatServiceName(summary.topServices[0].service)
                : "-"}
            </p>
          </CardContent>
        </Card>

        {role === "DG" && (
          <Card className="text-center">
            <CardContent className="pt-6">
              <Building2 size={30} className="mx-auto text-indigo-500 mb-2" />
              <CardTitle>Top Center</CardTitle>
              <p className="text-lg font-bold text-indigo-600">
                {summary.topCenters[0]?.center || "-"}
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      <Separator />

      {/* Charts */}
      {role === "DG" && (
        <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Top Services</CardTitle>
            </CardHeader>
            <CardContent className="h-64 sm:h-80">
              <Bar
                data={barData}
                options={{ responsive: true, maintainAspectRatio: false }}
              />
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Top 3 Centers</CardTitle>
              </CardHeader>
              <CardContent className="h-56 sm:h-64">
                <Doughnut
                  data={topCentersData}
                  options={{ responsive: true, maintainAspectRatio: false }}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Bottom 3 Centers</CardTitle>
              </CardHeader>
              <CardContent className="h-56 sm:h-64">
                <Doughnut
                  data={bottomCentersData}
                  options={{ responsive: true, maintainAspectRatio: false }}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {role === "CHIEF_ACCOUNTANT" && (
        <div className="grid gap-6 grid-cols-1 lg:grid-cols-1">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Top Services</CardTitle>
            </CardHeader>
            <CardContent className="h-64 sm:h-80">
              <Bar
                data={barData}
                options={{ responsive: true, maintainAspectRatio: false }}
              />
            </CardContent>
          </Card>
        </div>
      )}

      <Separator />

      {/* Recent Payments */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Payments</CardTitle>
          <CardDescription>
            Latest 8 transactions{" "}
            {role === "CHIEF_ACCOUNTANT"
              ? `(filtered by your center, ${
                  filterType === "day" ? "today" : "this month"
                })`
              : ""}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-auto max-h-64">
            <table className="w-full text-sm border">
              <thead className="bg-muted text-left sticky top-0">
                <tr>
                  <th className="p-2">Name</th>
                  <th className="p-2">Service</th>
                  <th className="p-2">Amount</th>
                  <th className="p-2">Date Paid</th>
                </tr>
              </thead>
              <tbody>
                {summary.recentPayments.map((p, i) => (
                  <tr key={i} className="border-t">
                    <td className="p-2">{p.name}</td>
                    <td className="p-2">{formatServiceName(p.service)}</td>
                    <td className="p-2">{p.amount.toLocaleString()} TZS</td>
                    <td className="p-2">{p.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
