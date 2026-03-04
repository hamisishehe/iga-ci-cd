"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

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

const pad2 = (n: number) => n.toString().padStart(2, "0");

const toYmd = (val: any) => {
  if (!val) return "";
  const s = String(val);
  // if already "YYYY-MM-DD"
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  // if ISO
  if (s.includes("T")) return s.split("T")[0];
  // try Date parse
  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) {
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  }
  return s;
};

export default function ApportionmentReport() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "/api";
  const searchParams = useSearchParams();

  // query params
  const qpStart = searchParams.get("startDate") || "";
  const qpEnd = searchParams.get("endDate") || "";
  const qpCentre = searchParams.get("centre") || "";

  // safe localStorage
  const [mounted, setMounted] = useState(false);
  const [userType, setUserType] = useState("");
  const [userCentre, setUserCentre] = useState("");
  const [userZone, setUserZone] = useState("");

  const isCentreUser = userType === "CENTRE" && Boolean(userCentre);
  const isZoneUser = userType === "ZONE" && Boolean(userZone);
  const isHQUser = userType === "HQ";

  // filters / data
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [centre, setCentre] = useState("all");
  const [centres, setCentres] = useState<string[]>([]);

  const [data, setData] = useState<ServiceData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const formatNumber = (val: any) =>
    val !== null && val !== undefined && !Number.isNaN(Number(val))
      ? Number(val).toLocaleString()
      : "-";

  // init: read role + default month
  useEffect(() => {
    setMounted(true);

    const ut = (localStorage.getItem("userType") || "").toUpperCase();
    const uc = localStorage.getItem("centre") || "";
    const uz = localStorage.getItem("zone") || "";

    setUserType(ut);
    setUserCentre(uc);
    setUserZone(uz);

    const today = new Date();
    const y = today.getFullYear();
    const m = today.getMonth() + 1;
    const firstDay = `${y}-${pad2(m)}-01`;
    const lastDay = `${y}-${pad2(m)}-${pad2(new Date(y, m, 0).getDate())}`;

    setStartDate(firstDay);
    setEndDate(lastDay);

    // lock centre selection if centre user
    if (ut === "CENTRE" && uc) setCentre(uc);
  }, []);

  // apply query params (after mounted + role known)
  useEffect(() => {
    if (!mounted) return;

    if (qpStart) setStartDate(qpStart);
    if (qpEnd) setEndDate(qpEnd);

    if (qpCentre) {
      // Centre param only allowed if not centre user
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
        setLoading(false);
        return;
      }

      const res = await fetch(`${apiUrl}/apposhments/all`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "X-API-KEY": apiKey,
        },
      });

      const json = await res.json();

      // robust shapes
      const rows: any[] = Array.isArray(json)
        ? json
        : Array.isArray(json?.data)
        ? json.data
        : Array.isArray(json?.content)
        ? json.content
        : [];

      // role-based visibility
      let visible = [...rows];

      if (isCentreUser && userCentre) {
        visible = visible.filter(
          (r: any) => (r.centre?.name || "").toLowerCase() === userCentre.toLowerCase()
        );
        centreName = userCentre; // lock
        setCentre(userCentre);
      } else if (isZoneUser && userZone) {
        visible = visible.filter((r: any) => {
          const z1 = r.centre?.zones?.name;
          const z2 = r.centre?.zone;
          const z = (z1 || z2 || "").toString().toLowerCase();
          return z === userZone.toLowerCase();
        });
      }

      // build centre list (based on ALL rows but respecting role)
      let centreList = Array.from(
        new Set(rows.map((r: any) => r?.centre?.name).filter(Boolean))
      ) as string[];

      if (isZoneUser && userZone) {
        centreList = centreList.filter((cName) => {
          const anyRow = rows.find((r: any) => r?.centre?.name === cName);
          const z1 = anyRow?.centre?.zones?.name;
          const z2 = anyRow?.centre?.zone;
          const z = (z1 || z2 || "").toString().toLowerCase();
          return z === userZone.toLowerCase();
        });
      }

      if (isCentreUser && userCentre) {
        centreList = [userCentre];
      }

      setCentres(centreList);

      // centre dropdown filter for HQ/ZONE
      if (!isCentreUser && centreName !== "all") {
        visible = visible.filter((r: any) => (r.centre?.name || "") === centreName);
      }

      // date overlap filter (apportionment start/end ranges)
      const requestedStart = new Date(start).getTime();
      const requestedEnd = new Date(end).getTime();

      const ranged = visible.filter((row: any) => {
        if (!row.startDate || !row.endDate) return false;
        const rowStart = new Date(row.startDate).getTime();
        const rowEnd = new Date(row.endDate).getTime();
        return rowEnd >= requestedStart && rowStart <= requestedEnd;
      });

      // flatten service rows
      const flat: ServiceData[] = [];
      ranged.forEach((apportionment: any) => {
        (apportionment.services || []).forEach((service: any) => {
          flat.push({
            apportionmentId: String(apportionment.id ?? ""),
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
      setCentres(isCentreUser && userCentre ? [userCentre] : []);
      setError(err?.message || "Unable to fetch apportionment data.");
    } finally {
      setLoading(false);
    }
  };

  const totals = useMemo(
    () =>
      data.reduce(
        (acc, row) => {
          acc.amountRemitted += row.amountRemitted || 0;
          acc.executors += row.executors || 0;
          acc.supporters += row.supporters || 0;
          acc.agencyFee += row.agencyFee || 0;
          acc.amountToBePaid += row.amountToBePaid || 0;
          return acc;
        },
        {
          amountRemitted: 0,
          executors: 0,
          supporters: 0,
          agencyFee: 0,
          amountToBePaid: 0,
        }
      ),
    [data]
  );

  const remaining = useMemo(
    () => totals.amountRemitted - (totals.agencyFee + totals.amountToBePaid),
    [totals]
  );

  const effectiveCentreLabel = isCentreUser ? userCentre : centre === "all" ? "ALL" : centre;

  const exportExcel = () => {
    if (!data.length) {
      toast("No data to export");
      return;
    }

    const wsData: any[] = [
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
        toYmd(row.date),
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
      [],
      ["META"],
      ["From", startDate || "-"],
      ["To", endDate || "-"],
      ["Centre", effectiveCentreLabel],
      ["User Type", userType || "-"],
    ];

    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // make columns a bit wider (simple)
    (ws as any)["!cols"] = [
      { wch: 5 },
      { wch: 12 },
      { wch: 28 },
      { wch: 22 },
      { wch: 16 },
      { wch: 10 },
      { wch: 12 },
      { wch: 12 },
      { wch: 16 },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Apportionment Report");
    XLSX.writeFile(wb, "apportionment_report.xlsx");
  };

  const exportPDF = () => {
    if (!data.length) {
      toast("No data to export");
      return;
    }

    const doc = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4",
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const marginX = 10;

    const drawHeader = () => {
      doc.setFillColor(245, 247, 250);
      doc.roundedRect(marginX, 8, pageWidth - marginX * 2, 22, 3, 3, "F");

      doc.setDrawColor(220);
      doc.roundedRect(marginX, 8, pageWidth - marginX * 2, 22, 3, 3, "S");

      // logo (best-effort)
      const img = new Image();
      img.src = "/veta.png";
      try {
        doc.addImage(img, "PNG", 14, 13, 18, 18);
      } catch {}

      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text("VETA", pageWidth / 2, 15, { align: "center" });

      doc.setFontSize(12);
      doc.text("APPORTIONMENT REPORT", pageWidth / 2, 21, { align: "center" });

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      const rangeText = `From: ${startDate || "-"}   To: ${endDate || "-"}`;
      const metaText = `Centre: ${effectiveCentreLabel} | User: ${userType || "-"}`;
      doc.text(rangeText, pageWidth / 2, 27, { align: "center" });
      doc.setFontSize(9);
      doc.text(metaText, pageWidth / 2, 31, { align: "center" });
    };

    drawHeader();

    const tableHead = [
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
    ];

    const tableBody = data.map((row, i) => [
      i + 1,
      toYmd(row.date),
      row.courseName,
      row.centre,
      Number(row.amountRemitted || 0).toLocaleString(),
      Number(row.executors || 0).toLocaleString(),
      Number(row.supporters || 0).toLocaleString(),
      Number(row.agencyFee || 0).toLocaleString(),
      Number(row.amountToBePaid || 0).toLocaleString(),
    ]);

    // totals row
    tableBody.push([
      "TOTAL",
      "",
      "",
      "",
      Number(totals.amountRemitted || 0).toLocaleString(),
      Number(totals.executors || 0).toLocaleString(),
      Number(totals.supporters || 0).toLocaleString(),
      Number(totals.agencyFee || 0).toLocaleString(),
      Number(totals.amountToBePaid || 0).toLocaleString(),
    ]);

    autoTable(doc, {
      head: tableHead,
      body: tableBody,
      startY: 36,
      theme: "grid",
      styles: {
        fontSize: 8,
        cellPadding: 2,
        overflow: "linebreak",
        valign: "middle",
      },
      headStyles: {
        fillColor: [15, 23, 42],
        textColor: 255,
        halign: "center",
        fontStyle: "bold",
      },
      columnStyles: {
        0: { cellWidth: 8 },
        1: { cellWidth: 18 },
        2: { cellWidth: 60 },
        3: { cellWidth: 32 },
        4: { halign: "right", cellWidth: 26 },
        5: { halign: "right", cellWidth: 18 },
        6: { halign: "right", cellWidth: 20 },
        7: { halign: "right", cellWidth: 22 },
        8: { halign: "right", cellWidth: 26 },
      },
      didParseCell: (ctx) => {
        const isTotalRow = ctx.row.index === tableBody.length - 1;
        if (isTotalRow) {
          ctx.cell.styles.fontStyle = "bold";
          ctx.cell.styles.fillColor = [219, 234, 254];
        }
      },
      margin: { left: marginX, right: marginX },
    });

    const lastY = (doc as any).lastAutoTable?.finalY || 36;
    let y = lastY + 8;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("SUMMARY", marginX, y);
    y += 3;

    const summaryRows: any[] = [
      ["Total Amount Remitted", Number(totals.amountRemitted || 0).toLocaleString()],
      ["Total Agency Fee", Number(totals.agencyFee || 0).toLocaleString()],
      ["Total Amount to be Paid", Number(totals.amountToBePaid || 0).toLocaleString()],
      ["Remaining Balance", Number(remaining || 0).toLocaleString()],
    ];

    autoTable(doc, {
      startY: y + 2,
      head: [["Description", "Amount (TZS)"]],
      body: summaryRows,
      theme: "grid",
      styles: { fontSize: 9, cellPadding: 2 },
      headStyles: {
        fillColor: [15, 23, 42],
        textColor: 255,
        fontStyle: "bold",
      },
      columnStyles: {
        0: { cellWidth: 120 },
        1: { halign: "right", cellWidth: 45 },
      },
      margin: { left: marginX, right: marginX },
    });

    // footer page numbers
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(9);
      doc.setTextColor(120);
      doc.text(
        `Page ${i} of ${pageCount}`,
        pageWidth - marginX,
        doc.internal.pageSize.getHeight() - 6,
        { align: "right" }
      );
    }

    doc.save("apportionment_report.pdf");
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50">
      <div className="p-6 space-y-6">
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

        <Card className="relative overflow-hidden rounded-2xl border-slate-200/60 bg-white shadow-sm">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/8 via-transparent to-sky-500/8" />
          <CardHeader className="relative flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <CardTitle className="text-lg sm:text-xl text-slate-900">
                {isCentreUser && <span className="text-slate-500">{userCentre} — </span>}
                Apportionment Report
              </CardTitle>
              <CardDescription className="text-slate-600">
                Choose filters, then print or export. (Table preview is hidden.)
              </CardDescription>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                className="h-10 rounded-xl bg-slate-900 text-white hover:bg-slate-800 shadow-sm disabled:opacity-60"
                onClick={() => fetchData(startDate, endDate, isCentreUser ? userCentre : centre)}
                disabled={!startDate || !endDate || loading}
              >
                {loading ? "Loading..." : "Apply"}
              </Button>

              <Button
                className="h-10 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm disabled:opacity-60"
                onClick={() => {
                  if (!data?.length) return;
                  window.print();
                }}
                disabled={!data?.length || loading}
              >
                Print
              </Button>

              <Button
                onClick={exportPDF}
                className="h-10 rounded-xl bg-slate-900 text-white hover:bg-slate-800 shadow-sm disabled:opacity-60"
                disabled={!data?.length || loading}
              >
                Print PDF
              </Button>

              <Button
                className="h-10 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm disabled:opacity-60"
                onClick={exportExcel}
                disabled={!data?.length || loading}
              >
                Export Excel
              </Button>
            </div>
          </CardHeader>

          <CardContent className="relative">
            {/* Filters */}
            <div className="rounded-2xl border border-slate-200/70 bg-gradient-to-b from-slate-50 to-white p-4 sm:p-5">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                <div className="md:col-span-3 space-y-1.5">
                  <label className="block text-xs font-medium text-slate-700">From</label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="h-10 rounded-xl border-slate-200 bg-white"
                  />
                </div>

                <div className="md:col-span-3 space-y-1.5">
                  <label className="block text-xs font-medium text-slate-700">To</label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="h-10 rounded-xl border-slate-200 bg-white"
                  />
                </div>

                {/* Centre filter only for HQ/ZONE */}
                {!isCentreUser && (
                  <div className="md:col-span-4 space-y-1.5">
                    <label className="block text-xs font-medium text-slate-700">Centre</label>
                    <Select value={centre} onValueChange={(val) => setCentre(val)}>
                      <SelectTrigger className="h-10 rounded-xl border-slate-200 bg-white">
                        <SelectValue placeholder="Select Centre" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Centres</SelectItem>
                        {centres.map((c, i) => (
                          <SelectItem key={`centre-${i}`} value={c}>
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="md:col-span-2">
                  <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
                    Tip: Click <span className="font-semibold text-slate-800">Apply</span> to load data.
                  </div>
                </div>
              </div>
            </div>

            {/* Status (no tables) */}
            <div className="mt-4 rounded-2xl border border-slate-200/70 bg-white p-4">
              {error ? (
                <div className="text-sm text-red-700">{error}</div>
              ) : loading ? (
                <div className="text-sm text-slate-600 flex items-center gap-3">
                  <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-800" />
                  Loading...
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="text-sm text-slate-700">
                    {data?.length ? (
                      <>
                        Loaded{" "}
                        <span className="font-semibold text-slate-900">
                          {data.length.toLocaleString()}
                        </span>{" "}
                        rows.
                      </>
                    ) : (
                      "No data loaded yet. Use filters then click Apply."
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-700 shadow-sm">
                      Total Remitted:{" "}
                      <span className="font-semibold text-slate-900">
                        {formatNumber(totals.amountRemitted)}
                      </span>
                    </div>
                    <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-700 shadow-sm">
                      Remaining:{" "}
                      <span className="font-semibold text-slate-900">
                        {formatNumber(remaining)}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* NOTE: Table intentionally removed */}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}