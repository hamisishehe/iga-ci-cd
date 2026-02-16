"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

/** -------- types from backend projections -------- */
interface ReportRow {
  id: number;
  customerName: string;
  centreName: string;
  zoneName: string;
  serviceCode: string;
  serviceDesc: string;
  paymentType?: string;
  controlNumber?: string;

  amount: number; // billed
  amountPaid?: number; // paid
  datePaid: string; // ISO
}

interface ReportFilters {
  centres?: string[];
  zones?: string[];
  services?: Array<{ serviceCode: string; serviceDesc: string }>;
}

interface ReportResponse extends ReportFilters {
  totalIncome: number;
  totalTransactions: number;
  totalAmount: number; // billed total (filtered)
  totalPaid?: number;

  page: number;
  size: number;
  totalElements: number;
  totalPages: number;

  rows: ReportRow[];
}

/** -------- helpers -------- */
const pad2 = (n: number) => String(n).padStart(2, "0");
const formatDate = (d: Date) =>
  `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

const toSafeNumber = (v: any) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const fileStamp = () => {
  const d = new Date();
  return `${d.getFullYear()}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}_${pad2(
    d.getHours()
  )}${pad2(d.getMinutes())}${pad2(d.getSeconds())}`;
};

const sanitizeName = (s: string) =>
  (s || "user")
    .toString()
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9_\-]/g, "")
    .slice(0, 30);

export default function CollectionReport() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "/api";

  // dates
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  // filters
  const [centre, setCentre] = useState("ALL");
  const [zone, setZone] = useState("ALL");
  const [serviceCode, setServiceCode] = useState("ALL");

  // server data
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [totalIncome, setTotalIncome] = useState(0);
  const [totalTransactions, setTotalTransactions] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);
  const [totalPaid, setTotalPaid] = useState(0);

  // options
  const [centreOptions, setCentreOptions] = useState<string[]>([]);
  const [zoneOptions, setZoneOptions] = useState<string[]>([]);
  const [serviceOptions, setServiceOptions] = useState<
    Array<{ serviceCode: string; serviceDesc: string }>
  >([]);

  // paging (large)
  const [page, setPage] = useState(0);
  const size = 2000;
  const [loading, setLoading] = useState(true);

  // role & user
  const [userType, setUserType] = useState("");
  const [userCentre, setUserCentre] = useState("");
  const [userZone, setUserZone] = useState("");
  const [username, setUsername] = useState("user");

  useEffect(() => {
    const ut = (localStorage.getItem("userType") || "").toUpperCase();
    const uc = localStorage.getItem("centre") || "";
    const uz = localStorage.getItem("zone") || "";

    setUserType(ut);
    setUserCentre(uc);
    setUserZone(uz);

    setUsername(
      localStorage.getItem("name") ||
        localStorage.getItem("username") ||
        localStorage.getItem("email") ||
        "user"
    );
  }, []);

  const isHQUser = userType === "HQ";
  const isCentreUser = userType === "CENTRE" && Boolean(userCentre);
  const isZoneUser = userType === "ZONE" && Boolean(userZone);

  // default month
  useEffect(() => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    setFromDate(formatDate(firstDay));
    setToDate(formatDate(lastDay));
  }, []);

  // lock based on role
  useEffect(() => {
    if (!userType) return;
    if (isCentreUser) setCentre(userCentre || "ALL");
    if (isZoneUser) setZone(userZone || "ALL");
  }, [userType, isCentreUser, isZoneUser, userCentre, userZone]);

  /** ✅ Effective role-safe values */
  const effectiveZone = useMemo(() => {
    return isZoneUser ? userZone : zone;
  }, [isZoneUser, userZone, zone]);

  const effectiveCentre = useMemo(() => {
    return isCentreUser ? userCentre : centre;
  }, [isCentreUser, userCentre, centre]);

  /** build request payload */
  const payload = useMemo(() => {
    return {
      fromDate,
      toDate,
      centre: isCentreUser ? userCentre : effectiveCentre === "ALL" ? null : effectiveCentre,
      zone: isZoneUser ? userZone : effectiveZone === "ALL" ? null : effectiveZone,
      serviceCode: serviceCode === "ALL" ? null : serviceCode,
      page,
      size,
    };
  }, [
    fromDate,
    toDate,
    effectiveCentre,
    effectiveZone,
    serviceCode,
    page,
    size,
    isCentreUser,
    isZoneUser,
    userCentre,
    userZone,
  ]);

  /** debounce fetch */
  const debounceRef = useRef<number | null>(null);

  useEffect(() => {
    if (!userType) return;
    if (!fromDate || !toDate) return;

    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      fetchReport(payload);
    }, 250);

    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payload, userType]);

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
      setTotalIncome(toSafeNumber(data.totalIncome));
      setTotalTransactions(toSafeNumber(data.totalTransactions));
      setTotalAmount(toSafeNumber(data.totalAmount));
      setTotalPaid(toSafeNumber((data as any).totalPaid));

      // dropdown options
      const serverCentres = (data.centres || []).filter(Boolean);
      const serverZones = (data.zones || []).filter(Boolean);
      const serverServices = (data.services || []).filter(
        (s) => s?.serviceCode && s?.serviceDesc
      );

      const fallbackCentres = Array.from(
        new Set((data.rows || []).map((r) => r.centreName).filter(Boolean))
      );
      const fallbackZones = Array.from(
        new Set((data.rows || []).map((r) => r.zoneName).filter(Boolean))
      );
      const fallbackServices = Array.from(
        new Map(
          (data.rows || [])
            .filter((r) => r?.serviceCode && r?.serviceDesc)
            .map((r) => [
              r.serviceCode,
              { serviceCode: r.serviceCode, serviceDesc: r.serviceDesc },
            ])
        ).values()
      ).sort((a, b) => a.serviceDesc.localeCompare(b.serviceDesc));

      setCentreOptions(
        isCentreUser ? [userCentre] : serverCentres.length ? serverCentres : fallbackCentres
      );
      setZoneOptions(
        isZoneUser ? [userZone] : serverZones.length ? serverZones : fallbackZones
      );
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
      setTotalIncome(0);
      setTotalTransactions(0);
      setTotalAmount(0);
      setTotalPaid(0);

      setCentreOptions(isCentreUser ? [userCentre] : []);
      setZoneOptions(isZoneUser ? [userZone] : []);
      setServiceOptions([]);
    } finally {
      setLoading(false);
    }
  };

  /**
   * ✅ KEY FIX: when HQ changes zone, fetch centres for that zone (so centre dropdown doesn't show all)
   * - We request report with zone selected and centre=null, then build centre options from returned rows
   */
  const fetchCentresForZone = async (z: string) => {
    try {
      const token = localStorage.getItem("authToken");
      const apiKey = process.env.NEXT_PUBLIC_API_KEY;

      if (!token || !apiKey) return;

      const res = await fetch(`${apiUrl}/collections/report`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "X-API-KEY": apiKey,
        },
        cache: "no-store",
        body: JSON.stringify({
          fromDate,
          toDate,
          zone: z === "ALL" ? null : z,
          centre: null, // IMPORTANT
          serviceCode: serviceCode === "ALL" ? null : serviceCode,
          page: 0,
          size: 2000,
        }),
      });

      if (!res.ok) return;

      const data: ReportResponse = await res.json();

      const centresInZone = Array.from(
        new Set((data.rows || []).map((r) => r.centreName).filter(Boolean))
      ).sort((a, b) => a.localeCompare(b));

      // if backend provides centres already filtered, prefer it
      const serverCentres = (data.centres || []).filter(Boolean);
      const finalCentres = serverCentres.length ? serverCentres : centresInZone;

      setCentreOptions(finalCentres);

      // if selected centre not in new list, reset
      if (centre !== "ALL" && !finalCentres.includes(centre)) {
        setCentre("ALL");
      }
    } catch (e) {
      console.error(e);
    }
  };

  /** ✅ Filtered centres list for rendering (HQ only; centre users locked) */
  const filteredCentreOptions = useMemo(() => {
    if (isCentreUser) return [userCentre].filter(Boolean);
    // after fetchCentresForZone, centreOptions will already be zone-scoped
    return centreOptions;
  }, [isCentreUser, userCentre, centreOptions]);

  /** ✅ PDF export (kept as in your code) */
  const exportPdf = () => {
    if (!rows.length) {
      toast.error("No data to export");
      return;
    }

    const doc = new jsPDF("p", "mm", "a4");

    const titleMain = "VETA";
    const titleSub = "COLLECTIONS REPORT";
    const dateRange = `From ${fromDate || "-"}  To ${toDate || "-"}`;

    doc.setFillColor(15, 23, 42);
    doc.rect(10, 10, 190, 26, "F");
    doc.setDrawColor(203, 213, 225);
    doc.rect(10, 10, 190, 26);

    const img = new Image();
    img.src = "/veta.png";
    try {
      doc.addImage(img as any, "PNG", 14, 13, 18, 18);
      doc.addImage(img as any, "PNG", 178, 13, 18, 18);
    } catch {}

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.text(titleMain, 105, 18, { align: "center" });

    doc.setFontSize(11);
    doc.text(titleSub, 105, 25, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(dateRange, 105, 31, { align: "center" });

    const head = [[
      "#",
      "Customer",
      "Control No",
      "Service",
      "Payment Type",
      "Billed (TZS)",
      "Paid (TZS)",
      "Date Paid",
    ]];

    const body = rows.map((r, i) => ([
      i + 1,
      r.customerName || "N/A",
      r.controlNumber || "N/A",
      r.serviceDesc || "N/A",
      r.paymentType || "-",
      toSafeNumber(r.amount).toLocaleString(),
      toSafeNumber(r.amountPaid).toLocaleString(),
      r.datePaid ? String(r.datePaid).split("T")[0] : "",
    ]));

    body.push([
      "",
      "",
      "",
      "",
      "TOTALS",
      toSafeNumber(totalAmount).toLocaleString(),
      toSafeNumber(totalPaid).toLocaleString(),
      "",
    ]);

    autoTable(doc, {
      startY: 42,
      head,
      body,
      styles: { fontSize: 8.2, cellPadding: 2.2, lineWidth: 0.2, lineColor: [203, 213, 225] },
      headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: "bold", halign: "center" },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: {
        0: { halign: "center", cellWidth: 8 },
        5: { halign: "right", cellWidth: 22 },
        6: { halign: "right", cellWidth: 22 },
      },
      didParseCell: (d) => {
        if (d.row.index === body.length - 1) {
          d.cell.styles.fontStyle = "bold";
          d.cell.styles.fillColor = [220, 252, 231];
        }
      },
      margin: { left: 10, right: 10 },
    });

    const pages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(100);
      doc.text(`Generated on ${new Date().toLocaleString()}`, 10, 290);
      doc.text(`Page ${i} of ${pages}`, 200, 290, { align: "right" });
    }

    const fname = `collection_report_${sanitizeName(username)}_${fileStamp()}.pdf`;
    doc.save(fname);
  };

  /** ✅ Excel export (kept as in your code) */
  const exportExcel = () => {
    if (!rows.length) {
      toast.error("No data to export");
      return;
    }

    const title1 = "VETA";
    const title2 = "COLLECTIONS REPORT";
    const rangeLabel = `Date Range: ${fromDate || "-"}  to  ${toDate || "-"}`;
    const metaLabel = `Centre: ${centre || "ALL"}   |   Zone: ${zone || "ALL"}   |   Service: ${serviceCode || "ALL"}`;

    const header = [
      "#",
      "Customer",
      "Control Number",
      "Service",
      "Payment Type",
      "Amount Billed (TZS)",
      "Amount Paid (TZS)",
      "Date Paid",
    ];

    const body = rows.map((r, i) => [
      i + 1,
      r.customerName || "N/A",
      r.controlNumber || "N/A",
      r.serviceDesc || "N/A",
      r.paymentType || "-",
      toSafeNumber(r.amount),
      toSafeNumber(r.amountPaid),
      r.datePaid ? String(r.datePaid).split("T")[0] : "",
    ]);

    const totalsRow = ["", "", "", "", "TOTALS", toSafeNumber(totalAmount), toSafeNumber(totalPaid), ""];

    const wsData: any[][] = [
      [title1],
      [title2],
      [rangeLabel],
      [metaLabel],
      header,
      ...body,
      totalsRow,
    ];

    const ws = XLSX.utils.aoa_to_sheet(wsData);

    const lastCol = header.length - 1;
    ws["!merges"] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: lastCol } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: lastCol } },
      { s: { r: 2, c: 0 }, e: { r: 2, c: lastCol } },
      { s: { r: 3, c: 0 }, e: { r: 3, c: lastCol } },
    ];

    ws["!cols"] = [
      { wch: 5 },
      { wch: 22 },
      { wch: 18 },
      { wch: 28 },
      { wch: 18 },
      { wch: 18 },
      { wch: 18 },
      { wch: 14 },
    ];

    const dataStartRow = 5;
    for (let r = 0; r < body.length; r++) {
      const excelRow = dataStartRow + r;

      const billedCell = ws[XLSX.utils.encode_cell({ r: excelRow, c: 5 })];
      if (billedCell) {
        billedCell.t = "n";
        billedCell.z = "#,##0.00";
      }

      const paidCell = ws[XLSX.utils.encode_cell({ r: excelRow, c: 6 })];
      if (paidCell) {
        paidCell.t = "n";
        paidCell.z = "#,##0.00";
      }
    }

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Collections");

    const fname = `collection_report_${sanitizeName(username)}_${fileStamp()}.xlsx`;
    XLSX.writeFile(wb, fname);
  };

  if (loading && !rows.length) {
    return (
      <div className="w-full h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-sky-800 border-solid" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50">
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <Breadcrumb className="px-1 sm:px-2">
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/user/pages/dashboard" className="font-semibold text-slate-800">
                  Dashboard
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem className="text-slate-600">Collections</BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          {isCentreUser && (
            <div className="hidden sm:inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-700 shadow-sm">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              {userCentre}
            </div>
          )}
        </div>

        <Card className="relative overflow-hidden rounded-2xl border-slate-200/60 bg-white shadow-sm">
          <div className="absolute inset-0 bg-gradient-to-br from-sky-500/8 via-transparent to-indigo-500/8" />

          <CardHeader className="relative flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <CardTitle className="text-lg sm:text-xl text-slate-900">Collections Report</CardTitle>
              <CardDescription className="text-slate-600">
                Zone → Centre dependency is applied (HQ). Export uses the filtered result.
              </CardDescription>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={exportPdf}
                className="h-10 rounded-xl bg-slate-900 text-white hover:bg-slate-800 shadow-sm disabled:opacity-60"
                disabled={!rows?.length}
              >
                Print PDF
              </Button>

              <Button
                onClick={exportExcel}
                className="h-10 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm disabled:opacity-60"
                disabled={!rows?.length}
              >
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Export Excel
              </Button>
            </div>
          </CardHeader>

          <CardContent className="relative">
            {/* Filters */}
            <div className="rounded-2xl border border-slate-200/70 bg-gradient-to-b from-slate-50 to-white p-4 sm:p-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-4 items-end">
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

                {/* Centre */}
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

                      {/* ✅ IMPORTANT: use filteredCentreOptions */}
                      <SelectContent>
                        <SelectItem value="ALL">All</SelectItem>
                        {filteredCentreOptions.map((c) => (
                          <SelectItem key={c} value={c}>
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Zone */}
                {isHQUser && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-700">Zone</label>
                    <Select
                      value={zone}
                      onValueChange={(v) => {
                        setPage(0);
                        setZone(v);

                        // ✅ Reset centre and fetch centres for this zone
                        setCentre("ALL");
                        fetchCentresForZone(v);
                      }}
                    >
                      <SelectTrigger className="h-10 rounded-xl border-slate-200 bg-white">
                        <SelectValue placeholder="All" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">All</SelectItem>
                        {zoneOptions.map((z) => (
                          <SelectItem key={z} value={z}>
                            {z}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="md:col-span-1">
                  <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
                    {loading ? "Loading..." : "Tip: Export uses filtered result."}
                  </div>
                </div>
              </div>
            </div>

            {/* Status */}
            <div className="mt-4 rounded-2xl border border-slate-200/70 bg-white p-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="text-sm text-slate-700">
                  {rows?.length ? (
                    <>
                      Found{" "}
                      <span className="font-semibold text-slate-900">
                        {rows.length.toLocaleString()}
                      </span>{" "}
                      records.
                    </>
                  ) : (
                    "No records found for selected filters."
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-700">
                    Billed:{" "}
                    <span className="font-semibold text-slate-900">
                      {toSafeNumber(totalAmount).toLocaleString()} TZS
                    </span>
                  </div>

                  <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-700">
                    Paid:{" "}
                    <span className="font-semibold text-slate-900">
                      {toSafeNumber(totalPaid).toLocaleString()} TZS
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* NOTE: Table intentionally removed */}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
