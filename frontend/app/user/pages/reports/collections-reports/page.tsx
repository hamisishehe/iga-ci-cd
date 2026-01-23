"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import * as XLSX from "xlsx";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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


interface ApiCollectionItem {
  id: number;
  amount: number | string;
  date: string;
  controlNumber: string;
  customer?: {
    name?: string;
    centre?: {
      name?: string;
      zones?: { name?: string };
    };
  };
  gfsCode?: { code?: string; description?: string };
}

interface CollectionRecord {
  id: number;
  name: string;
  center: string;
  zone: string;
  serviceCode: string;
  service: string;
  amount: number;
  controlNumber: string;
  date: string;
}

interface ServiceSummary {
  serviceCode: string;
  service: string;
  total: number;
}

export default function CollectionReport() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "/api";

  const searchParams = useSearchParams();

  // query params from generator page
  const qpStart = searchParams.get("startDate") || "";
  const qpEnd = searchParams.get("endDate") || "";
  const qpCentre = searchParams.get("centre") || "";
  const qpZone = searchParams.get("zone") || "";
  const qpService = searchParams.get("service") || "";

  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [service, setService] = useState("ALL");
  const [center, setCenter] = useState("ALL");
  const [zone, setZone] = useState("ALL");

  const [data, setData] = useState<CollectionRecord[]>([]);
  const [filteredData, setFilteredData] = useState<CollectionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;

  // ✅ Safe user info (avoid hydration errors)
  const [userType, setUserType] = useState("");
  const [userCentre, setUserCentre] = useState("");
  const [userZone, setUserZone] = useState("");

  useEffect(() => {
    setUserType((localStorage.getItem("userType") || "").toUpperCase());
    setUserCentre(localStorage.getItem("centre") || "");
    setUserZone(localStorage.getItem("zone") || "");
  }, []);

  const isHQUser = userType === "HQ";
  const isCentreUser = userType === "CENTRE" && Boolean(userCentre);
  const isZoneUser = userType === "ZONE" && Boolean(userZone);

  // default month
  useEffect(() => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const formatDate = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
        d.getDate()
      ).padStart(2, "0")}`;

    setFromDate(formatDate(firstDay));
    setToDate(formatDate(lastDay));
  }, []);

  // apply query params after defaults
  useEffect(() => {
    if (qpStart) setFromDate(qpStart);
    if (qpEnd) setToDate(qpEnd);
    if (qpService) setService(qpService);
    if (qpCentre) setCenter(qpCentre);
    if (qpZone) setZone(qpZone);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qpStart, qpEnd, qpCentre, qpZone, qpService]);

  // fetch data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem("authToken");
        const apiKey = process.env.NEXT_PUBLIC_API_KEY;

        if (!token || !apiKey) {
          toast.error("Missing authentication credentials");
          setLoading(false);
          return;
        }

        const res = await fetch(`${apiUrl}/collections/get`, {
          method: "GET",
          headers: { Authorization: `Bearer ${token}`, "X-API-KEY": apiKey },
        });

    
        if (!res.ok) throw new Error("Failed to fetch collections");

        const json: ApiCollectionItem[] = await res.json();
        const mapped: CollectionRecord[] = json.map((item) => ({
          id: item.id,
          name: item.customer?.name || "N/A",
          center: item.customer?.centre?.name || "N/A",
          zone: item.customer?.centre?.zones?.name || "N/A",
          serviceCode: item.gfsCode?.code || "N/A",
          controlNumber: item.controlNumber || "N/A",
          service:
            item.gfsCode?.description === "Miscellaneous receipts"
              ? "Separate production Unit"
              : item.gfsCode?.description || "N/A",
          amount: Number(item.amount) || 0,
          date: item.date ? item.date.split("T")[0] : "",
        }));

        // role filter
        let roleFiltered = mapped;
        if (isCentreUser) {
          roleFiltered = mapped.filter((d) => d.center === userCentre);
          setCenter(userCentre);
        } else if (isZoneUser) {
          roleFiltered = mapped.filter((d) => d.zone === userZone);
          setZone(userZone);
        }

        setData(roleFiltered);
      } catch (err) {
        console.error(err);
        toast.error("Failed to load collections");
        setData([]);
      } finally {
        setLoading(false);
      }
    };

    // wait until userType loaded
    if (!userType) return;
    fetchData();
  }, [apiUrl, userType, isCentreUser, isZoneUser, userCentre, userZone]);

  // reactive filtering
  useEffect(() => {
    if (data.length === 0) {
      setFilteredData([]);
      return;
    }

    const from = fromDate ? new Date(fromDate + "T00:00:00") : null;
    const to = toDate ? new Date(toDate + "T23:59:59") : null;

    const filtered = data.filter((item) => {
      const itemDate = new Date(item.date);

      const inDateRange = (!from || itemDate >= from) && (!to || itemDate <= to);
      const matchService = service === "ALL" || item.service === service;

      const matchCenter =
        isCentreUser || center === "ALL" || item.center === center;

      const matchZone =
        !isHQUser || zone === "ALL" || item.zone === zone;

      return inDateRange && matchService && matchCenter && matchZone;
    });

    setFilteredData(filtered);
    setCurrentPage(1);
  }, [data, fromDate, toDate, service, center, zone, isCentreUser, isHQUser]);

  const uniqueServices = useMemo(
    () => Array.from(new Set(data.map((d) => d.service))).filter(Boolean),
    [data]
  );

  const uniqueCenters = useMemo(() => {
    if (isCentreUser) return [userCentre];
    return Array.from(new Set(data.map((d) => d.center))).filter(Boolean);
  }, [data, isCentreUser, userCentre]);

  const uniqueZones = useMemo(() => {
    if (isZoneUser) return [userZone];
    return Array.from(new Set(data.map((d) => d.zone))).filter(Boolean);
  }, [data, isZoneUser, userZone]);

  // pagination
  const indexOfLastRow = currentPage * rowsPerPage;
  const indexOfFirstRow = indexOfLastRow - rowsPerPage;
  const currentRows = filteredData.slice(indexOfFirstRow, indexOfLastRow);
  const totalPages = Math.max(1, Math.ceil(filteredData.length / rowsPerPage));

  // totals & summary
  const totalAmount = filteredData.reduce((sum, item) => sum + item.amount, 0);

  const summaryByService: ServiceSummary[] = Object.values(
    filteredData.reduce<Record<string, ServiceSummary>>((acc, item) => {
      const key = item.serviceCode;
      if (!acc[key]) acc[key] = { serviceCode: key, service: item.service, total: 0 };
      acc[key].total += item.amount;
      return acc;
    }, {})
  ).sort((a, b) => b.total - a.total);



const exportPdf = () => {
  const doc = new jsPDF("p", "mm", "a4");

  // ===== Logos (Base64) =====
  const leftLogo = "data:image/png;base64,XXXX";   // VETA logo
  const rightLogo = "data:image/png;base64,YYYY"; // Govt / Centre logo

  // ===== Header Text =====
  const titleMain = "VETA";
  const titleSub = "COLLECTIONS REPORT";
  const dateRange = `From ${fromDate || "-"}  To ${toDate || "-"}`;

  // ===== Header Background =====
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(10, 10, 190, 26, "F");

  // Border
  doc.setDrawColor(203, 213, 225); // slate-300
  doc.rect(10, 10, 190, 26);

  const img = new Image();
  img.src = "/veta.png";



  // ===== Logos =====
  doc.addImage(img, "PNG", 14, 13, 18, 18);     // left
  doc.addImage(img, "PNG", 178, 13, 18, 18);  // right

  // ===== Titles =====
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text(titleMain, 105, 18, { align: "center" });

  doc.setFontSize(11);
  doc.text(titleSub, 105, 25, { align: "center" });

  // ===== Date Range =====
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(dateRange, 105, 31, { align: "center" });

  // ===== Table =====
  const head = [[
    "#",
    "Customer",
    "Center",
    "Zone",
    "Service Code",
    "Service",
    "Amount (TZS)",
    "Date Paid",
  ]];

  const body = filteredData.map((r, i) => ([
    i + 1,
    r.name,
    r.center,
    r.zone,
    r.serviceCode,
    r.service,
    Number(r.amount).toLocaleString(),
    r.date,
  ]));

  body.push(["", "", "", "", "", "TOTAL", totalAmount.toLocaleString(), ""]);

  autoTable(doc, {
    startY: 42,
    head,
    body,
    styles: {
      fontSize: 8.5,
      cellPadding: 2.5,
      lineWidth: 0.2,
      lineColor: [203, 213, 225],
    },
    headStyles: {
      fillColor: [37, 99, 235], // blue-600
      textColor: 255,
      fontStyle: "bold",
      halign: "center",
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252], // slate-50
    },
    columnStyles: {
      0: { halign: "center", cellWidth: 8 },
      6: { halign: "right", cellWidth: 22 },
    },
    didParseCell: (data) => {
      if (data.row.index === body.length - 1) {
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.fillColor = [220, 252, 231]; // green-100
      }
    },
    margin: { left: 10, right: 10 },
  });

  // ===== Footer =====
 const totalPages = doc.internal.getNumberOfPages();

for (let i = 1; i <= totalPages; i++) {
  doc.setPage(i);
  doc.setFontSize(8);
  doc.setTextColor(100);

  doc.text(
    `Generated on ${new Date().toLocaleString()}`,
    10,
    290
  );

  doc.text(
    `Page ${i} of ${totalPages}`,
    200,
    290,
    { align: "right" }
  );


 
}

 doc.save("collection_report.pdf");
}



const exportExcel = () => {
  const title1 = "VETA";
  const title2 = "COLLECTIONS REPORT";
  const rangeLabel = `Date Range: ${fromDate || "-"}  to  ${toDate || "-"}`;
  const metaLabel = `Centre: ${center || "ALL"}   |   Zone: ${zone || "ALL"}   |   Service: ${
    service || "ALL"
  }`;

  // ✅ Header (9 columns)
  const header = [
    "#",
    "Customer",
    "Center",
    "Zone",
    "Service Code",
    "Control Number",
    "Service",
    "Amount (TZS)",
    "Date Paid",
  ];

  // ✅ Body matches header order (Amount index 7, Date index 8)
  const body = filteredData.map((r, i) => [
    i + 1,
    r.name ?? "",
    r.center ?? "",
    r.zone ?? "",
    r.serviceCode ?? "",
    r.controlNumber ?? "",
    r.service ?? "",
    Number(r.amount ?? 0), // force numeric
    r.date ?? "",
  ]);

  const totalAmount = filteredData.reduce((sum, r) => sum + Number(r.amount ?? 0), 0);

  // ✅ Total row MUST also be 9 columns (same length as header)
  // Put "TOTAL" under the Service column (index 6) and totalAmount under Amount (index 7)
  const totalRow = ["", "", "", "", "", "", "TOTAL", totalAmount, ""];

  // --- Build sheet with a modern title block (top 4 rows) ---
  // Row 0: VETA (merged)
  // Row 1: REPORT TITLE (merged)
  // Row 2: Date Range (merged)
  // Row 3: Meta (merged)
  // Row 4: Table Header
  const wsData: any[][] = [
    [title1],
    [title2],
    [rangeLabel],
    [metaLabel],
    header,
    ...body,
    totalRow,
  ];

  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // ---------- Helpers ----------
  const colCount = header.length; // 9
  const lastCol = colCount - 1; // 8

  const cellAddr = (r: number, c: number) => XLSX.utils.encode_cell({ r, c });

  const applyStyle = (r: number, c: number, s: any) => {
    const addr = cellAddr(r, c);
    if (!ws[addr]) ws[addr] = { t: "s", v: "" };
    ws[addr].s = { ...(ws[addr].s || {}), ...s };
  };

  const setValue = (r: number, c: number, v: any, t: "s" | "n" = "s") => {
    const addr = cellAddr(r, c);
    ws[addr] = ws[addr] || {};
    ws[addr].v = v;
    ws[addr].t = t;
  };

  const borderAll = {
    top: { style: "thin", color: { rgb: "CBD5E1" } },
    bottom: { style: "thin", color: { rgb: "CBD5E1" } },
    left: { style: "thin", color: { rgb: "CBD5E1" } },
    right: { style: "thin", color: { rgb: "CBD5E1" } },
  };

  // ---------- Merge title rows across all columns ----------
  ws["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: lastCol } }, // VETA
    { s: { r: 1, c: 0 }, e: { r: 1, c: lastCol } }, // Report title
    { s: { r: 2, c: 0 }, e: { r: 2, c: lastCol } }, // Date range
    { s: { r: 3, c: 0 }, e: { r: 3, c: lastCol } }, // Meta
  ];

  // Fill empty cells in title rows so merges look clean
  for (let c = 1; c < colCount; c++) {
    setValue(0, c, "", "s");
    setValue(1, c, "", "s");
    setValue(2, c, "", "s");
    setValue(3, c, "", "s");
  }

  // ---------- Title block styles (modern) ----------
  const titleBg = { fgColor: { rgb: "0F172A" } }; // slate-900
  const titleBg2 = { fgColor: { rgb: "111827" } }; // gray-900-ish
  const subBg = { fgColor: { rgb: "F1F5F9" } }; // slate-100

  // Row 0: VETA
  for (let c = 0; c < colCount; c++) {
    applyStyle(0, c, {
      font: { bold: true, sz: 16, color: { rgb: "FFFFFF" } },
      fill: titleBg,
      alignment: { horizontal: "center", vertical: "center" },
      border: borderAll,
    });
  }

  // Row 1: Report title
  for (let c = 0; c < colCount; c++) {
    applyStyle(1, c, {
      font: { bold: true, sz: 13, color: { rgb: "FFFFFF" } },
      fill: titleBg2,
      alignment: { horizontal: "center", vertical: "center" },
      border: borderAll,
    });
  }

  // Row 2: Date range
  for (let c = 0; c < colCount; c++) {
    applyStyle(2, c, {
      font: { bold: true, sz: 11, color: { rgb: "0F172A" } },
      fill: subBg,
      alignment: { horizontal: "center", vertical: "center" },
      border: borderAll,
    });
  }

  // Row 3: Meta line
  for (let c = 0; c < colCount; c++) {
    applyStyle(3, c, {
      font: { sz: 10, color: { rgb: "334155" } }, // slate-700
      fill: subBg,
      alignment: { horizontal: "center", vertical: "center" },
      border: borderAll,
    });
  }

  // ---------- Table Header styles (row 4) ----------
  const headerRowIndex = 4;
  for (let c = 0; c < colCount; c++) {
    applyStyle(headerRowIndex, c, {
      font: { bold: true, color: { rgb: "FFFFFF" } },
      fill: { fgColor: { rgb: "2563EB" } }, // blue-600
      alignment: { vertical: "center", horizontal: "center", wrapText: true },
      border: {
        top: { style: "medium", color: { rgb: "1E3A8A" } },
        bottom: { style: "medium", color: { rgb: "1E3A8A" } },
        left: { style: "thin", color: { rgb: "93C5FD" } },
        right: { style: "thin", color: { rgb: "93C5FD" } },
      },
    });
  }

  // ---------- Body styles (zebra + formats) ----------
  const bodyStartRow = headerRowIndex + 1;
  const totalRowIndex = bodyStartRow + body.length;

  for (let i = 0; i < body.length; i++) {
    const r = bodyStartRow + i;

    const isAlt = i % 2 === 1;
    const fill = isAlt ? { fgColor: { rgb: "F8FAFC" } } : { fgColor: { rgb: "FFFFFF" } };

    // Row base style
    for (let c = 0; c < colCount; c++) {
      applyStyle(r, c, {
        fill,
        border: borderAll,
        alignment: { vertical: "center" },
      });
    }

    // ✅ Amount column is index 7 (NOT 6)
    const amountColIndex = 7;
    const amountAddr = cellAddr(r, amountColIndex);
    if (ws[amountAddr]) {
      ws[amountAddr].t = "n";
      ws[amountAddr].z = '#,##0" TZS"';
      applyStyle(r, amountColIndex, {
        alignment: { horizontal: "right", vertical: "center" },
        font: { bold: true, color: { rgb: "0F172A" } },
      });
    }

    // ✅ Date column is index 8 (NOT 7)
    const dateColIndex = 8;
    const dateAddr = cellAddr(r, dateColIndex);
    if (ws[dateAddr]) {
      ws[dateAddr].z = "dd mmm yyyy";
      applyStyle(r, dateColIndex, {
        alignment: { horizontal: "left", vertical: "center" },
      });
    }

    // "#" column align center
    applyStyle(r, 0, { alignment: { horizontal: "center", vertical: "center" } });
  }

  // ---------- TOTAL row style ----------
  for (let c = 0; c < colCount; c++) {
    applyStyle(totalRowIndex, c, {
      font: { bold: true, color: { rgb: "0F172A" } },
      fill: { fgColor: { rgb: "DCFCE7" } }, // green-100
      border: {
        top: { style: "medium", color: { rgb: "16A34A" } },
        bottom: { style: "medium", color: { rgb: "16A34A" } },
        left: { style: "thin", color: { rgb: "86EFAC" } },
        right: { style: "thin", color: { rgb: "86EFAC" } },
      },
      alignment: { horizontal: c === 7 ? "right" : "center", vertical: "center" },
    });
  }

  // ✅ Ensure total amount cell numeric formatting (index 7)
  const totalAmtAddr = cellAddr(totalRowIndex, 7);
  if (ws[totalAmtAddr]) {
    ws[totalAmtAddr].t = "n";
    ws[totalAmtAddr].z = '#,##0" TZS"';
  }

  // ---------- Row heights (make title block nicer) ----------
  ws["!rows"] = [
    { hpt: 26 }, // VETA
    { hpt: 22 }, // Report title
    { hpt: 18 }, // Date range
    { hpt: 18 }, // Meta
    { hpt: 20 }, // Table header
  ];

  // ✅ Column widths MUST be 9 columns
  ws["!cols"] = [
    { wch: 5 },  // #
    { wch: 22 }, // Customer
    { wch: 18 }, // Center
    { wch: 14 }, // Zone
    { wch: 16 }, // Service Code
    { wch: 18 }, // Control Number
    { wch: 28 }, // Service
    { wch: 18 }, // Amount
    { wch: 16 }, // Date
  ];

  // ---------- Workbook ----------
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Collections");
  XLSX.writeFile(wb, "collection_report.xlsx");
};


  if (loading) {
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
            <CardTitle className="text-lg sm:text-xl text-slate-900">
              Collections Report
            </CardTitle>
            <CardDescription className="text-slate-600">
              Choose filters, then print or export. (Table preview is hidden.)
            </CardDescription>
          </div>

          <div className="flex gap-2">
           <Button
  onClick={exportPdf}
  className="h-10 rounded-xl bg-slate-900 text-white hover:bg-slate-800 shadow-sm"
>
  Print PDF
</Button>


            <Button
              onClick={exportExcel}
              className="h-10 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm disabled:opacity-60"
              disabled={!filteredData?.length}
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
                  onChange={(e) => setFromDate(e.target.value)}
                  className="h-10 rounded-xl border-slate-200 bg-white"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-700">To</label>
                <Input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="h-10 rounded-xl border-slate-200 bg-white"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-700">Service</label>
                <Select value={service} onValueChange={setService}>
                  <SelectTrigger className="h-10 rounded-xl border-slate-200 bg-white">
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All</SelectItem>
                    {uniqueServices.map((s, i) => (
                      <SelectItem key={i} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {(!isCentreUser || isHQUser) && (
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-700">Centre</label>
                  <Select value={center} onValueChange={setCenter} disabled={isCentreUser}>
                    <SelectTrigger className="h-10 rounded-xl border-slate-200 bg-white">
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All</SelectItem>
                      {uniqueCenters.map((c, i) => (
                        <SelectItem key={i} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {isHQUser && (
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-700">Zone</label>
                  <Select value={zone} onValueChange={setZone}>
                    <SelectTrigger className="h-10 rounded-xl border-slate-200 bg-white">
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All</SelectItem>
                      {uniqueZones.map((z, i) => (
                        <SelectItem key={i} value={z}>
                          {z}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="md:col-span-1">
                <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
                  Tip: When data is available, Print/Export become active.
                </div>
              </div>
            </div>
          </div>

          {/* Status (no tables) */}
          <div className="mt-4 rounded-2xl border border-slate-200/70 bg-white p-4">
            {loading ? (
              <div className="text-sm text-slate-600 flex items-center gap-3">
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-800" />
                Loading...
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="text-sm text-slate-700">
                  {filteredData?.length ? (
                    <>
                      Found{" "}
                      <span className="font-semibold text-slate-900">
                        {filteredData.length.toLocaleString()}
                      </span>{" "}
                      records.
                    </>
                  ) : (
                    "No records found for selected filters."
                  )}
                </div>

                <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-700">
                  Total:{" "}
                  <span className="font-semibold text-slate-900">
                    {totalAmount.toLocaleString()} TZS
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* NOTE: Table + pagination + summary tables intentionally removed */}
        </CardContent>
      </Card>
    </div>
  </div>
);

}
