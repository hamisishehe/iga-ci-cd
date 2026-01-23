"use client";

import { useEffect, useState } from "react";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";

interface ServiceData {
  apportionmentId: string;
  date: string | null;
  courseName: string;
  centre: string;
  amountRemitted: number;
  executors: number;
  supporters: number;
  agencyFee: number;
  amountToBePaid: number;
}

export default function ApportionmentReport() {
  const [mounted, setMounted] = useState(false);
  const [data, setData] = useState<ServiceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [centre, setCentre] = useState("all"); // default value for placeholder
  const [centres, setCentres] = useState<string[]>([]);

  const [userType, setUserType] = useState("");
  const [userCentre, setUserCentre] = useState("");
  const [userZone, setUserZone] = useState("");

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "/api";


  useEffect(() => {
    setMounted(true);
    const userType = localStorage.getItem("userType");
    const userCentre: string = localStorage.getItem("centre") || "";
    const userZone: string = localStorage.getItem("zone") || "";

    const userPayload = JSON.parse(localStorage.getItem("userInfo") || "{}");
    setUserType(userType || "");
    setUserCentre(userCentre || "");
    setUserZone(userZone || "");

    if (userType === "CENTRE") setCentre(userCentre || "all");

    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth() + 1;
    const pad = (n: number) => n.toString().padStart(2, "0");
    const firstDay = `${year}-${pad(month)}-01`;
    const lastDay = `${year}-${pad(month)}-${pad(
      new Date(year, month, 0).getDate()
    )}`;
    setStartDate(firstDay);
    setEndDate(lastDay);

    fetchData(firstDay, lastDay, userCentre || "all");
  }, []);

  const fetchData = async (start: string, end: string, centreName: string) => {
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("authToken");
      const apiKey = process.env.NEXT_PUBLIC_API_KEY;

      if (!token || !apiKey) {
        toast("Missing authentication credentials");
        return;
      }

      const res = await fetch(`${apiUrl}/apposhments/all`, {
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
          "X-API-KEY": apiKey,
        },
      });

  
      const rows = await res.json();

      let filteredRows = [...rows];

      if (userType === "CENTRE" && userCentre) {
        filteredRows = filteredRows.filter(
          (r: any) => r.centre?.name?.toLowerCase() === userCentre.toLowerCase()
        );
      } else if (userType === "ZONE" && userZone) {
        filteredRows = filteredRows.filter(
          (r: any) => r.centre?.zone?.toLowerCase() === userZone.toLowerCase()
        );
      }

      if (centreName !== "all" && userType !== "CENTRE") {
        filteredRows = filteredRows.filter(
          (r: any) => r.centre?.name === centreName
        );
      }

      const requestedStart = new Date(start).getTime();
      const requestedEnd = new Date(end).getTime();
      const finalRows = filteredRows.filter((row: any) => {
        if (!row.startDate || !row.endDate) return false;
        const rowStart = new Date(row.startDate).getTime();
        const rowEnd = new Date(row.endDate).getTime();
        return rowEnd >= requestedStart && rowStart <= requestedEnd;
      });

      const uniqueCentres = [
        ...new Set(rows.map((r: any) => r.centre?.name).filter(Boolean)),
      ];
      setCentres(uniqueCentres as string[]);

      const flat: ServiceData[] = [];
      finalRows.forEach((apportionment: any) => {
        (apportionment.services || []).forEach((service: any) => {
          flat.push({
            apportionmentId: apportionment.id,
            date: service.createdAt || null,
            courseName: service.serviceName || "-",
            centre: apportionment.centre?.name || "-",
            amountRemitted: Number(service.serviceReturnProfit || 0),
            executors: Number(service.executors || 0),
            supporters: Number(service.supporters_to_executors || 0),
            agencyFee: Number(service.agency_fee || 0),
            amountToBePaid: Number(service.amount_paid_to_paid || 0),
          });
        });
      });

      setData(flat);
    } catch (err: any) {
      console.error(err);
      setData([]);
      setCentres([]);
      setError(err?.message || "Unable to fetch apportionment data.");
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (val: number | undefined) =>
    val != null ? Number(val).toLocaleString() : "-";

  const totals = data.reduce(
    (acc, row) => {
      acc.amountRemitted += row.amountRemitted;
      acc.executors += row.executors;
      acc.supporters += row.supporters;
      acc.agencyFee += row.agencyFee;
      acc.amountToBePaid += row.amountToBePaid;
      return acc;
    },
    {
      amountRemitted: 0,
      executors: 0,
      supporters: 0,
      agencyFee: 0,
      amountToBePaid: 0,
    }
  );

  const remaining =
    totals.amountRemitted - (totals.agencyFee + totals.amountToBePaid);

  const exportExcel = () => {
    const wsData = [
      [
        "#",
        "Date",
        "Course Name",
        "Centre",
        "Amount Remitted",
        "Executors",
        "Supporters",
        "Agency Fee",
        "Amount to be Paid",
      ],
      ...data.map((row, i) => [
        i + 1,
        row.date,
        row.courseName,
        row.centre,
        row.amountRemitted,
        row.executors,
        row.supporters,
        row.agencyFee,
        row.amountToBePaid,
      ]),
      [
        "TOTAL",
        "",
        "",
        "",
        totals.amountRemitted,
        totals.executors,
        totals.supporters,
        totals.agencyFee,
        totals.amountToBePaid,
      ],
      ["REMAINING BALANCE", "", "", "", remaining, "", "", "", ""],
    ];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Apportionment Report");
    XLSX.writeFile(wb, "apportionment_report.xlsx");
  };

  if (!mounted) return null;

  return (
  <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50">
    <div className="p-4 space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center justify-between">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink
                href="/user/chief_accountant/dashboard"
                className="font-semibold text-slate-800"
              >
                Dashboard
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem className="text-slate-600">Apportionment</BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="hidden sm:inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-700 shadow-sm">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          {userCentre}
        </div>
      </div>

      {/* Filters */}
      <Card className="relative overflow-hidden rounded-2xl border-slate-200/60 bg-white shadow-sm">
        <div className="absolute inset-0 bg-gradient-to-br from-sky-500/8 via-transparent to-indigo-500/8" />
        <CardHeader className="relative">
          <CardTitle className="text-lg text-slate-900">Filters</CardTitle>
          <CardDescription className="text-slate-600">
            Select a date range (and centre if available) to load apportionment data.
          </CardDescription>
        </CardHeader>

        <CardContent className="relative">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 items-end">
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-700">Start Date</label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-10 rounded-xl border-slate-200 bg-white"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-700">End Date</label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-10 rounded-xl border-slate-200 bg-white"
              />
            </div>

            {userType !== "CENTRE" && (
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-700">Centre</label>
                <Select value={centre} onValueChange={(val) => setCentre(val)}>
                  <SelectTrigger className="h-10 rounded-xl border-slate-200 bg-white">
                    <SelectValue placeholder="Select Centre" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Centres</SelectItem>
                    {centres.map((c, i) => (
                      <SelectItem key={i} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="lg:col-span-1">
              <Button
                className="h-10 w-full rounded-xl bg-slate-900 text-white hover:bg-slate-800 shadow-sm"
                onClick={() => fetchData(startDate, endDate, centre)}
              >
                Filter
              </Button>
            </div>

            <div className="hidden lg:block lg:col-span-2">
              <div className="h-10 rounded-xl border border-slate-200 bg-white px-3 flex items-center text-xs text-slate-600">
                Tip: Use “All Centres” to compare across locations.
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="rounded-2xl border-slate-200/60 bg-white shadow-sm">
        <CardHeader className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <CardTitle className="text-lg text-slate-900">Apportionment Data</CardTitle>
            <CardDescription className="text-slate-600">
              Breakdown per course including fees and payable amounts.
            </CardDescription>
          </div>

          <Button
            className="h-10 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm"
            onClick={exportExcel}
          >
            Export Excel
          </Button>
        </CardHeader>

        <CardContent className="overflow-x-auto">
          <div className="overflow-auto rounded-2xl border border-slate-200/70 bg-white">
            <table className="min-w-full text-sm">
              <thead className="sticky top-0 z-10 bg-slate-900 text-white">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">#</th>
                  <th className="px-4 py-3 text-left font-medium">Course Name</th>
                  <th className="px-4 py-3 text-left font-medium">Amount Remitted</th>
                  <th className="px-4 py-3 text-left font-medium">Executors</th>
                  <th className="px-4 py-3 text-left font-medium">Supporters</th>
                  <th className="px-4 py-3 text-left font-medium">Agency Fee</th>
                  <th className="px-4 py-3 text-left font-medium">Amount to be Paid</th>
                </tr>
              </thead>

              <tbody>
                {data.length > 0 ? (
                  data.map((row, i) => (
                    <tr
                      key={i}
                      className="border-t border-slate-200/70 hover:bg-slate-50"
                    >
                      <td className="px-4 py-3 text-slate-700">{i + 1}</td>
                      <td className="px-4 py-3 text-slate-900">{row.courseName}</td>
                      <td className="px-4 py-3 font-semibold text-slate-900">
                        {formatNumber(row.amountRemitted)}
                      </td>
                      <td className="px-4 py-3 text-slate-800">{formatNumber(row.executors)}</td>
                      <td className="px-4 py-3 text-slate-800">{formatNumber(row.supporters)}</td>
                      <td className="px-4 py-3 text-slate-800">{formatNumber(row.agencyFee)}</td>
                      <td className="px-4 py-3 font-semibold text-slate-900">
                        {formatNumber(row.amountToBePaid)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="px-4 py-10 text-center text-slate-500" colSpan={7}>
                      No apportionment data available
                    </td>
                  </tr>
                )}

                {/* Totals */}
                {data.length > 0 && (
                  <>
                    <tr className="border-t border-slate-200/70 bg-slate-50 font-semibold">
                      <td colSpan={2} className="px-4 py-3 text-slate-700">
                        TOTAL
                      </td>
                      <td className="px-4 py-3 text-slate-900">
                        {formatNumber(totals.amountRemitted)}
                      </td>
                      <td className="px-4 py-3 text-slate-900">
                        {formatNumber(totals.executors)}
                      </td>
                      <td className="px-4 py-3 text-slate-900">
                        {formatNumber(totals.supporters)}
                      </td>
                      <td className="px-4 py-3 text-slate-900">
                        {formatNumber(totals.agencyFee)}
                      </td>
                      <td className="px-4 py-3 text-slate-900">
                        {formatNumber(totals.amountToBePaid)}
                      </td>
                    </tr>

                    <tr className="border-t border-slate-200/70 bg-slate-50 font-semibold">
                      <td colSpan={2} className="px-4 py-3 text-slate-700">
                        REMAINING BALANCE
                      </td>
                      <td className="px-4 py-3 text-slate-900">{formatNumber(remaining)}</td>
                      <td colSpan={4} />
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>

          {/* Inline states */}
          {error && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}
          {loading && (
            <div className="mt-4 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600">
              Loading...
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  </div>
);

}
