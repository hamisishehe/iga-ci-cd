"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
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
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api";
  const searchParams = useSearchParams();

  const qpStart = searchParams.get("startDate") || "";
  const qpEnd = searchParams.get("endDate") || "";
  const qpCentre = searchParams.get("centre") || "";

  const [mounted, setMounted] = useState(false);
  const [data, setData] = useState<ServiceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [centre, setCentre] = useState("all");
  const [centres, setCentres] = useState<string[]>([]);

 
  const [userType, setUserType] = useState("");
  const [userCentre, setUserCentre] = useState("");
  const [userZone, setUserZone] = useState("");

  const isCentreUser = userType === "CENTRE" && Boolean(userCentre);
  const isZoneUser = userType === "ZONE" && Boolean(userZone);
  const isHQUser = userType === "HQ";

  useEffect(() => {
    setMounted(true);

    const ut = (localStorage.getItem("userType") || "").toUpperCase();
    const uc = localStorage.getItem("centre") || "";
    const uz = localStorage.getItem("zone") || "";

    setUserType(ut);
    setUserCentre(uc);
    setUserZone(uz);

    // default month
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth() + 1;
    const pad = (n: number) => n.toString().padStart(2, "0");
    const firstDay = `${year}-${pad(month)}-01`;
    const lastDay = `${year}-${pad(month)}-${pad(new Date(year, month, 0).getDate())}`;

    setStartDate(firstDay);
    setEndDate(lastDay);

    // default centre selection by role
    if (ut === "CENTRE" && uc) setCentre(uc);

    // initial fetch (will re-run after params effect too)
    fetchData(firstDay, lastDay, ut === "CENTRE" ? uc || "all" : "all");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // apply query params
  useEffect(() => {
    if (!mounted) return;

    if (qpStart) setStartDate(qpStart);
    if (qpEnd) setEndDate(qpEnd);

    // Centre param only allowed if not centre user
    if (qpCentre) {
      if (!isCentreUser) setCentre(qpCentre);
      if (isCentreUser) setCentre(userCentre);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, qpStart, qpEnd, qpCentre, isCentreUser, userCentre]);

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
          Authorization: `Bearer ${token}`,
          "X-API-KEY": apiKey,
        },
      });

      const rows = await res.json();
      let filteredRows = [...rows];

      // ✅ role-based visibility
      if (isCentreUser && userCentre) {
        filteredRows = filteredRows.filter(
          (r: any) => (r.centre?.name || "").toLowerCase() === userCentre.toLowerCase()
        );
        centreName = userCentre; // lock
      } else if (isZoneUser && userZone) {
        // handle both possible shapes: centre.zones.name OR centre.zone
        filteredRows = filteredRows.filter((r: any) => {
          const z1 = r.centre?.zones?.name;
          const z2 = r.centre?.zone;
          const z = (z1 || z2 || "").toString().toLowerCase();
          return z === userZone.toLowerCase();
        });
      }

      // centre dropdown filter (HQ / ZONE allowed)
      if (centreName !== "all" && !isCentreUser) {
        filteredRows = filteredRows.filter((r: any) => r.centre?.name === centreName);
      }

      // date overlap filter
      const requestedStart = new Date(start).getTime();
      const requestedEnd = new Date(end).getTime();

      const finalRows = filteredRows.filter((row: any) => {
        if (!row.startDate || !row.endDate) return false;
        const rowStart = new Date(row.startDate).getTime();
        const rowEnd = new Date(row.endDate).getTime();
        return rowEnd >= requestedStart && rowStart <= requestedEnd;
      });

      // build centres list:
      // - HQ: all centres
      // - ZONE: centres in zone
      // - CENTRE: only their centre
      let centreList = [...new Set(rows.map((r: any) => r.centre?.name).filter(Boolean))] as string[];

      if (isZoneUser && userZone) {
        centreList = centreList.filter((cName) => {
          const row = rows.find((r: any) => r.centre?.name === cName);
          const z1 = row?.centre?.zones?.name;
          const z2 = row?.centre?.zone;
          const z = (z1 || z2 || "").toString().toLowerCase();
          return z === userZone.toLowerCase();
        });
      }

      if (isCentreUser && userCentre) {
        centreList = [userCentre];
      }

      setCentres(centreList);

      // flatten
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

  const totals = useMemo(
    () =>
      data.reduce(
        (acc, row) => {
          acc.amountRemitted += row.amountRemitted;
          acc.executors += row.executors;
          acc.supporters += row.supporters;
          acc.agencyFee += row.agencyFee;
          acc.amountToBePaid += row.amountToBePaid;
          return acc;
        },
        { amountRemitted: 0, executors: 0, supporters: 0, agencyFee: 0, amountToBePaid: 0 }
      ),
    [data]
  );

  const remaining = totals.amountRemitted - (totals.agencyFee + totals.amountToBePaid);

  const exportExcel = () => {
    const wsData = [
      ["#", "Date", "Course Name", "Centre", "Amount Remitted", "Executors", "Supporters", "Agency Fee", "Amount to be Paid"],
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
      ["TOTAL", "", "", "", totals.amountRemitted, totals.executors, totals.supporters, totals.agencyFee, totals.amountToBePaid],
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
      <div className="flex items-center justify-between">
        <Breadcrumb>
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
            <BreadcrumbItem className="text-slate-600">Apportionment</BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {(isCentreUser || isZoneUser || isHQUser) && (
          <div className="hidden sm:inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-700 shadow-sm">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            {isCentreUser ? userCentre : isZoneUser ? userZone : "HQ"}
          </div>
        )}
      </div>

      {/* Filters */}
      <Card className="relative overflow-hidden rounded-2xl border-slate-200/60 bg-white shadow-sm">
        <div className="absolute inset-0 bg-gradient-to-br from-sky-500/8 via-transparent to-indigo-500/8" />
        <CardHeader className="relative">
          <CardTitle className="text-lg text-slate-900">Filters</CardTitle>
          <CardDescription className="text-slate-600">
            Choose date range (and centre if available), then print or export the report.
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

            {/* Centre filter only for HQ/ZONE */}
            {!isCentreUser && (
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

            {/* Actions: only Print + Export (no table preview) */}
            <div className="lg:col-span-1">
              <Button
                className="h-10 w-full rounded-xl bg-slate-900 text-white hover:bg-slate-800 shadow-sm"
                onClick={() => fetchData(startDate, endDate, isCentreUser ? userCentre : centre)}
              >
                Load
              </Button>
            </div>

            <div className="lg:col-span-2 flex flex-col sm:flex-row gap-2">
              <Button
                className="h-10 w-full rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm disabled:opacity-60"
                onClick={() => {
                  // make sure data is loaded, then print
                  if (!data?.length) return;
                  window.print();
                }}
                disabled={!data?.length}
              >
                Print
              </Button>

              <Button
                className="h-10 w-full rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm disabled:opacity-60"
                onClick={exportExcel}
                disabled={!data?.length}
              >
                Export Excel
              </Button>
            </div>

            <div className="sm:col-span-2 lg:col-span-6">
              <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
                Tip: Click <span className="font-semibold text-slate-800">Load</span> first. When data is ready, the
                <span className="font-semibold text-slate-800"> Print</span> and{" "}
                <span className="font-semibold text-slate-800">Export</span> buttons will be enabled.
              </div>
            </div>
          </div>

          {/* inline status only (no table) */}
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

          {!loading && !error && (
            <div className="mt-4 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
              {data?.length ? (
                <span>
                  Loaded <span className="font-semibold">{data.length}</span> rows. Ready to print/export.
                </span>
              ) : (
                <span>No data loaded yet. Use filters then click <b>Load</b>.</span>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* NOTE: Table removed intentionally */}
    </div>
  </div>
);

}
