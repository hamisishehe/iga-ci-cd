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
  paymentId: number;
  customerName: string;
  centreName: string;
  zoneName: string;
  serviceCode: string;
  serviceDesc: string;
  paymentType?: string;
  controlNumber?: string;
  amount: number;
  amountPaid?: number;
  datePaid: string;
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
const formatDate = (d: Date) =>
  `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

const toSafeNumber = (v: any) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const safeStr = (v: any) => (v == null ? "" : String(v));
const normalizeText = (v: any) => safeStr(v).trim();

const fileStamp = () => {
  const d = new Date();
  return `${d.getFullYear()}${pad2(d.getMonth() + 1)}${pad2(
    d.getDate()
  )}_${pad2(d.getHours())}${pad2(d.getMinutes())}${pad2(d.getSeconds())}`;
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
  const [summaryByService, setSummaryByService] = useState<ServiceSummaryRow[]>(
    []
  );
  const [totalIncome, setTotalIncome] = useState(0);
  const [totalTransactions, setTotalTransactions] = useState(0);
  const [totalPaid, setTotalPaid] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);

  // options
  const [centreOptions, setCentreOptions] = useState<string[]>([]);
  const [zoneOptions, setZoneOptions] = useState<string[]>([]);
  const [serviceOptions, setServiceOptions] = useState<
    Array<{ serviceCode: string; serviceDesc: string }>
  >([]);

  // paging
  const [page, setPage] = useState(0);
  const size = 2000;
  const [totalPages, setTotalPages] = useState(1);

  // loading
  const [loading, setLoading] = useState(true);
  const [loadingCentres, setLoadingCentres] = useState(false);

  // user
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

  // lock by role
  useEffect(() => {
    if (!userType) return;
    if (isCentreUser) setCentre(userCentre || "ALL");
    if (isZoneUser) setZone(userZone || "ALL");
  }, [userType, isCentreUser, isZoneUser, userCentre, userZone]);

  const effectiveZone = useMemo(() => {
    if (isZoneUser) return userZone;
    return zone === "ALL" ? null : zone;
  }, [isZoneUser, userZone, zone]);

  const effectiveCentre = useMemo(() => {
    if (isCentreUser) return userCentre;
    return centre === "ALL" ? null : centre;
  }, [isCentreUser, userCentre, centre]);

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
  }, [fromDate, toDate, effectiveCentre, effectiveZone, serviceCode, page]);

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

      const cleanZone =
        zoneValue && zoneValue !== "ALL" ? normalizeText(zoneValue) : null;
      const q = cleanZone ? `?zone=${encodeURIComponent(cleanZone)}` : "";

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
      const centres = Array.isArray(data)
        ? data.map((x) => normalizeText(x)).filter(Boolean)
        : [];

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
        (data.summaryByService || []).map((s: any) => ({
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

      const serverZones = (data.zones || [])
        .map((z) => normalizeText(z))
        .filter(Boolean);

      const fallbackZones = Array.from(
        new Set(normalizedRows.map((r) => normalizeText(r.zoneName)).filter(Boolean))
      );

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
            .map((r) => [
              r.serviceCode,
              { serviceCode: r.serviceCode, serviceDesc: r.serviceDesc },
            ])
        ).values()
      ).sort((a, b) => a.serviceDesc.localeCompare(b.serviceDesc));

      setZoneOptions(
        isZoneUser
          ? [normalizeText(userZone)]
          : serverZones.length
          ? serverZones
          : fallbackZones
      );

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

  // report fetch
  useEffect(() => {
    if (!userType) return;
    if (!fromDate || !toDate) return;

    if (reportDebounceRef.current) window.clearTimeout(reportDebounceRef.current);

    reportDebounceRef.current = window.setTimeout(() => {
      fetchReport(payload);
    }, 250);

    return () => {
      if (reportDebounceRef.current) window.clearTimeout(reportDebounceRef.current);
    };
  }, [payload, userType]);

  // centre fetch depends only on zone
  useEffect(() => {
    if (!userType) return;

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
  }, [userType, zone, isCentreUser, isZoneUser, userCentre, userZone]);

  // if zone changes and selected centre is no longer valid
  useEffect(() => {
    if (isCentreUser) return;
    if (centre === "ALL") return;

    const exists = centreOptions.some(
      (c) => normalizeText(c) === normalizeText(centre)
    );

    if (!exists) {
      setCentre("ALL");
      setPage(0);
    }
  }, [centreOptions, centre, isCentreUser]);

  const exportPdf = () => {
    if (!rows.length) {
      toast.error("No data to export");
      return;
    }

    const doc = new jsPDF("l", "mm", "a4");

    const titleMain = "VETA";
    const titleSub = "COLLECTIONS REPORT";
    const dateRange = `From ${fromDate || "-"}  To ${toDate || "-"}`;
    const meta = `Centre: ${effectiveCentre ?? "ALL"} | Zone: ${
      effectiveZone ?? "ALL"
    } | Service: ${serviceCode === "ALL" ? "ALL" : serviceCode}`;

    doc.setFillColor(15, 23, 42);
    doc.rect(10, 10, 277, 30, "F");
    doc.setDrawColor(203, 213, 225);
    doc.rect(10, 10, 277, 30);

    const img = new Image();
    img.src = "/veta.png";
    try {
      doc.addImage(img as any, "PNG", 14, 13, 18, 18);
      doc.addImage(img as any, "PNG", 255, 13, 18, 18);
    } catch {}

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.text(titleMain, 148.5, 18, { align: "center" });

    doc.setFontSize(11);
    doc.text(titleSub, 148.5, 25, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(dateRange, 148.5, 31, { align: "center" });

    doc.setFontSize(8.5);
    doc.text(meta, 148.5, 37, { align: "center" });

    const head = [
      [
        "#",
        "Customer",
        "Centre",
        "Zone",
        "Payment Type",
        "Control No",
        "Billed (TZS)",
        "Paid (TZS)",
        "Date Paid",
      ],
    ];

    const body = rows.map((r, i) => [
      i + 1,
      r.customerName || "N/A",
      r.centreName || "N/A",
      r.zoneName || "N/A",
      r.paymentType || "-",
      r.controlNumber || "N/A",
      toSafeNumber(r.amount).toLocaleString(),
      r.amountPaid == null ? "-" : toSafeNumber(r.amountPaid).toLocaleString(),
      r.datePaid ? String(r.datePaid).split("T")[0] : "",
    ]);

    body.push([
      "",
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
      startY: 45,
      head,
      body,
      styles: {
        fontSize: 8,
        cellPadding: 2,
        lineWidth: 0.2,
        lineColor: [203, 213, 225],
      },
      headStyles: {
        fillColor: [37, 99, 235],
        textColor: 255,
        fontStyle: "bold",
        halign: "center",
      },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: {
        0: { halign: "center", cellWidth: 10 },
        1: { cellWidth: 38 },
        2: { cellWidth: 32 },
        3: { cellWidth: 28 },
        4: { cellWidth: 28 },
        5: { cellWidth: 35 },
        6: { halign: "right", cellWidth: 28 },
        7: { halign: "right", cellWidth: 28 },
        8: { halign: "center", cellWidth: 22 },
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
      doc.text(`Generated on ${new Date().toLocaleString()}`, 10, 200);
      doc.text(`Page ${i} of ${pages}`, 287, 200, { align: "right" });
    }

    const fname = `collection_report_${sanitizeName(
      effectiveCentre ?? username ?? "ALL"
    )}_${fileStamp()}.pdf`;
    doc.save(fname);
  };

  const exportExcel = () => {
    if (!rows.length) {
      toast.error("No data to export");
      return;
    }

    const title1 = "VETA";
    const title2 = "COLLECTIONS REPORT";
    const rangeLabel = `Date Range: ${fromDate || "-"} to ${toDate || "-"}`;
    const metaLabel = `Centre: ${effectiveCentre ?? "ALL"} | Zone: ${
      effectiveZone ?? "ALL"
    } | Service: ${serviceCode === "ALL" ? "ALL" : serviceCode}`;

    const header = [
      "#",
      "Customer",
      "Centre",
      "Zone",
      "Payment Type",
      "Control Number",
      "Amount Billed (TZS)",
      "Amount Paid (TZS)",
      "Date Paid",
    ];

    const body = rows.map((r, i) => [
      i + 1,
      r.customerName || "N/A",
      r.centreName || "N/A",
      r.zoneName || "N/A",
      r.paymentType || "-",
      r.controlNumber || "N/A",
      toSafeNumber(r.amount),
      r.amountPaid == null ? "" : toSafeNumber(r.amountPaid),
      r.datePaid ? String(r.datePaid).split("T")[0] : "",
    ]);

    const totalsRow: any[] = [
      "",
      "",
      "",
      "",
      "",
      "TOTALS",
      toSafeNumber(totalAmount),
      toSafeNumber(totalPaid),
      "",
    ];

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
      { wch: 24 },
      { wch: 22 },
      { wch: 18 },
      { wch: 18 },
      { wch: 22 },
      { wch: 18 },
      { wch: 18 },
      { wch: 14 },
    ];

    const dataStartRow = 5;

    for (let r = 0; r < body.length; r++) {
      const excelRow = dataStartRow + r;

      const billedCell = ws[XLSX.utils.encode_cell({ r: excelRow, c: 6 })];
      if (billedCell) {
        billedCell.t = "n";
        billedCell.z = "#,##0.00";
      }

      const paidCell = ws[XLSX.utils.encode_cell({ r: excelRow, c: 7 })];
      if (paidCell && paidCell.v !== "") {
        paidCell.t = "n";
        paidCell.z = "#,##0.00";
      }
    }

    const totalsExcelRow = dataStartRow + body.length;

    const totalsBilledCell = ws[XLSX.utils.encode_cell({
      r: totalsExcelRow,
      c: 6,
    })];
    if (totalsBilledCell) {
      totalsBilledCell.t = "n";
      totalsBilledCell.z = "#,##0.00";
    }

    const totalsPaidCell = ws[XLSX.utils.encode_cell({
      r: totalsExcelRow,
      c: 7,
    })];
    if (totalsPaidCell) {
      totalsPaidCell.t = "n";
      totalsPaidCell.z = "#,##0.00";
    }

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Collections");

    const fname = `collection_report_${sanitizeName(
      effectiveCentre ?? username ?? "ALL"
    )}_${fileStamp()}.xlsx`;

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
                <BreadcrumbLink
                  href="/user/pages/dashboard"
                  className="font-semibold text-slate-800"
                >
                  Dashboard
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem className="text-slate-600">
                Collections
              </BreadcrumbItem>
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
              <CardTitle className="text-lg sm:text-xl text-slate-900">
                Collections Report
              </CardTitle>
              <CardDescription className="text-slate-600">
                Payments report with zone-dependent centre loading and export by filtered result.
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
            <div className="rounded-2xl border border-slate-200/70 bg-gradient-to-b from-slate-50 to-white p-4 sm:p-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-4 items-end">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-700">
                    From
                  </label>
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
                  <label className="text-xs font-medium text-slate-700">
                    To
                  </label>
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
                  <label className="text-xs font-medium text-slate-700">
                    Service (GFS)
                  </label>
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
                    <label className="text-xs font-medium text-slate-700">
                      Centre
                    </label>
                    <Select
                      value={isCentreUser ? userCentre : centre}
                      onValueChange={(v) => {
                        setPage(0);
                        setCentre(v);
                      }}
                      disabled={isCentreUser || loadingCentres}
                    >
                      <SelectTrigger className="h-10 rounded-xl border-slate-200 bg-white">
                        <SelectValue
                          placeholder={loadingCentres ? "Loading centres..." : "All"}
                        />
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
                    <label className="text-xs font-medium text-slate-700">
                      Zone
                    </label>
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

                <div className="md:col-span-1">
                  <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
                    {loading ? "Loading..." : `Page ${page + 1} / ${totalPages}`}
                  </div>
                </div>
              </div>
            </div>

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
                    Billed (all filtered):{" "}
                    <span className="font-semibold text-slate-900">
                      {toSafeNumber(totalIncome).toLocaleString()} TZS
                    </span>
                  </div>

                  <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-700">
                    Paid (all filtered):{" "}
                    <span className="font-semibold text-slate-900">
                      {toSafeNumber(totalPaid).toLocaleString()} TZS
                    </span>
                  </div>

                  <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-700">
                    Transactions:{" "}
                    <span className="font-semibold text-slate-900">
                      {toSafeNumber(totalTransactions).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* table intentionally omitted */}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}