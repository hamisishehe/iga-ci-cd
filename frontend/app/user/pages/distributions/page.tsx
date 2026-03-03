"use client";

import React, { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import Swal from "sweetalert2";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { toast } from "sonner";

// ✅ PDF + table
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

type Row = {
  id: any;
  centre: string;
  zone: string;
  date: string;

  // ✅ keep both (backend should send gfs_code for special splits)
  gfs_code: string;
  gfs_code_description: string;

  originalAmount: any;
  expenditureAmount: any;
  profitAmountPerCentreReport: any;
  contributionToCentralIGA: any;
  facilitationOfIGAForCentralActivities: any;
  facilitationZonalActivities: any;
  facilitationOfIGAForCentreActivities: any;
  supportToProductionUnit: any;
  contributionToCentreIGAFund: any;
  depreciationIncentiveToFacilitators: any;
  remittedToCentre: any;

  centre_id: any;
};

export default function DistributionReportPage() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "/api";

  // Filters
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [course, setCourse] = useState("");
  const [description, setDescription] = useState("");
  const [centre, setCentre] = useState("");
  const [zone, setZone] = useState("");
  const [role, setRole] = useState("");

  // Data
  const [data, setData] = useState<Row[]>([]);
  const [filteredData, setFilteredData] = useState<Row[]>([]);

  // ✅ start NOT loading; only load when user clicks Apply
  const [loading, setLoading] = useState(false);
  const [hasApplied, setHasApplied] = useState(false);

  // Pagination + state
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 20;

  // Apportionment
  const [apportionmentSaved, setApportionmentSaved] = useState(false);

  // ✅ Read localStorage safely into state
  const [userType, setUserType] = useState<string>("");
  const [userCentre, setUserCentre] = useState<string>("");
  const [userZone, setUserZone] = useState<string>("");

  useEffect(() => {
    setUserType(localStorage.getItem("userType") || "");
    setUserCentre(localStorage.getItem("centre") || "");
    setUserZone(localStorage.getItem("zone") || "");
    setRole(localStorage.getItem("userRole") || "");
  }, []);

  const isCentreUser = userType === "CENTRE";
  const isZoneUser = userType === "ZONE";
  const isHQUser = userType === "HQ";

  const formatNumber = (val: any) =>
    val !== null && val !== undefined && !Number.isNaN(Number(val))
      ? Number(val).toLocaleString()
      : "-";

  const toSafeNumber = (v: any) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };

  const fileStamp = () => {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(
      d.getHours()
    )}${pad(d.getMinutes())}`;
  };

  // ✅ Normalize special backend override codes into clean labels for UI
  const normalizeGfsDesc = (raw: string) => {
    const s = (raw || "").trim();
    if (!s) return "";
    const u = s.toUpperCase();

    // if backend sends overrideCode in gfs_code_description, normalize it
    if (u.includes("OTHER_CONTRIBUTION") || u === "OTHER CONTRIBUTION") return "OTHER CONTRIBUTION";
    if (u.includes("SHORT_COURSE_TUITION_FEE") || u === "SHORT COURSE TUITION FEE" || u === "SHORT COURSE TUITION FEE")
      return "Short Course Tuition Fee";
    if (u.includes("-DRIVING") || u.includes("BASIC DRIVING")) return "DRIVING";

    return s;
  };

  const getCourseLabel = (descRaw: string) => {
    const desc = normalizeGfsDesc(descRaw);

    // ✅ NEW
    if (desc === "OTHER CONTRIBUTION") return "OTHER CONTRIBUTION";
    if (desc === "Short Course Tuition Fee") return "SHORT COURSE TUITION FEE";

    if (desc === "Receipts from Application Fee") return "APPLICATION FEE";
    if (desc === "OTH")
      return "SHORT COURSES, TAILOR MADE, CONTINUOUS LEARNING WORKSHOPS";
    if (desc === "Miscellaneous receipts") return "SEPARATE PRODUCTION UNIT";
    return desc || "N/A";
  };

  const getDescriptionLabel = (descRaw: string) => {
    const desc = normalizeGfsDesc(descRaw);

    // ✅ NEW
    if (desc === "OTHER CONTRIBUTION") return "OTHER CONTRIBUTION";
    if (desc === "Short Course Tuition Fee") return "SHORT COURSE TUITION FEE";

    if (desc === "Receipts from Application Fee")
      return "LONG AND SHORT COURSE APPLICATION FEE";
    if (desc === "OTH") return "SHORT COURSES";
    if (desc === "Miscellaneous receipts")
      return "HOTEL, CCC, BUILDING BRIGADES, FURNITURE PRODUCTION UNIT, MEAT INDUSTRY TRAINING COURSE, PRINTING UNIT AND HEAVY-DUTY PLANT OPERATIONS";
    return desc || "N/A";
  };

  // ✅ robust fetch that handles: [] OR {data:[]} OR {content:[]}
  const fetchData = async (start: string, end: string) => {
    setLoading(true);
    try {
      const token = localStorage.getItem("authToken");
      const apiKey = process.env.NEXT_PUBLIC_API_KEY;

      if (!token || !apiKey) {
        toast("Missing authentication credentials");
        setData([]);
        setFilteredData([]);
        return;
      }

      const res = await fetch(`${apiUrl}/allocation/all-centres`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "X-API-KEY": apiKey,
        },
        body: JSON.stringify({ startDate: start, endDate: end }),
      });

      if (!res.ok) {
        const msg = await res.text().catch(() => "");
        console.error("API error:", res.status, msg);
        toast(`Failed to fetch data (${res.status})`);
        setData([]);
        setFilteredData([]);
        return;
      }

      const json = await res.json();

      const list: any[] = Array.isArray(json)
        ? json
        : Array.isArray(json?.data)
        ? json.data
        : Array.isArray(json?.content)
        ? json.content
        : [];

      const mappedData: Row[] = list.map((item: any, index: number) => ({
        id: item.id ?? `row-${index}`,

        centre: item.centres?.name || item.centre?.name || "",
        zone: item.centres?.zones?.name || item.centre?.zones?.name || "",

        date: item.date ? String(item.date).split("T")[0] : "",

        // ✅ IMPORTANT: map gfs_code too (backend should send it)
        gfs_code: item.gfs_code || "",
        gfs_code_description: item.gfs_code_description || "",

        originalAmount: item.originalAmount ?? 0,
        expenditureAmount: item.expenditureAmount ?? 0,
        profitAmountPerCentreReport: item.profitAmountPerCentreReport ?? 0,
        contributionToCentralIGA: item.contributionToCentralIGA ?? 0,
        facilitationOfIGAForCentralActivities:
          item.facilitationOfIGAForCentralActivities ?? 0,
        facilitationZonalActivities: item.facilitationZonalActivities ?? 0,
        facilitationOfIGAForCentreActivities:
          item.facilitationOfIGAForCentreActivities ?? 0,
        supportToProductionUnit: item.supportToProductionUnit ?? 0,
        contributionToCentreIGAFund: item.contributionToCentreIGAFund ?? 0,
        depreciationIncentiveToFacilitators:
          item.depreciationIncentiveToFacilitators ?? 0,
        remittedToCentre: item.remittedToCentre ?? 0,

        centre_id:
          item.centres?.id || item.centre?.id || item.id || `centre-${index}`,
      }));

      let userFilteredData = mappedData;

      if (isCentreUser && userCentre) {
        userFilteredData = mappedData.filter(
          (d: any) => d.centre?.toLowerCase() === userCentre.toLowerCase()
        );
      } else if (isZoneUser && userZone) {
        userFilteredData = mappedData.filter(
          (d: any) => d.zone?.toLowerCase() === userZone.toLowerCase()
        );
      }

      setData(userFilteredData);
      setFilteredData(userFilteredData);
      setCurrentPage(1);
    } catch (err) {
      console.error("Error fetching distribution data:", err);
      toast("Failed to fetch data");
      setData([]);
      setFilteredData([]);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Initial load: ONLY set dates, DON'T fetch until user clicks Apply
  useEffect(() => {
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
  }, []);

  const handleApply = async () => {
    if (!startDate || !endDate) {
      toast("Please select both start and end date");
      return;
    }
    setHasApplied(true);
    setApportionmentSaved(false);
    await fetchData(startDate, endDate);
  };

  // Unique options based on data
  const uniqueCentres = useMemo(() => {
    if (isCentreUser) return userCentre ? [userCentre] : [];
    return Array.from(new Set(data.map((item) => item.centre))).filter(Boolean);
  }, [data, isCentreUser, userCentre]);

  const uniqueZones = useMemo(() => {
    if (isZoneUser) return userZone ? [userZone] : [];
    return Array.from(new Set(data.map((item) => item.zone))).filter(Boolean);
  }, [data, isZoneUser, userZone]);

  const uniqueCourses = useMemo(() => {
    return Array.from(
      new Set(data.map((item) => getCourseLabel(item.gfs_code_description)))
    );
  }, [data]);

  const uniqueDescriptions = useMemo(() => {
    return Array.from(
      new Set(data.map((item) => getDescriptionLabel(item.gfs_code_description)))
    );
  }, [data]);

  // Reactive filtering
  useEffect(() => {
    if (!data.length) {
      setFilteredData([]);
      return;
    }

    const filtered = data.filter((item) => {
      const itemDate = item.date ? new Date(item.date) : null;

      const isAfterFrom =
        startDate && itemDate ? itemDate >= new Date(startDate) : true;
      const isBeforeTo =
        endDate && itemDate ? itemDate <= new Date(endDate) : true;

      const matchCourse = course
        ? getCourseLabel(item.gfs_code_description) === course
        : true;

      const matchDesc = description
        ? getDescriptionLabel(item.gfs_code_description) === description
        : true;

      const matchCentre = isCentreUser || !centre || item.centre === centre;
      const matchZone = !isHQUser || !zone || item.zone === zone;

      return (
        isAfterFrom &&
        isBeforeTo &&
        matchCourse &&
        matchDesc &&
        matchCentre &&
        matchZone
      );
    });

    setFilteredData(filtered);
    setCurrentPage(1);
  }, [data, startDate, endDate, course, description, centre, zone, isCentreUser, isHQUser]);

  // Pagination
  const indexOfLastRow = currentPage * rowsPerPage;
  const indexOfFirstRow = indexOfLastRow - rowsPerPage;
  const currentRows = filteredData.slice(indexOfFirstRow, indexOfLastRow);
  const totalPages = Math.ceil(filteredData.length / rowsPerPage);

  // Totals
  const totalOriginalAmount = filteredData.reduce(
    (sum, item) => sum + (toSafeNumber(item.originalAmount) || 0),
    0
  );
  const totalExpenditureAmount = filteredData.reduce(
    (sum, item) => sum + (toSafeNumber(item.expenditureAmount) || 0),
    0
  );
  const totalProfitAmountPerCentreReport = filteredData.reduce(
    (sum, item) => sum + (toSafeNumber(item.profitAmountPerCentreReport) || 0),
    0
  );
  const totalContributionToCentralIGA = filteredData.reduce(
    (sum, item) => sum + (toSafeNumber(item.contributionToCentralIGA) || 0),
    0
  );
  const totalFacilitationOfIGAForCentralActivities = filteredData.reduce(
    (sum, item) =>
      sum + (toSafeNumber(item.facilitationOfIGAForCentralActivities) || 0),
    0
  );
  const totalFacilitationZonalActivities = filteredData.reduce(
    (sum, item) => sum + (toSafeNumber(item.facilitationZonalActivities) || 0),
    0
  );
  const totalFacilitationOfIGAForCentreActivities = filteredData.reduce(
    (sum, item) =>
      sum + (toSafeNumber(item.facilitationOfIGAForCentreActivities) || 0),
    0
  );
  const totalSupportToProductionUnit = filteredData.reduce(
    (sum, item) => sum + (toSafeNumber(item.supportToProductionUnit) || 0),
    0
  );
  const totalContributionToCentreIGAFund = filteredData.reduce(
    (sum, item) => sum + (toSafeNumber(item.contributionToCentreIGAFund) || 0),
    0
  );
  const totalDepreciationIncentiveToFacilitators = filteredData.reduce(
    (sum, item) =>
      sum + (toSafeNumber(item.depreciationIncentiveToFacilitators) || 0),
    0
  );
  const totalRemittedToCentre = filteredData.reduce(
    (sum, item) => sum + (toSafeNumber(item.remittedToCentre) || 0),
    0
  );

  const summaryPerCourse = uniqueCourses.map((c) => {
    const total = filteredData
      .filter((row) => getCourseLabel(row.gfs_code_description) === c)
      .reduce((sum, row) => sum + (toSafeNumber(row.remittedToCentre) || 0), 0);
    return { course: c, total };
  });

  const grandTotal =
    totalExpenditureAmount +
    summaryPerCourse.reduce((sum, s) => sum + s.total, 0) +
    totalRemittedToCentre +
    totalFacilitationZonalActivities +
    totalFacilitationOfIGAForCentralActivities +
    totalContributionToCentralIGA;

  // ✅ PRINT (table + summary) — opens print window with clean markup
  const printReport = () => {
    if (!hasApplied || !filteredData.length) {
      toast("No data to print");
      return;
    }

    const titleMain = "VETA";
    const titleSub = "DISTRIBUTION REPORT";
    const dateRange = `From ${startDate || "-"} To ${endDate || "-"}`;
    const meta = `Centre: ${
      (isCentreUser ? userCentre : centre) || "ALL"
    } | Zone: ${(isZoneUser ? userZone : zone) || "ALL"} | Course: ${course || "ALL"} | Description: ${
      description || "ALL"
    }`;

    // build rows for ALL filtered data (not only current page)
    const rowsHtml = filteredData
      .map((row, i) => {
        const tds = [
          i + 1,
          getCourseLabel(row.gfs_code_description),
          getDescriptionLabel(row.gfs_code_description),
          toSafeNumber(row.originalAmount).toLocaleString(),
          toSafeNumber(row.expenditureAmount).toLocaleString(),
          toSafeNumber(row.profitAmountPerCentreReport).toLocaleString(),
          toSafeNumber(row.contributionToCentralIGA).toLocaleString(),
          toSafeNumber(row.facilitationOfIGAForCentralActivities).toLocaleString(),
          toSafeNumber(row.facilitationZonalActivities).toLocaleString(),
          toSafeNumber(row.facilitationOfIGAForCentreActivities).toLocaleString(),
          toSafeNumber(row.supportToProductionUnit).toLocaleString(),
          toSafeNumber(row.contributionToCentreIGAFund).toLocaleString(),
          toSafeNumber(row.depreciationIncentiveToFacilitators).toLocaleString(),
          toSafeNumber(row.remittedToCentre).toLocaleString(),
        ];
        return `<tr>${tds
          .map((c, idx) =>
            idx >= 3 ? `<td class="num">${c}</td>` : `<td>${c}</td>`
          )
          .join("")}</tr>`;
      })
      .join("");

    const totalsRow = `
      <tr class="totals">
        <td colspan="3">TOTAL</td>
        <td class="num">${totalOriginalAmount.toLocaleString()}</td>
        <td class="num">${totalExpenditureAmount.toLocaleString()}</td>
        <td class="num">${totalProfitAmountPerCentreReport.toLocaleString()}</td>
        <td class="num">${totalContributionToCentralIGA.toLocaleString()}</td>
        <td class="num">${totalFacilitationOfIGAForCentralActivities.toLocaleString()}</td>
        <td class="num">${totalFacilitationZonalActivities.toLocaleString()}</td>
        <td class="num">${totalFacilitationOfIGAForCentreActivities.toLocaleString()}</td>
        <td class="num">${totalSupportToProductionUnit.toLocaleString()}</td>
        <td class="num">${totalContributionToCentreIGAFund.toLocaleString()}</td>
        <td class="num">${totalDepreciationIncentiveToFacilitators.toLocaleString()}</td>
        <td class="num">${totalRemittedToCentre.toLocaleString()}</td>
      </tr>
    `;

    const summaryRows = [
      `<tr><td>Expenditure as per GIGA</td><td class="num">${totalExpenditureAmount.toLocaleString()}</td></tr>`,
      ...summaryPerCourse.map(
        (s) =>
          `<tr><td>Amount to be Remitted to Centre — <b>${s.course}</b></td><td class="num">${toSafeNumber(
            s.total
          ).toLocaleString()}</td></tr>`
      ),
      `<tr class="totals"><td>Total Funds to be Remitted to Centre as per Apportionment</td><td class="num">${totalRemittedToCentre.toLocaleString()}</td></tr>`,
      `<tr><td>Amount to be Remitted to Zone Offices</td><td class="num">${totalFacilitationZonalActivities.toLocaleString()}</td></tr>`,
      `<tr><td>Amount for Central IGA Committee &amp; Secretariat</td><td class="num">${totalFacilitationOfIGAForCentralActivities.toLocaleString()}</td></tr>`,
      `<tr><td>Amount Remained at Central IGA Fund</td><td class="num">${totalContributionToCentralIGA.toLocaleString()}</td></tr>`,
    ].join("");

    const w = window.open("", "_blank", "noopener,noreferrer");
    if (!w) {
      toast("Pop-up blocked. Allow pop-ups then try again.");
      return;
    }

    // IMPORTANT: logo must be absolute URL for print window
    const logoUrl = `${window.location.origin}/veta.png`;

    w.document.open();
    w.document.write(`
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>Distribution Report</title>
          <style>
            @page { size: A4 landscape; margin: 10mm; }
            body { font-family: Arial, sans-serif; color: #0f172a; }
            .header {
              display:flex; align-items:center; justify-content:space-between;
              padding:10px 12px; border:1px solid #cbd5e1; background:#0f172a; color:white;
              border-radius:10px;
            }
            .header .titles { text-align:center; flex:1; }
            .header img { width:34px; height:34px; object-fit:contain; }
            .titleMain { font-weight:700; font-size:16px; margin:0; }
            .titleSub { font-weight:700; font-size:12px; margin:2px 0 0; }
            .meta { font-size:10px; opacity:.95; margin-top:4px; }
            .section { margin-top:12px; }
            table { width:100%; border-collapse:collapse; }
            th, td { border:1px solid #e2e8f0; padding:6px 6px; font-size:10px; vertical-align:top; }
            th { background:#1e293b; color:white; text-align:left; }
            td.num, th.num { text-align:right; white-space:nowrap; }
            tr:nth-child(even) td { background:#f8fafc; }
            tr.totals td { font-weight:700; background:#dcfce7 !important; }
            .summaryWrap { display:grid; grid-template-columns: 1fr; gap:12px; }
            .summaryTitle { font-size:12px; font-weight:700; margin:0 0 6px; }
            .grand td { font-weight:800; background:#e0f2fe !important; }
            .footer { margin-top:10px; font-size:10px; color:#475569; display:flex; justify-content:space-between; }
            .noPrint { margin-top:10px; display:flex; gap:8px; }
            .btn { border:1px solid #cbd5e1; padding:8px 10px; border-radius:10px; background:white; cursor:pointer; font-size:12px; }
            .btnPrimary { background:#0f172a; color:white; border-color:#0f172a; }
            @media print {
              .noPrint { display:none; }
              .header { border-radius:0; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <img src="${logoUrl}" alt="VETA" />
            <div class="titles">
              <p class="titleMain">${titleMain}</p>
              <p class="titleSub">${titleSub}</p>
              <div class="meta">${dateRange}</div>
              <div class="meta">${meta}</div>
            </div>
            <img src="${logoUrl}" alt="VETA" />
          </div>

          <div class="noPrint">
            <button class="btn btnPrimary" onclick="window.print()">Print</button>
            <button class="btn" onclick="window.close()">Close</button>
          </div>

          <div class="section">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Course</th>
                  <th>Description</th>
                  <th class="num">Collections</th>
                  <th class="num">Expenditure</th>
                  <th class="num">Profit Markup As Per GIGA</th>
                  <th class="num">Contribution Central IGA</th>
                  <th class="num">Facilitation Central</th>
                  <th class="num">Facilitation Zonal</th>
                  <th class="num">Facilitation Centre</th>
                  <th class="num">Support Production</th>
                  <th class="num">Contribution Centre IGA</th>
                  <th class="num">Depreciation/Incentive</th>
                  <th class="num">Remitted To Centre</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHtml}
                ${totalsRow}
              </tbody>
            </table>
          </div>

          <div class="section summaryWrap">
            <div>
              <p class="summaryTitle">Summary</p>
              <table>
                <tbody>
                  ${summaryRows}
                </tbody>
              </table>
            </div>
          </div>

          <div class="footer">
            <div>Generated on ${new Date().toLocaleString()}</div>
            <div>Rows: ${filteredData.length}</div>
          </div>

          <script>
            setTimeout(() => { window.print(); }, 350);
          </script>
        </body>
      </html>
    `);
    w.document.close();
  };

  // ✅ EXPORT PDF (table + summary + totals + footer)
  const exportPdf = async () => {
    if (!filteredData.length) {
      toast("No data to export");
      return;
    }

    // ✅ A3 landscape = more width (prevents last column cut)
    const doc = new jsPDF("l", "mm", "a3");

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const marginX = 10;

    const titleMain = "VETA";
    const titleSub = "DISTRIBUTION REPORT";
    const dateRange = `From ${startDate || "-"}  To ${endDate || "-"}`;
    const effectiveCentre = isCentreUser ? userCentre : centre;
    const effectiveZone = isZoneUser ? userZone : zone;

    const meta = `Centre: ${effectiveCentre ?? "ALL"} | Zone: ${
      effectiveZone ?? "ALL"
    } | Course: ${course || "ALL"} | Description: ${description || "ALL"}`;

    // ✅ Header bar (dynamic width)
    doc.setFillColor(15, 23, 42);
    doc.rect(marginX, 10, pageWidth - marginX * 2, 24, "F");
    doc.setDrawColor(203, 213, 225);
    doc.rect(marginX, 10, pageWidth - marginX * 2, 24);

    // Logos
    const img = new Image();
    img.src = "/veta.png";
    try {
      doc.addImage(img as any, "PNG", marginX + 4, 13, 16, 16);
      doc.addImage(img as any, "PNG", pageWidth - marginX - 20, 13, 16, 16);
    } catch {}

    // Titles
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text(titleMain, pageWidth / 2, 18, { align: "center" });

    doc.setFontSize(10);
    doc.text(titleSub, pageWidth / 2, 23, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(dateRange, pageWidth / 2, 28, { align: "center" });

    doc.setFontSize(8.5);
    doc.text(meta, pageWidth / 2, 32, { align: "center" });

    // =========================
    // MAIN TABLE
    // =========================
    const head = [[
      "#",
      "Course",
      "Description",
      "Collections",
      "Expenditure",
      "Profit Markup",
      "Contribution Central",
      "Facilitation Central",
      "Facilitation Zonal",
      "Facilitation Centre",
      "Support Production",
      "Contribution Centre IGA",
      "Depreciation/Incentive",
      "Remitted To Centre",
    ]];

    const body = filteredData.map((r, i) => [
      i + 1,
      getCourseLabel(r.gfs_code_description),
      getDescriptionLabel(r.gfs_code_description),
      toSafeNumber(r.originalAmount).toLocaleString(),
      toSafeNumber(r.expenditureAmount).toLocaleString(),
      toSafeNumber(r.profitAmountPerCentreReport).toLocaleString(),
      toSafeNumber(r.contributionToCentralIGA).toLocaleString(),
      toSafeNumber(r.facilitationOfIGAForCentralActivities).toLocaleString(),
      toSafeNumber(r.facilitationZonalActivities).toLocaleString(),
      toSafeNumber(r.facilitationOfIGAForCentreActivities).toLocaleString(),
      toSafeNumber(r.supportToProductionUnit).toLocaleString(),
      toSafeNumber(r.contributionToCentreIGAFund).toLocaleString(),
      toSafeNumber(r.depreciationIncentiveToFacilitators).toLocaleString(),
      toSafeNumber(r.remittedToCentre).toLocaleString(),
    ]);

    // totals row
    body.push([
      "",
      "",
      "TOTAL",
      totalOriginalAmount.toLocaleString(),
      totalExpenditureAmount.toLocaleString(),
      totalProfitAmountPerCentreReport.toLocaleString(),
      totalContributionToCentralIGA.toLocaleString(),
      totalFacilitationOfIGAForCentralActivities.toLocaleString(),
      totalFacilitationZonalActivities.toLocaleString(),
      totalFacilitationOfIGAForCentreActivities.toLocaleString(),
      totalSupportToProductionUnit.toLocaleString(),
      totalContributionToCentreIGAFund.toLocaleString(),
      totalDepreciationIncentiveToFacilitators.toLocaleString(),
      totalRemittedToCentre.toLocaleString(),
    ]);

    autoTable(doc, {
      startY: 38,
      head,
      body,
      margin: { left: marginX, right: marginX },
      tableWidth: "auto",
      styles: {
        fontSize: 8.0,
        cellPadding: 2.2,
        lineWidth: 0.2,
        lineColor: [203, 213, 225],
        overflow: "linebreak",
      },
      headStyles: {
        fillColor: [30, 41, 59],
        textColor: 255,
        fontStyle: "bold",
        halign: "center",
      },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: {
        0: { halign: "center", cellWidth: 8 },
        1: { cellWidth: 40 },
        2: { cellWidth: 90 },
        3: { halign: "right", cellWidth: 22 },
        4: { halign: "right", cellWidth: 22 },
        5: { halign: "right", cellWidth: 22 },
        6: { halign: "right", cellWidth: 24 },
        7: { halign: "right", cellWidth: 24 },
        8: { halign: "right", cellWidth: 24 },
        9: { halign: "right", cellWidth: 24 },
        10: { halign: "right", cellWidth: 24 },
        11: { halign: "right", cellWidth: 26 },
        12: { halign: "right", cellWidth: 26 },
        13: { halign: "right", cellWidth: 30 },
      },
      didParseCell: (d: any) => {
        if (d.section === "body" && d.row.index === body.length - 1) {
          d.cell.styles.fontStyle = "bold";
          d.cell.styles.fillColor = [220, 252, 231];
        }
      },
    });

    // =========================
    // SUMMARY TABLE
    // =========================
    const lastY = (doc as any).lastAutoTable?.finalY ?? 38;

    const summaryHead = [["Summary Item", "Amount"]];
    const summaryBody: any[] = [
      ["Expenditure as per GIGA", totalExpenditureAmount.toLocaleString()],
      ...summaryPerCourse.map((s) => [
        `Amount to be Remitted to Centre - ${s.course}`,
        toSafeNumber(s.total).toLocaleString(),
      ]),
      [
        "Total Funds to be Remitted to Centre as per Apportionment",
        totalRemittedToCentre.toLocaleString(),
      ],
      ["Amount to be Remitted to Zone Offices", totalFacilitationZonalActivities.toLocaleString()],
      [
        "Amount for Central IGA Committee & Secretariat",
        totalFacilitationOfIGAForCentralActivities.toLocaleString(),
      ],
      ["Amount Remained at Central IGA Fund", totalContributionToCentralIGA.toLocaleString()],
    ];

    const boldSummaryRows = new Set<number>([0, 1 + summaryPerCourse.length]);

    autoTable(doc, {
      startY: lastY + 10,
      head: summaryHead,
      body: summaryBody,
      margin: { left: marginX, right: marginX },
      styles: {
        fontSize: 9,
        cellPadding: 2.4,
        lineWidth: 0.2,
        lineColor: [203, 213, 225],
      },
      headStyles: {
        fillColor: [37, 99, 235],
        textColor: 255,
        fontStyle: "bold",
      },
      columnStyles: {
        0: { cellWidth: pageWidth - marginX * 2 - 60 },
        1: { halign: "right", cellWidth: 60 },
      },
      didParseCell: (d: any) => {
        if (d.section !== "body") return;
        if (boldSummaryRows.has(d.row.index)) {
          d.cell.styles.fontStyle = "bold";
        }
      },
    });

    // =========================
    // FOOTER
    // =========================
    const pages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(100);
      doc.text(`Generated on ${new Date().toLocaleString()}`, marginX, pageHeight - 8);
      doc.text(`Page ${i} of ${pages}`, pageWidth - marginX, pageHeight - 8, { align: "right" });
    }

    const fname = `distribution_report_${(effectiveCentre ?? "ALL")
      .toString()
      .replaceAll(" ", "_")}_${fileStamp()}.pdf`;
    doc.save(fname);
  };

  const exportExcel = () => {
    const wsData: any[] = [
      [
        "#",
        "Centre",
        "Zone",
        "Course",
        "Description",
        "Collections",
        "Expenditure",
        "Profit Markup",
        "Contribution Central IGA",
        "Facilitation Central",
        "Facilitation Zonal",
        "Facilitation Centre",
        "Support Production",
        "Contribution Centre IGA",
        "Depreciation/Incentive",
        "Remitted To Centre",
      ],
      ...filteredData.map((row, index) => [
        index + 1,
        row.centre || "N/A",
        row.zone || "N/A",
        getCourseLabel(row.gfs_code_description),
        getDescriptionLabel(row.gfs_code_description),
        row.originalAmount,
        row.expenditureAmount,
        row.profitAmountPerCentreReport,
        row.contributionToCentralIGA,
        row.facilitationOfIGAForCentralActivities,
        row.facilitationZonalActivities,
        row.facilitationOfIGAForCentreActivities,
        row.supportToProductionUnit,
        row.contributionToCentreIGAFund,
        row.depreciationIncentiveToFacilitators,
        row.remittedToCentre,
      ]),
      [
        "TOTAL",
        "",
        "",
        "",
        "",
        totalOriginalAmount,
        totalExpenditureAmount,
        totalProfitAmountPerCentreReport,
        totalContributionToCentralIGA,
        totalFacilitationOfIGAForCentralActivities,
        totalFacilitationZonalActivities,
        totalFacilitationOfIGAForCentreActivities,
        totalSupportToProductionUnit,
        totalContributionToCentreIGAFund,
        totalDepreciationIncentiveToFacilitators,
        totalRemittedToCentre,
      ],
      [],
      ["Summary"],
      ["Description", "Amount"],
      ["Expenditure as per GIGA", totalExpenditureAmount],
      ...summaryPerCourse.map((s) => [`Amount to be Remitted to Centre - ${s.course}`, s.total]),
      ["Total Funds to be Remitted to Centre as per Apportionment", totalRemittedToCentre],
      ["Amount to be Remitted to Zone Offices", totalFacilitationZonalActivities],
      ["Amount for Central IGA Committee & Secretariat", totalFacilitationOfIGAForCentralActivities],
      ["Amount Remained at Central IGA Fund", totalContributionToCentralIGA],
    ];

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Distribution Report");
    XLSX.writeFile(wb, "distribution_report.xlsx");
  };

  const saveApportionment = async () => {
    try {
      if (!centre && !isCentreUser) {
        Swal.fire("Warning", "Please select a centre to save apportionment.", "warning");
        return;
      }

      let centreRow;
      if (isCentreUser) {
        centreRow = data.find((d) => d.centre?.toLowerCase() === userCentre.toLowerCase());
      } else {
        centreRow = data.find((d) => d.centre?.toLowerCase() === centre.toLowerCase());
      }

      if (!centreRow || !centreRow.centre_id) {
        Swal.fire("Warning", "Selected centre not found or missing ID.", "warning");
        return;
      }

      const centreId = centreRow.centre_id;
      const rowsForCentre = filteredData.filter(
        (row) =>
          row.centre?.toLowerCase() === (isCentreUser ? userCentre : centre).toLowerCase()
      );

      if (!rowsForCentre.length) {
        Swal.fire("Warning", "No data for the selected centre.", "warning");
        return;
      }

      const services = rowsForCentre.map((row) => ({
        service_name: getCourseLabel(row.gfs_code_description),
        service_return_profit: parseFloat(row.remittedToCentre || 0).toFixed(2),
      }));

      const payload = {
        centre_id: String(centreId),
        start_date: startDate,
        end_date: endDate,
        services,
      };

      const token = localStorage.getItem("authToken");
      const apiKey = process.env.NEXT_PUBLIC_API_KEY;
      if (!token || !apiKey) {
        toast("Missing authentication credentials");
        return;
      }

      const res = await fetch(`${apiUrl}/apposhments/save`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "X-API-KEY": apiKey,
        },
        body: JSON.stringify(payload),
      });

      const text = await res.text().catch(() => "");

      if (res.status === 200 && text === "Apposhment with services saved successfully!") {
        Swal.fire("Success!", "Apportionment saved successfully!", "success");
        setApportionmentSaved(true);
      } else if (res.status === 200 && text === "Apposhment already exists!") {
        Swal.fire("Info", "Apportionment already exists!", "info");
      } else {
        Swal.fire("Failed!", "Failed to save apportionment.", "error");
      }
    } catch (err) {
      console.error("Error saving apportionment:", err);
      Swal.fire("Error!", "Error saving apportionment.", "error");
    }
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
        {/* Breadcrumb */}
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
              <BreadcrumbItem className="text-slate-600">Distribution</BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          {isCentreUser && (
            <div className="hidden sm:inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-700 shadow-sm">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              {userCentre}
            </div>
          )}
        </div>

        {/* Main Card */}
        <Card className="relative overflow-hidden rounded-2xl border-slate-200/60 bg-white shadow-sm">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/8 via-transparent to-sky-500/8" />

          <CardHeader className="relative flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <CardDescription className="text-slate-600">
                Filter by dates, course, description, centre and zone.
              </CardDescription>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                className="h-10 rounded-xl bg-slate-900 text-white hover:bg-slate-800 shadow-sm"
                onClick={handleApply}
              >
                Apply
              </Button>

              <Button
                variant="outline"
                className="h-10 rounded-xl border-slate-200 bg-white"
                onClick={printReport}
                disabled={!hasApplied || filteredData.length === 0}
              >
                Print
              </Button>

              <Button
                variant="outline"
                className="h-10 rounded-xl border-slate-200 bg-white"
                onClick={exportPdf}
                disabled={!hasApplied || filteredData.length === 0}
              >
                Export PDF
              </Button>

              <Button
                variant="outline"
                className="h-10 rounded-xl border-slate-200 bg-white"
                onClick={exportExcel}
                disabled={!hasApplied || filteredData.length === 0}
              >
                Export Excel
              </Button>
            </div>
          </CardHeader>

          <CardContent className="relative">
            {/* Filters */}
            <div className="rounded-2xl border border-slate-200/70 bg-gradient-to-b from-slate-50 to-white p-4 sm:p-5">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                <div className="md:col-span-2 space-y-1.5">
                  <label className="block text-xs font-medium text-slate-700">From</label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="h-10 rounded-xl border-slate-200 bg-white"
                  />
                </div>

                <div className="md:col-span-2 space-y-1.5">
                  <label className="block text-xs font-medium text-slate-700">To</label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="h-10 rounded-xl border-slate-200 bg-white"
                  />
                </div>

                <div className="md:col-span-2 space-y-1.5">
                  <label className="block text-xs font-medium text-slate-700">Course</label>
                  <select
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-slate-900/10"
                    value={course}
                    onChange={(e) => setCourse(e.target.value)}
                  >
                    <option value="">All</option>
                    {uniqueCourses.map((c, i) => (
                      <option key={`course-${i}`} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-3 space-y-1.5">
                  <label className="block text-xs font-medium text-slate-700">Description</label>
                  <select
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-slate-900/10"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  >
                    <option value="">All</option>
                    {uniqueDescriptions.map((d, i) => (
                      <option key={`desc-${i}`} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                {(isZoneUser || isHQUser) && (
                  <div className="md:col-span-1 space-y-1.5">
                    <label className="block text-xs font-medium text-slate-700">Centre</label>
                    <select
                      className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-slate-900/10"
                      value={centre}
                      onChange={(e) => setCentre(e.target.value)}
                    >
                      <option value="">All</option>
                      {uniqueCentres.map((c, i) => (
                        <option key={`centre-${i}`} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {isHQUser && (
                  <div className="md:col-span-1 space-y-1.5">
                    <label className="block text-xs font-medium text-slate-700">Zone</label>
                    <select
                      className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-slate-900/10"
                      value={zone}
                      onChange={(e) => setZone(e.target.value)}
                    >
                      <option value="">All</option>
                      {uniqueZones.map((z, i) => (
                        <option key={`zone-${i}`} value={z}>
                          {z}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="md:col-span-1">
                  <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
                    Tip: keep “All” for full report.
                  </div>
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="mt-6 overflow-auto rounded-2xl border border-slate-200/70 bg-white">
              <table className="min-w-full text-sm text-left border-collapse table-fixed">
                <thead className="sticky top-0 z-10 bg-slate-900 text-white">
                  <tr>
                    <th className="px-2 py-2 font-medium">#</th>
                    <th className="px-2 py-2 font-medium">Course</th>
                    <th className="px-2 py-2 font-medium">Description</th>
                    <th className="px-2 py-2 font-medium text-right">Collections</th>
                    <th className="px-2 py-2 font-medium text-right">Expenditure</th>
                    <th className="px-2 py-2 font-medium text-right text-xs">
                      Profit Markup As Per GIGA
                    </th>
                    <th className="px-2 py-2 font-medium text-right">Contribution Central IGA</th>
                    <th className="px-2 py-2 font-medium text-right">Facilitation Central</th>
                    <th className="px-2 py-2 font-medium text-right">Facilitation Zonal</th>
                    <th className="px-2 py-2 font-medium text-right">Facilitation Centre</th>
                    <th className="px-2 py-2 font-medium text-right">Support Production</th>
                    <th className="px-2 py-2 font-medium text-right">Contribution Centre IGA</th>
                    <th className="px-2 py-2 font-medium text-left text-xs">Depreciation/Incentive</th>
                    <th className="px-2 py-2 font-medium text-right">Remitted To Centre</th>
                  </tr>
                </thead>

                <tbody>
                  {currentRows.length > 0 ? (
                    currentRows.map((row, index) => (
                      <tr
                        key={row.id ?? `row-${index}`}
                        className="border-t border-slate-200/70 hover:bg-slate-50"
                      >
                        <td className="px-2 py-2 text-slate-700">{indexOfFirstRow + index + 1}</td>
                        <td className="px-2 py-2 text-slate-900">
                          {getCourseLabel(row.gfs_code_description)}
                        </td>
                        <td className="px-2 py-2 text-slate-700">
                          {getDescriptionLabel(row.gfs_code_description)}
                        </td>
                        <td className="px-2 py-2 text-right font-semibold text-slate-900">
                          {formatNumber(row.originalAmount)}
                        </td>
                        <td className="px-2 py-2 text-right text-slate-800">
                          {formatNumber(row.expenditureAmount)}
                        </td>
                        <td className="px-2 py-2 text-right text-slate-800">
                          {formatNumber(row.profitAmountPerCentreReport)}
                        </td>
                        <td className="px-2 py-2 text-right text-slate-800">
                          {formatNumber(row.contributionToCentralIGA)}
                        </td>
                        <td className="px-2 py-2 text-right text-slate-800">
                          {formatNumber(row.facilitationOfIGAForCentralActivities)}
                        </td>
                        <td className="px-2 py-2 text-right text-slate-800">
                          {formatNumber(row.facilitationZonalActivities)}
                        </td>
                        <td className="px-2 py-2 text-right text-slate-800">
                          {formatNumber(row.facilitationOfIGAForCentreActivities)}
                        </td>
                        <td className="px-2 py-2 text-right text-slate-800">
                          {formatNumber(row.supportToProductionUnit)}
                        </td>
                        <td className="px-2 py-2 text-right text-slate-800">
                          {formatNumber(row.contributionToCentreIGAFund)}
                        </td>
                        <td className="px-2 py-2 text-right text-slate-800">
                          {formatNumber(row.depreciationIncentiveToFacilitators)}
                        </td>
                        <td className="px-2 py-2 text-right font-semibold text-slate-900">
                          {formatNumber(row.remittedToCentre)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={14} className="text-center py-10 text-slate-500">
                        {!hasApplied
                          ? "Select filters then click Apply to load the report"
                          : "No data available for the selected filters"}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between text-sm">
              <div className="text-slate-600">
                Page <span className="font-semibold text-slate-900">{currentPage}</span> of{" "}
                <span className="font-semibold text-slate-900">{totalPages || 1}</span>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="h-10 rounded-xl border-slate-200 bg-white"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                >
                  Prev
                </Button>
                <Button
                  variant="outline"
                  className="h-10 rounded-xl border-slate-200 bg-white"
                  disabled={currentPage === totalPages || totalPages === 0}
                  onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                >
                  Next
                </Button>
              </div>
            </div>

            {/* Summary */}
            <div className="mt-10 flex items-end justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Summary</h3>
                <p className="text-sm text-slate-600">Totals based on your current filters.</p>
              </div>
            </div>

            <div className="mt-4 overflow-auto rounded-2xl border border-slate-200/70 bg-white">
              <table className="min-w-full text-sm text-left border-collapse">
                <tbody>
                  <tr className="border-b border-slate-200/70 font-semibold">
                    <td className="px-3 py-3 text-slate-700">Expenditure as per GIGA</td>
                    <td className="px-3 py-3 text-right text-slate-900">
                      {formatNumber(totalExpenditureAmount)}
                    </td>
                  </tr>

                  {summaryPerCourse.map((s, i) => (
                    <tr key={i} className="border-b border-slate-200/70">
                      <td className="px-3 py-3 text-slate-700">
                        Amount to be Remitted to Centre —{" "}
                        <span className="font-medium text-slate-900">{s.course}</span>
                      </td>
                      <td className="px-3 py-3 text-right text-slate-900">
                        {formatNumber(s.total)}
                      </td>
                    </tr>
                  ))}

                  <tr className="border-b border-slate-200/70 font-semibold">
                    <td className="px-3 py-3 text-slate-700">
                      Total Funds to be Remitted to Centre as per Apportionment
                    </td>
                    <td className="px-3 py-3 text-right text-slate-900">
                      {formatNumber(totalRemittedToCentre)}
                    </td>
                  </tr>

                  <tr className="border-b border-slate-200/70">
                    <td className="px-3 py-3 text-slate-700">Amount to be Remitted to Zone Offices</td>
                    <td className="px-3 py-3 text-right text-slate-900">
                      {formatNumber(totalFacilitationZonalActivities)}
                    </td>
                  </tr>

                  <tr className="border-b border-slate-200/70">
                    <td className="px-3 py-3 text-slate-700">
                      Amount for Central IGA Committee &amp; Secretariat
                    </td>
                    <td className="px-3 py-3 text-right text-slate-900">
                      {formatNumber(totalFacilitationOfIGAForCentralActivities)}
                    </td>
                  </tr>

                  <tr className="border-b border-slate-200/70">
                    <td className="px-3 py-3 text-slate-700">Amount Remained at Central IGA Fund</td>
                    <td className="px-3 py-3 text-right text-slate-900">
                      {formatNumber(totalContributionToCentralIGA)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Actions */}
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap gap-3">
                {isCentreUser && role !== "PRINCIPAL" && (
                  <Button
                    className="h-10 rounded-xl bg-slate-900 text-white hover:bg-slate-800 shadow-sm disabled:opacity-60"
                    onClick={saveApportionment}
                    disabled={apportionmentSaved || !hasApplied || filteredData.length === 0}
                  >
                    {apportionmentSaved ? "Saved" : "Save Apportionment"}
                  </Button>
                )}
              </div>

              <div className="text-xs text-slate-500">
                Rows: {data.length} | Filtered: {filteredData.length}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}