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
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "/api";
  const searchParams = useSearchParams();

  const qpStart = searchParams.get("startDate") || "";
  const qpEnd = searchParams.get("endDate") || "";
  const qpCentre = searchParams.get("centre") || "";
  const qpZone = searchParams.get("zone") || "";

  const [mounted, setMounted] = useState(false);
  const [data, setData] = useState<ServiceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [zone, setZone] = useState("all");     // ✅ NEW (HQ filter)
  const [zones, setZones] = useState<string[]>([]); // ✅ NEW options

  const [centre, setCentre] = useState("all");
  const [centres, setCentres] = useState<string[]>([]);

  const [userType, setUserType] = useState("");
  const [userCentre, setUserCentre] = useState("");
  const [userZone, setUserZone] = useState("");

  const isCentreUser = userType === "CENTRE" && Boolean(userCentre);
  const isZoneUser = userType === "ZONE" && Boolean(userZone);
  const isHQUser = userType === "HQ";

  // ✅ helper: extract zone name from row (handles both shapes)
  const getZoneName = (r: any) => {
    const z1 = r?.centre?.zones?.name;
    const z2 = r?.centre?.zone;
    return (z1 || z2 || "").toString().trim();
  };

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

    // default selection by role
    if (ut === "CENTRE" && uc) setCentre(uc);
    if (ut === "ZONE" && uz) setZone(uz);

    // initial fetch
    fetchData(firstDay, lastDay, ut, ut === "ZONE" ? uz || "all" : "all", ut === "CENTRE" ? uc || "all" : "all");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // apply query params
  useEffect(() => {
    if (!mounted) return;

    if (qpStart) setStartDate(qpStart);
    if (qpEnd) setEndDate(qpEnd);

    // zone param only allowed if HQ (zone users are locked)
    if (qpZone) {
      if (isHQUser) setZone(qpZone);
      if (isZoneUser) setZone(userZone);
    }

    // centre param only allowed if not centre user
    if (qpCentre) {
      if (!isCentreUser) setCentre(qpCentre);
      if (isCentreUser) setCentre(userCentre);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, qpStart, qpEnd, qpCentre, qpZone, isCentreUser, userCentre, isZoneUser, userZone, isHQUser]);

  /** ✅ Effective zone/centre (respect role locks) */
  const effectiveZone = useMemo(() => {
    if (isZoneUser) return userZone;
    return zone === "all" ? "all" : zone;
  }, [isZoneUser, userZone, zone]);

  const effectiveCentre = useMemo(() => {
    if (isCentreUser) return userCentre;
    return centre === "all" ? "all" : centre;
  }, [isCentreUser, userCentre, centre]);

  /** ✅ When zone changes (HQ), reset centre */
  useEffect(() => {
    if (!mounted) return;
    if (!isHQUser) return;

    // when selecting a zone, centre must be reset to "all"
    setCentre("all");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zone]);

  const fetchData = async (
    start: string,
    end: string,
    utOverride?: string,
    zoneName: string = "all",
    centreName: string = "all"
  ) => {
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

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const rows = await res.json();
      let filteredRows = [...rows];

      const currentUserType = (utOverride || userType || "").toUpperCase();

      // ✅ role-based visibility
      if (currentUserType === "CENTRE" && userCentre) {
        filteredRows = filteredRows.filter(
          (r: any) => (r.centre?.name || "").toLowerCase() === userCentre.toLowerCase()
        );
        centreName = userCentre;
        zoneName = "all";
      } else if (currentUserType === "ZONE" && userZone) {
        filteredRows = filteredRows.filter((r: any) => getZoneName(r).toLowerCase() === userZone.toLowerCase());
        zoneName = userZone;
        centreName = "all";
      }

      // ✅ HQ zone filter (new)
      if (currentUserType === "HQ" && zoneName !== "all") {
        filteredRows = filteredRows.filter((r: any) => getZoneName(r).toLowerCase() === zoneName.toLowerCase());
      }

      // ✅ centre filter (HQ / ZONE allowed)
      if (centreName !== "all" && currentUserType !== "CENTRE") {
        filteredRows = filteredRows.filter((r: any) => (r.centre?.name || "") === centreName);
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

      /** ✅ Build Zone -> Centres mapping reliably */
      const zoneToCentres = new Map<string, Set<string>>();
      rows.forEach((r: any) => {
        const z = getZoneName(r);
        const c = (r?.centre?.name || "").toString().trim();
        if (!z || !c) return;
        if (!zoneToCentres.has(z)) zoneToCentres.set(z, new Set());
        zoneToCentres.get(z)!.add(c);
      });

      // zones list (HQ dropdown)
      const allZones = Array.from(zoneToCentres.keys()).filter(Boolean).sort((a, b) => a.localeCompare(b));
      setZones(allZones);

      // centres list depends on effective zone + role
      let centreList: string[] = [];

      if (currentUserType === "CENTRE" && userCentre) {
        centreList = [userCentre];
      } else if (currentUserType === "ZONE" && userZone) {
        centreList = Array.from(zoneToCentres.get(userZone) || []).sort((a, b) => a.localeCompare(b));
      } else {
        // HQ
        if (zoneName !== "all") {
          centreList = Array.from(zoneToCentres.get(zoneName) || []).sort((a, b) => a.localeCompare(b));
        } else {
          // all centres
          centreList = Array.from(
            new Set(rows.map((r: any) => (r?.centre?.name || "").toString().trim()).filter(Boolean))
          ).sort((a, b) => a.localeCompare(b));
        }
      }

      setCentres(centreList);

      // ✅ if selected centre not in list, reset
      if (!isCentreUser && centreName !== "all" && !centreList.includes(centreName)) {
        setCentre("all");
      }

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
      setZones([]);
      setError(err?.message || "Unable to fetch apportionment data.");
    } finally {
      setLoading(false);
    }
  };

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
                <BreadcrumbLink href="/user/pages/dashboard" className="font-semibold text-slate-800">
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
              Choose date range (and zone/centre if available), then print or export the report.
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

              {/* ✅ ZONE filter only for HQ */}
              {isHQUser && (
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-slate-700">Zone</label>
                  <Select
                    value={zone}
                    onValueChange={(val) => {
                      setZone(val);
                      // centre reset is also handled by effect
                    }}
                  >
                    <SelectTrigger className="h-10 rounded-xl border-slate-200 bg-white">
                      <SelectValue placeholder="Select Zone" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Zones</SelectItem>
                      {zones.map((z) => (
                        <SelectItem key={z} value={z}>
                          {z}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

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
                      {centres.map((c) => (
                        <SelectItem key={c} value={c}>
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
                  onClick={() =>
                    fetchData(
                      startDate,
                      endDate,
                      userType,
                      isZoneUser ? userZone : zone,
                      isCentreUser ? userCentre : centre
                    )
                  }
                >
                  Load
                </Button>
              </div>

              <div className="lg:col-span-2 flex flex-col sm:flex-row gap-2">
                <Button
                  className="h-10 w-full rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm disabled:opacity-60"
                  onClick={() => {
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
                  Tip: Select <span className="font-semibold text-slate-800">Zone</span> first (HQ), then{" "}
                  <span className="font-semibold text-slate-800">Centre</span>. Centres will update based on zone.
                </div>
              </div>
            </div>

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
      </div>
    </div>
  );
}
