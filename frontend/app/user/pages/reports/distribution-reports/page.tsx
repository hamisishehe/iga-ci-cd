"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function DistributionReportPage() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api";
  const searchParams = useSearchParams();

  // query params
  const qpStart = searchParams.get("startDate") || "";
  const qpEnd = searchParams.get("endDate") || "";
  const qpCentre = searchParams.get("centre") || "";
  const qpZone = searchParams.get("zone") || "";
  const qpCourse = searchParams.get("course") || "";
  const qpDescription = searchParams.get("description") || "";

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [course, setCourse] = useState("");
  const [description, setDescription] = useState("");
  const [centre, setCentre] = useState("");
  const [zone, setZone] = useState("");

  const [data, setData] = useState<any[]>([]);
  const [filteredData, setFilteredData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [apportionmentSaved, setApportionmentSaved] = useState(false);

  const rowsPerPage = 20;

  // ✅ safe localStorage
  const [userType, setUserType] = useState("");
  const [userCentre, setUserCentre] = useState("");
  const [userZone, setUserZone] = useState("");

  useEffect(() => {
    setUserType((localStorage.getItem("userType") || "").toUpperCase());
    setUserCentre(localStorage.getItem("centre") || "");
    setUserZone(localStorage.getItem("zone") || "");
  }, []);

  const isCentreUser = userType === "CENTRE";
  const isZoneUser = userType === "ZONE";
  const isHQUser = userType === "HQ";

  const formatNumber = (val: any) =>
    val !== null && val !== undefined ? Number(val).toLocaleString() : "-";

  const getCourseLabel = (desc: string) => {
    if (desc === "Receipts from Application Fee") return "APPLICATION FEE";
    if (desc === "OTH") return "SHORT COURSES, TAILOR MADE, CONTINUOUS LEARNING WORKSHOPS";
    if (desc === "Miscellaneous receipts") return "SEPARATE PRODUCTION UNIT";
    return desc || "N/A";
  };

  const getDescriptionLabel = (desc: string) => {
    if (desc === "Receipts from Application Fee") return "LONG AND SHORT COURSE APPLICATION FEE";
    if (desc === "OTH") return "SHORT COURSES";
    if (desc === "Miscellaneous receipts")
      return "HOTEL, CCC, BUILDING BRIGADES, FURNITURE PRODUCTION UNIT, MEAT INDUSTRY TRAINING COURSE, PRINTING UNIT AND HEAVY-DUTY PLANT OPERATIONS";
    return desc || "N/A";
  };

  // default current month
  useEffect(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth() + 1;
    const pad = (n: number) => n.toString().padStart(2, "0");
    const firstDay = `${year}-${pad(month)}-01`;
    const lastDay = `${year}-${pad(month)}-${pad(new Date(year, month, 0).getDate())}`;

    setStartDate(firstDay);
    setEndDate(lastDay);
  }, []);

  // apply query params
  useEffect(() => {
    if (qpStart) setStartDate(qpStart);
    if (qpEnd) setEndDate(qpEnd);
    if (qpCentre) setCentre(qpCentre);
    if (qpZone) setZone(qpZone);
    if (qpCourse) setCourse(qpCourse);
    if (qpDescription) setDescription(qpDescription);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qpStart, qpEnd, qpCentre, qpZone, qpCourse, qpDescription]);

  const fetchData = async (start: string, end: string) => {
    setLoading(true);
    try {
      const token = localStorage.getItem("authToken");
      const apiKey = process.env.NEXT_PUBLIC_API_KEY;
      if (!token || !apiKey) {
        toast("Missing authentication credentials");
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

      const json = await res.json();

      const mappedData = (json || []).map((item: any, index: number) => ({
        id: item.id || `row-${index}`,
        centre: item.centres?.name || "",
        zone: item.centres?.zones?.name || "",
        date: item.date ? item.date.split("T")[0] : "",
        gfs_code_description: item.gfs_code_description || "",
        originalAmount: item.originalAmount || 0,
        expenditureAmount: item.expenditureAmount || 0,
        profitAmountPerCentreReport: item.profitAmountPerCentreReport || 0,
        contributionToCentralIGA: item.contributionToCentralIGA || 0,
        facilitationOfIGAForCentralActivities: item.facilitationOfIGAForCentralActivities || 0,
        facilitationZonalActivities: item.facilitationZonalActivities || 0,
        facilitationOfIGAForCentreActivities: item.facilitationOfIGAForCentreActivities || 0,
        supportToProductionUnit: item.supportToProductionUnit || 0,
        contributionToCentreIGAFund: item.contributionToCentreIGAFund || 0,
        depreciationIncentiveToFacilitators: item.depreciationIncentiveToFacilitators || 0,
        remittedToCentre: item.remittedToCentre || 0,
        centre_id: item.centres?.id || item.id || `centre-${index}`,
      }));

      let userFilteredData = mappedData;

      if (isCentreUser) {
        userFilteredData = mappedData.filter(
          (d: any) => d.centre.toLowerCase() === userCentre.toLowerCase()
        );
        setCentre(userCentre); // lock feeling
      } else if (isZoneUser) {
        userFilteredData = mappedData.filter(
          (d: any) => d.zone.toLowerCase() === userZone.toLowerCase()
        );
        setZone(userZone); // lock feeling
      }

      setData(userFilteredData);
      setFilteredData(userFilteredData);
    } catch (err) {
      console.error("Error fetching distribution data:", err);
      toast("Failed to fetch data");
      setData([]);
      setFilteredData([]);
    } finally {
      setLoading(false);
    }
  };

  // fetch when ready
  useEffect(() => {
    if (!userType || !startDate || !endDate) return;
    fetchData(startDate, endDate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userType]);

  const uniqueCentres = useMemo(
    () =>
      isCentreUser
        ? [userCentre]
        : Array.from(new Set(data.map((item) => item.centre))).filter(Boolean),
    [data, isCentreUser, userCentre]
  );

  const uniqueZones = useMemo(
    () =>
      isZoneUser
        ? [userZone]
        : Array.from(new Set(data.map((item) => item.zone))).filter(Boolean),
    [data, isZoneUser, userZone]
  );

  const uniqueCourses = useMemo(
    () => Array.from(new Set(data.map((item) => getCourseLabel(item.gfs_code_description)))),
    [data]
  );

  const uniqueDescriptions = useMemo(
    () => Array.from(new Set(data.map((item) => getDescriptionLabel(item.gfs_code_description)))),
    [data]
  );

  // reactive filtering
  useEffect(() => {
    if (data.length === 0) {
      setFilteredData([]);
      return;
    }

    const filtered = data.filter((item) => {
      const itemDate = new Date(item.date);
      const isAfterFrom = startDate ? itemDate >= new Date(startDate) : true;
      const isBeforeTo = endDate ? itemDate <= new Date(endDate) : true;

      const matchCourse = course ? getCourseLabel(item.gfs_code_description) === course : true;
      const matchDesc = description ? getDescriptionLabel(item.gfs_code_description) === description : true;

      const matchCentre = isCentreUser || !centre || item.centre === centre;
      const matchZone = !isHQUser || !zone || item.zone === zone;

      return isAfterFrom && isBeforeTo && matchCourse && matchDesc && matchCentre && matchZone;
    });

    setFilteredData(filtered);
    setCurrentPage(1);
  }, [data, startDate, endDate, course, description, centre, zone, isCentreUser, isHQUser]);

  // pagination
  const indexOfLastRow = currentPage * rowsPerPage;
  const indexOfFirstRow = indexOfLastRow - rowsPerPage;
  const currentRows = filteredData.slice(indexOfFirstRow, indexOfLastRow);
  const totalPages = Math.max(1, Math.ceil(filteredData.length / rowsPerPage));

  // totals
  const totalOriginalAmount = filteredData.reduce((sum, item) => sum + (item.originalAmount || 0), 0);
  const totalExpenditureAmount = filteredData.reduce((sum, item) => sum + (item.expenditureAmount || 0), 0);
  const totalProfitAmountPerCentreReport = filteredData.reduce((sum, item) => sum + (item.profitAmountPerCentreReport || 0), 0);
  const totalContributionToCentralIGA = filteredData.reduce((sum, item) => sum + (item.contributionToCentralIGA || 0), 0);
  const totalFacilitationOfIGAForCentralActivities = filteredData.reduce((sum, item) => sum + (item.facilitationOfIGAForCentralActivities || 0), 0);
  const totalFacilitationZonalActivities = filteredData.reduce((sum, item) => sum + (item.facilitationZonalActivities || 0), 0);
  const totalFacilitationOfIGAForCentreActivities = filteredData.reduce((sum, item) => sum + (item.facilitationOfIGAForCentreActivities || 0), 0);
  const totalSupportToProductionUnit = filteredData.reduce((sum, item) => sum + (item.supportToProductionUnit || 0), 0);
  const totalContributionToCentreIGAFund = filteredData.reduce((sum, item) => sum + (item.contributionToCentreIGAFund || 0), 0);
  const totalDepreciationIncentiveToFacilitators = filteredData.reduce((sum, item) => sum + (item.depreciationIncentiveToFacilitators || 0), 0);
  const totalRemittedToCentre = filteredData.reduce((sum, item) => sum + (item.remittedToCentre || 0), 0);

  const summaryPerCourse = uniqueCourses.map((c) => {
    const total = filteredData
      .filter((row) => getCourseLabel(row.gfs_code_description) === c)
      .reduce((sum, row) => sum + (row.remittedToCentre || 0), 0);
    return { course: c, total };
  });

  const grandTotal =
    totalExpenditureAmount +
    summaryPerCourse.reduce((sum, s) => sum + s.total, 0) +
    totalRemittedToCentre +
    totalFacilitationZonalActivities +
    totalFacilitationOfIGAForCentralActivities +
    totalContributionToCentralIGA;

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
      ["Grand Total", grandTotal],
    ];

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Distribution Report");
    XLSX.writeFile(wb, "distribution_report.xlsx");
  };



const exportPDF = () => {
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const marginX = 10;

  // ===== Header Helper =====
  const drawHeader = () => {
    // Header background
    doc.setFillColor(245, 247, 250);
    doc.roundedRect(marginX, 8, pageWidth - marginX * 2, 22, 3, 3, "F");

    // Border
    doc.setDrawColor(220);
    doc.roundedRect(marginX, 8, pageWidth - marginX * 2, 22, 3, 3, "S");

   const img = new Image();
  img.src = "/veta.png";



  // ===== Logos =====
  doc.addImage(img, "PNG", 14, 13, 18, 18);     // left
//   doc.addImage(img, "PNG", 178, 13, 18, 18);  // right

    // Title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("VETA", pageWidth / 2, 15, { align: "center" });

    doc.setFontSize(12);
    doc.text("DISTRIBUTION REPORT", pageWidth / 2, 21, { align: "center" });

    // Date range
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    const rangeText = `From: ${startDate || "-"}   To: ${endDate || "-"}`;
    doc.text(rangeText, pageWidth / 2, 27, { align: "center" });
  };

  drawHeader();

  // ===== Main Table =====
  const tableHead = [[
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
  ]];

  const tableBody = filteredData.map((row, index) => [
    index + 1,
    row.centre || "N/A",
    row.zone || "N/A",
    getCourseLabel(row.gfs_code_description),
    getDescriptionLabel(row.gfs_code_description),
    Number(row.originalAmount || 0).toLocaleString(),
    Number(row.expenditureAmount || 0).toLocaleString(),
    Number(row.profitAmountPerCentreReport || 0).toLocaleString(),
    Number(row.contributionToCentralIGA || 0).toLocaleString(),
    Number(row.facilitationOfIGAForCentralActivities || 0).toLocaleString(),
    Number(row.facilitationZonalActivities || 0).toLocaleString(),
    Number(row.facilitationOfIGAForCentreActivities || 0).toLocaleString(),
    Number(row.supportToProductionUnit || 0).toLocaleString(),
    Number(row.contributionToCentreIGAFund || 0).toLocaleString(),
    Number(row.depreciationIncentiveToFacilitators || 0).toLocaleString(),
    Number(row.remittedToCentre || 0).toLocaleString(),
  ]);

  // Total row
  tableBody.push([
    "TOTAL",
    "",
    "",
    "",
    "",
    Number(totalOriginalAmount || 0).toLocaleString(),
    Number(totalExpenditureAmount || 0).toLocaleString(),
    Number(totalProfitAmountPerCentreReport || 0).toLocaleString(),
    Number(totalContributionToCentralIGA || 0).toLocaleString(),
    Number(totalFacilitationOfIGAForCentralActivities || 0).toLocaleString(),
    Number(totalFacilitationZonalActivities || 0).toLocaleString(),
    Number(totalFacilitationOfIGAForCentreActivities || 0).toLocaleString(),
    Number(totalSupportToProductionUnit || 0).toLocaleString(),
    Number(totalContributionToCentreIGAFund || 0).toLocaleString(),
    Number(totalDepreciationIncentiveToFacilitators || 0).toLocaleString(),
    Number(totalRemittedToCentre || 0).toLocaleString(),
  ]);

  autoTable(doc, {
    head: tableHead,
    body: tableBody,
    startY: 34,
    theme: "grid",
    styles: {
      fontSize: 7,
      cellPadding: 1.8,
      overflow: "linebreak",
      valign: "middle",
    },
    headStyles: {
      fillColor: [15, 23, 42], // slate-900
      textColor: 255,
      halign: "center",
      fontStyle: "bold",
    },
    columnStyles: {
      0: { cellWidth: 8 },
      1: { cellWidth: 24 },
      2: { cellWidth: 20 },
      3: { cellWidth: 26 },
      4: { cellWidth: 42 },
      5: { halign: "right" },
      6: { halign: "right" },
      7: { halign: "right" },
      8: { halign: "right" },
      9: { halign: "right" },
      10: { halign: "right" },
      11: { halign: "right" },
      12: { halign: "right" },
      13: { halign: "right" },
      14: { halign: "right" },
      15: { halign: "right" },
    },
    didParseCell: (data) => {
      // Style TOTAL row
      const isTotalRow = data.row.index === tableBody.length - 1;
      if (isTotalRow) {
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.fillColor = [219, 234, 254]; // light blue
      }
    },
    margin: { left: marginX, right: marginX },
  });

  // ===== Summary Section =====
  const lastY = (doc as any).lastAutoTable.finalY || 34;
  let y = lastY + 8;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("SUMMARY", marginX, y);
  y += 3;

  const summaryRows: any[] = [
    ["Expenditure as per GIGA", Number(totalExpenditureAmount || 0).toLocaleString()],
    ...summaryPerCourse.map((s) => [
      `Amount to be Remitted to Centre - ${s.course}`,
      Number(s.total || 0).toLocaleString(),
    ]),
    ["Total Funds to be Remitted to Centre as per Apportionment", Number(totalRemittedToCentre || 0).toLocaleString()],
    ["Amount to be Remitted to Zone Offices", Number(totalFacilitationZonalActivities || 0).toLocaleString()],
    ["Amount for Central IGA Committee & Secretariat", Number(totalFacilitationOfIGAForCentralActivities || 0).toLocaleString()],
    ["Amount Remained at Central IGA Fund", Number(totalContributionToCentralIGA || 0).toLocaleString()],
    ["Grand Total", Number(grandTotal || 0).toLocaleString()],
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
      0: { cellWidth: 140 },
      1: { halign: "right", cellWidth: 40 },
    },
    margin: { left: marginX, right: marginX },
  });

  // ===== Page numbers (fix for getNumberOfPages error) =====
  const pageCount = doc.internal.getNumberOfPages(); // ✅ correct method
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

  doc.save("distribution_report.pdf");
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

      <Card className="relative overflow-hidden rounded-2xl border-slate-200/60 bg-white shadow-sm">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/8 via-transparent to-sky-500/8" />

        <CardHeader className="relative flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <CardTitle className="text-lg sm:text-xl text-slate-900">
              {isCentreUser && <span className="text-slate-500">{userCentre} — </span>}
              Distribution Report
            </CardTitle>
            <CardDescription className="text-slate-600">
              Choose filters, then print or export. (Table preview is hidden.)
            </CardDescription>
          </div>

          <div className="flex gap-2">

            <Button
              className="h-10 rounded-xl bg-slate-900 text-white hover:bg-slate-800 shadow-sm"
              onClick={() => fetchData(startDate, endDate)}
            >
              Apply
            </Button>

            <Button
              className="h-10 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm disabled:opacity-60"
              onClick={() => {
                if (!filteredData?.length) return;
                window.print();
              }}
              disabled={!filteredData?.length}
            >
              Print
            </Button>

                     <Button
  onClick={exportPDF}
  className="h-10 rounded-xl bg-slate-900 text-white hover:bg-slate-800 shadow-sm"
>
  Print PDF
</Button>

            <Button
              className="h-10 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm disabled:opacity-60"
              onClick={exportExcel}
              disabled={!filteredData?.length}
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
                    disabled={isCentreUser}
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
                    "No data available for selected filters."
                  )}
                </div>

                <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-700 shadow-sm">
                  Grand Total:{" "}
                  <span className="font-semibold text-slate-900">
                    {formatNumber(grandTotal)}
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
