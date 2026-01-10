"use client";
import React, { useEffect, useState } from "react";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export default function DistributionReportPage() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api";

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

  const userType = localStorage.getItem("userType");
  const userCentre: string = localStorage.getItem("centre") || "";
  const userZone: string = localStorage.getItem("zone") || "";

  const isCentreUser = userType === "CENTRE";
  const isZoneUser = userType === "ZONE";
  const isHQUser = userType === "HQ";

  const formatNumber = (val: any) =>
    val !== null && val !== undefined ? Number(val).toLocaleString() : "-";

  const getCourseLabel = (desc: string) => {
    if (desc === "Receipts from Application Fee") return "APPLICATION FEE";
    if (desc === "OTH")
      return "SHORT COURSES, TAILOR MADE, CONTINUOUS LEARNING WORKSHOPS";
    if (desc === "Miscellaneous receipts") return "SEPARATE PRODUCTION UNIT";
    return desc || "N/A";
  };

  const getDescriptionLabel = (desc: string) => {
    if (desc === "Receipts from Application Fee")
      return "LONG AND SHORT COURSE APPLICATION FEE";
    if (desc === "OTH") return "SHORT COURSES";
    if (desc === "Miscellaneous receipts")
      return "HOTEL, CCC, BUILDING BRIGADES, FURNITURE PRODUCTION UNIT, MEAT INDUSTRY TRAINING COURSE, PRINTING UNIT AND HEAVY-DUTY PLANT OPERATIONS";
    return desc || "N/A";
  };

  // Initial load: set current month and fetch data
  useEffect(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth() + 1;
    const pad = (n: number) => n.toString().padStart(2, "0");
    const firstDay = `${year}-${pad(month)}-01`;
    const lastDay = `${year}-${pad(month)}-${pad(new Date(year, month, 0).getDate())}`;

    setStartDate(firstDay);
    setEndDate(lastDay);
    fetchData(firstDay, lastDay);
  }, []);

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
        facilitationOfIGAForCentralActivities:
          item.facilitationOfIGAForCentralActivities || 0,
        facilitationZonalActivities: item.facilitationZonalActivities || 0,
        facilitationOfIGAForCentreActivities:
          item.facilitationOfIGAForCentreActivities || 0,
        supportToProductionUnit: item.supportToProductionUnit || 0,
        contributionToCentreIGAFund: item.contributionToCentreIGAFund || 0,
        depreciationIncentiveToFacilitators:
          item.depreciationIncentiveToFacilitators || 0,
        remittedToCentre: item.remittedToCentre || 0,
        centre_id: item.centres?.id || item.id || `centre-${index}`,
      }));

      let userFilteredData = mappedData;

      if (isCentreUser) {
        userFilteredData = mappedData.filter(
          (d: any) => d.centre.toLowerCase() === userCentre.toLowerCase()
        );
      } else if (isZoneUser) {
        userFilteredData = mappedData.filter(
          (d: any) => d.zone.toLowerCase() === userZone.toLowerCase()
        );
      }

      setData(userFilteredData);
      setFilteredData(userFilteredData); // will be refined in next useEffect
    } catch (err) {
      console.error("Error fetching distribution data:", err);
      toast("Failed to fetch data");
      setData([]);
      setFilteredData([]);
    } finally {
      setLoading(false);
    }
  };

  // Unique options based on data
  const uniqueCentres = isCentreUser
    ? [userCentre]
    : Array.from(new Set(data.map((item) => item.centre))).filter(Boolean);

  const uniqueZones = isZoneUser
    ? [userZone]
    : Array.from(new Set(data.map((item) => item.zone))).filter(Boolean);

  const uniqueCourses = Array.from(
    new Set(data.map((item) => getCourseLabel(item.gfs_code_description)))
  );

  const uniqueDescriptions = Array.from(
    new Set(data.map((item) => getDescriptionLabel(item.gfs_code_description)))
  );

  // Reactive filtering: runs whenever data or any filter changes
  useEffect(() => {
    if (data.length === 0) {
      setFilteredData([]);
      return;
    }

    const filtered = data.filter((item) => {
      const itemDate = new Date(item.date);
      const isAfterFrom = startDate ? itemDate >= new Date(startDate) : true;
      const isBeforeTo = endDate ? itemDate <= new Date(endDate) : true;
      const matchCourse = course
        ? getCourseLabel(item.gfs_code_description) === course
        : true;
      const matchDesc = description
        ? getDescriptionLabel(item.gfs_code_description) === description
        : true;

      // Centre filter: only apply if not centre user and a centre is selected
      const matchCentre = isCentreUser || !centre || item.centre === centre;

      // Zone filter: only HQ users can filter by zone
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
    (sum, item) => sum + (item.originalAmount || 0),
    0
  );
  const totalExpenditureAmount = filteredData.reduce(
    (sum, item) => sum + (item.expenditureAmount || 0),
    0
  );
  const totalProfitAmountPerCentreReport = filteredData.reduce(
    (sum, item) => sum + (item.profitAmountPerCentreReport || 0),
    0
  );
  const totalContributionToCentralIGA = filteredData.reduce(
    (sum, item) => sum + (item.contributionToCentralIGA || 0),
    0
  );
  const totalFacilitationOfIGAForCentralActivities = filteredData.reduce(
    (sum, item) => sum + (item.facilitationOfIGAForCentralActivities || 0),
    0
  );
  const totalFacilitationZonalActivities = filteredData.reduce(
    (sum, item) => sum + (item.facilitationZonalActivities || 0),
    0
  );
  const totalFacilitationOfIGAForCentreActivities = filteredData.reduce(
    (sum, item) => sum + (item.facilitationOfIGAForCentreActivities || 0),
    0
  );
  const totalSupportToProductionUnit = filteredData.reduce(
    (sum, item) => sum + (item.supportToProductionUnit || 0),
    0
  );
  const totalContributionToCentreIGAFund = filteredData.reduce(
    (sum, item) => sum + (item.contributionToCentreIGAFund || 0),
    0
  );
  const totalDepreciationIncentiveToFacilitators = filteredData.reduce(
    (sum, item) => sum + (item.depreciationIncentiveToFacilitators || 0),
    0
  );
  const totalRemittedToCentre = filteredData.reduce(
    (sum, item) => sum + (item.remittedToCentre || 0),
    0
  );

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
      ...summaryPerCourse.map((s) => [
        `Amount to be Remitted to Centre - ${s.course}`,
        s.total,
      ]),
      [
        "Total Funds to be Remitted to Centre as per Apportionment",
        totalRemittedToCentre,
      ],
      [
        "Amount to be Remitted to Zone Offices",
        totalFacilitationZonalActivities,
      ],
      [
        "Amount for Central IGA Committee & Secretariat",
        totalFacilitationOfIGAForCentralActivities,
      ],
      ["Amount Remained at Central IGA Fund", totalContributionToCentralIGA],
      ["Grand Total", grandTotal],
    ];

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Distribution Report");
    XLSX.writeFile(wb, "distribution_report.xlsx");
  };

  const saveApportionment = async () => {
    // ... (your existing saveApportionment logic remains unchanged)
    // I'll keep it as-is to avoid accidental changes
    try {
      if (!centre && !isCentreUser) {
        Swal.fire("Warning", "Please select a centre to save apportionment.", "warning");
        return;
      }

      let centreRow;
      if (isCentreUser) {
        centreRow = data.find(
          (d) => d.centre.toLowerCase() === userCentre.toLowerCase()
        );
      } else {
        centreRow = data.find(
          (d) => d.centre.toLowerCase() === centre.toLowerCase()
        );
      }

      if (!centreRow || !centreRow.centre_id) {
        Swal.fire("Warning", "Selected centre not found or missing ID.", "warning");
        return;
      }

      const centreId = centreRow.centre_id;
      const rowsForCentre = filteredData.filter(
        (row) =>
          row.centre.toLowerCase() ===
          (isCentreUser ? userCentre : centre).toLowerCase()
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

      let json;
      try {
        json = await res.text();
      } catch (e) {
        json = null;
      }

      if (res.status === 200 && json === "Apposhment with services saved successfully!") {
        Swal.fire({
          title: "Success!",
          text: "Apportionment saved successfully!",
          icon: "success",
        });
        setApportionmentSaved(true);
      } else if (res.status === 200 && json === "Apposhment already exists!") {
        Swal.fire({
          title: "Info",
          text: "Apportionment already exists!",
          icon: "info",
        });
      } else {
        Swal.fire({
          title: "Failed!",
          text: "Failed to save apportionment.",
          icon: "error",
        });
      }
    } catch (err) {
      console.error("Error saving apportionment:", err);
      Swal.fire({
        title: "Error!",
        text: "Error saving apportionment.",
        icon: "error",
      });
    }
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
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/user/pages/dashboard">Dashboard</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>Distribution</BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <Card>
        <CardHeader>
          <CardTitle>{isCentreUser && `${userCentre} `}Distribution Report</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 mb-6 items-end">
            <div className="md:col-span-2">
              <label className="block text-sm text-slate-600 mb-1">From</label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm text-slate-600 mb-1">To</label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm text-slate-600 mb-1">Course</label>
              <select
                className="w-full border rounded px-2 py-2"
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
            <div className="md:col-span-3">
              <label className="block text-sm text-slate-600 mb-1">Description</label>
              <select
                className="w-full border rounded px-2 py-2"
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
              <div className="md:col-span-1">
                <label className="block text-sm text-slate-600 mb-1">Centre</label>
                <select
                  className="w-full border rounded px-2 py-2"
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
              <div className="md:col-span-1">
                <label className="block text-sm text-slate-600 mb-1">Zone</label>
                <select
                  className="w-full border rounded px-2 py-2"
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
              <Button
                className="bg-blue-950 text-white w-full"
                onClick={() => fetchData(startDate, endDate)}
              >
                Apply Dates
              </Button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-auto border rounded-md">
            <table className="min-w-full text-sm text-left border-collapse table-fixed">
              <thead className="sticky top-0 bg-blue-950 text-white">
                <tr>
                  <th className="px-1 py-1 border">#</th>
                  <th className="px-1 py-1 border">Course</th>
                  <th className="px-1 py-1 border">Description</th>
                  <th className="px-1 py-1 border text-right">Collections</th>
                  <th className="px-1 py-1 border text-right">Expenditure</th>
                  <th className="px-1 py-1 border text-right text-sm">
                    Profit Markup As Per GIGA
                  </th>
                  <th className="px-1 py-1 border text-right">Contribution Central IGA</th>
                  <th className="px-1 py-1 border text-right">Facilitation Central</th>
                  <th className="px-1 py-1 border text-right">Facilitation Zonal</th>
                  <th className="px-3 py-2 border text-right">Facilitation Centre</th>
                  <th className="px-1 py-1 border text-right">Support Production</th>
                  <th className="px-1 py-1 border text-right">Contribution Centre IGA</th>
                  <th className="px-1 py-1 border text-left text-sm">
                    Depreciation/Incentive
                  </th>
                  <th className="px-1 py-1 border text-right">Remitted To Centre</th>
                </tr>
              </thead>
              <tbody>
                {currentRows.length > 0 ? (
                  currentRows.map((row, index) => (
                    <tr key={row.id ?? `row-${index}`} className="border-t">
                      <td className="px-1 py-1">{indexOfFirstRow + index + 1}</td>
                      <td className="px-1 py-1">{getCourseLabel(row.gfs_code_description)}</td>
                      <td className="px-1 py-1">{getDescriptionLabel(row.gfs_code_description)}</td>
                      <td className="px-3 py-2 text-right">{formatNumber(row.originalAmount)}</td>
                      <td className="px-3 py-2 text-right">{formatNumber(row.expenditureAmount)}</td>
                      <td className="px-3 py-2 text-right">{formatNumber(row.profitAmountPerCentreReport)}</td>
                      <td className="px-3 py-2 text-right">{formatNumber(row.contributionToCentralIGA)}</td>
                      <td className="px-3 py-2 text-right">{formatNumber(row.facilitationOfIGAForCentralActivities)}</td>
                      <td className="px-3 py-2 text-right">{formatNumber(row.facilitationZonalActivities)}</td>
                      <td className="px-3 py-2 text-right">{formatNumber(row.facilitationOfIGAForCentreActivities)}</td>
                      <td className="px-3 py-2 text-right">{formatNumber(row.supportToProductionUnit)}</td>
                      <td className="px-3 py-2 text-right">{formatNumber(row.contributionToCentreIGAFund)}</td>
                      <td className="px-3 py-2 text-right">{formatNumber(row.depreciationIncentiveToFacilitators)}</td>
                      <td className="px-3 py-2 text-right">{formatNumber(row.remittedToCentre)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={14} className="text-center py-6 text-slate-500">
                      No data available
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex gap-5 mt-4 items-center text-sm">
            <div>Page {currentPage} of {totalPages || 1}</div>
            <div className="flex gap-1">
              <Button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              >
                Prev
              </Button>
              <Button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              >
                Next
              </Button>
            </div>
          </div>

          <h3 className="text-lg font-semibold mt-8 mb-3">Summary</h3>
          <div className="overflow-auto border rounded-md">
            <table className="min-w-full text-sm text-left border-collapse">
              <tbody>
                <tr className="font-semibold">
                  <td className="px-3 py-2">Expenditure as per GIGA</td>
                  <td className="px-3 py-2 text-right">{formatNumber(totalExpenditureAmount)}</td>
                </tr>
                {summaryPerCourse.map((s, i) => (
                  <tr key={i}>
                    <td className="px-3 py-2">Amount to be Remitted to Centre - {s.course}</td>
                    <td className="px-3 py-2 text-right">{formatNumber(s.total)}</td>
                  </tr>
                ))}
                <tr className="font-semibold">
                  <td className="px-3 py-2">Total Funds to be Remitted to Centre as per Apportionment</td>
                  <td className="px-3 py-2 text-right">{formatNumber(totalRemittedToCentre)}</td>
                </tr>
                <tr>
                  <td className="px-3 py-2">Amount to be Remitted to Zone Offices</td>
                  <td className="px-3 py-2 text-right">{formatNumber(totalFacilitationZonalActivities)}</td>
                </tr>
                <tr>
                  <td className="px-3 py-2">Amount for Central IGA Committee & Secretariat</td>
                  <td className="px-3 py-2 text-right">{formatNumber(totalFacilitationOfIGAForCentralActivities)}</td>
                </tr>
                <tr>
                  <td className="px-3 py-2">Amount Remained at Central IGA Fund</td>
                  <td className="px-3 py-2 text-right">{formatNumber(totalContributionToCentralIGA)}</td>
                </tr>
                <tr className="font-bold text-lg">
                  <td className="px-3 py-2">Grand Total</td>
                  <td className="px-3 py-2 text-right">{formatNumber(grandTotal)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="flex justify-between items-center mt-6">
            <div className="flex gap-3">
              <Button className="bg-green-600 text-white" onClick={exportExcel}>
                Export Excel
              </Button>
             
             
             
             {isCentreUser ? <Button onClick={saveApportionment} disabled={apportionmentSaved}>
                {apportionmentSaved ? "Saved" : "Save Apportionment"}
              </Button> : null}
              

            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}