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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import { toast } from "sonner";

export default function DistributionReportPage() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "/api";


  // Filters
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [course, setCourse] = useState("");
  const [description, setDescription] = useState("");
  const [centre, setCentre] = useState("");
  const [zone, setZone] = useState("");

  // Data
  const [data, setData] = useState<any[]>([]);
  const [filteredData, setFilteredData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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
  }, []);

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

      console.log("Distribution raw response:", json);
      console.log("Distribution list length:", list.length);

      const mappedData = list.map((item: any, index: number) => ({
        id: item.id ?? `row-${index}`,

        // ✅ support both centres & centre naming
        centre: item.centres?.name || item.centre?.name || "",
        zone: item.centres?.zones?.name || item.centre?.zones?.name || "",

        date: item.date ? String(item.date).split("T")[0] : "",
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
    } catch (err) {
      console.error("Error fetching distribution data:", err);
      toast("Failed to fetch data");
      setData([]);
      setFilteredData([]);
    } finally {
      setLoading(false);
    }
  };

  // Initial load: set current month and fetch
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

    fetchData(firstDay, lastDay);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      new Set(data.map((item) =>
        getDescriptionLabel(item.gfs_code_description)
      ))
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
      ["Amount to be Remitted to Zone Offices", totalFacilitationZonalActivities],
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
    try {
      if (!centre && !isCentreUser) {
        Swal.fire(
          "Warning",
          "Please select a centre to save apportionment.",
          "warning"
        );
        return;
      }

      let centreRow;
      if (isCentreUser) {
        centreRow = data.find(
          (d) => d.centre?.toLowerCase() === userCentre.toLowerCase()
        );
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
          row.centre?.toLowerCase() ===
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
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-sky-800 border-solid"></div>
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
              <BreadcrumbItem className="text-slate-600">
                Distribution
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

        {/* Main Card */}
        <Card className="relative overflow-hidden rounded-2xl border-slate-200/60 bg-white shadow-sm">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/8 via-transparent to-sky-500/8" />

          <CardHeader className="relative flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <CardDescription className="text-slate-600">
                Filter by dates, course, description, centre and zone.
              </CardDescription>
            </div>

            <div className="flex gap-2">
              <Button
                className="h-10 rounded-xl bg-slate-900 text-white hover:bg-slate-800 shadow-sm"
                onClick={() => fetchData(startDate, endDate)}
              >
                Apply
              </Button>
            </div>
          </CardHeader>

          <CardContent className="relative">
            {/* Filters */}
            <div className="rounded-2xl border border-slate-200/70 bg-gradient-to-b from-slate-50 to-white p-4 sm:p-5">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                <div className="md:col-span-2 space-y-1.5">
                  <label className="block text-xs font-medium text-slate-700">
                    From
                  </label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="h-10 rounded-xl border-slate-200 bg-white"
                  />
                </div>

                <div className="md:col-span-2 space-y-1.5">
                  <label className="block text-xs font-medium text-slate-700">
                    To
                  </label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="h-10 rounded-xl border-slate-200 bg-white"
                  />
                </div>

                <div className="md:col-span-2 space-y-1.5">
                  <label className="block text-xs font-medium text-slate-700">
                    Course
                  </label>
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
                  <label className="block text-xs font-medium text-slate-700">
                    Description
                  </label>
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
                    <label className="block text-xs font-medium text-slate-700">
                      Centre
                    </label>
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
                    <label className="block text-xs font-medium text-slate-700">
                      Zone
                    </label>
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
                    <th className="px-2 py-2 font-medium text-right">
                      Collections
                    </th>
                    <th className="px-2 py-2 font-medium text-right">
                      Expenditure
                    </th>
                    <th className="px-2 py-2 font-medium text-right text-xs">
                      Profit Markup As Per GIGA
                    </th>
                    <th className="px-2 py-2 font-medium text-right">
                      Contribution Central IGA
                    </th>
                    <th className="px-2 py-2 font-medium text-right">
                      Facilitation Central
                    </th>
                    <th className="px-2 py-2 font-medium text-right">
                      Facilitation Zonal
                    </th>
                    <th className="px-2 py-2 font-medium text-right">
                      Facilitation Centre
                    </th>
                    <th className="px-2 py-2 font-medium text-right">
                      Support Production
                    </th>
                    <th className="px-2 py-2 font-medium text-right">
                      Contribution Centre IGA
                    </th>
                    <th className="px-2 py-2 font-medium text-left text-xs">
                      Depreciation/Incentive
                    </th>
                    <th className="px-2 py-2 font-medium text-right">
                      Remitted To Centre
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {currentRows.length > 0 ? (
                    currentRows.map((row, index) => (
                      <tr
                        key={row.id ?? `row-${index}`}
                        className="border-t border-slate-200/70 hover:bg-slate-50"
                      >
                        <td className="px-2 py-2 text-slate-700">
                          {indexOfFirstRow + index + 1}
                        </td>
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
                          {formatNumber(
                            row.facilitationOfIGAForCentralActivities
                          )}
                        </td>
                        <td className="px-2 py-2 text-right text-slate-800">
                          {formatNumber(row.facilitationZonalActivities)}
                        </td>
                        <td className="px-2 py-2 text-right text-slate-800">
                          {formatNumber(
                            row.facilitationOfIGAForCentreActivities
                          )}
                        </td>
                        <td className="px-2 py-2 text-right text-slate-800">
                          {formatNumber(row.supportToProductionUnit)}
                        </td>
                        <td className="px-2 py-2 text-right text-slate-800">
                          {formatNumber(row.contributionToCentreIGAFund)}
                        </td>
                        <td className="px-2 py-2 text-right text-slate-800">
                          {formatNumber(
                            row.depreciationIncentiveToFacilitators
                          )}
                        </td>
                        <td className="px-2 py-2 text-right font-semibold text-slate-900">
                          {formatNumber(row.remittedToCentre)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={14}
                        className="text-center py-10 text-slate-500"
                      >
                        No data available
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between text-sm">
              <div className="text-slate-600">
                Page{" "}
                <span className="font-semibold text-slate-900">
                  {currentPage}
                </span>{" "}
                of{" "}
                <span className="font-semibold text-slate-900">
                  {totalPages || 1}
                </span>
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
                  onClick={() =>
                    setCurrentPage((p) => Math.min(p + 1, totalPages))
                  }
                >
                  Next
                </Button>
              </div>
            </div>

            {/* Summary */}
            <div className="mt-10 flex items-end justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Summary</h3>
                <p className="text-sm text-slate-600">
                  Totals based on your current filters.
                </p>
              </div>

              <div className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-700 shadow-sm">
                Grand Total:{" "}
                <span className="font-semibold">
                  {formatNumber(grandTotal)}
                </span>
              </div>
            </div>

            <div className="mt-4 overflow-auto rounded-2xl border border-slate-200/70 bg-white">
              <table className="min-w-full text-sm text-left border-collapse">
                <tbody>
                  <tr className="border-b border-slate-200/70 font-semibold">
                    <td className="px-3 py-3 text-slate-700">
                      Expenditure as per GIGA
                    </td>
                    <td className="px-3 py-3 text-right text-slate-900">
                      {formatNumber(totalExpenditureAmount)}
                    </td>
                  </tr>

                  {summaryPerCourse.map((s, i) => (
                    <tr key={i} className="border-b border-slate-200/70">
                      <td className="px-3 py-3 text-slate-700">
                        Amount to be Remitted to Centre —{" "}
                        <span className="font-medium text-slate-900">
                          {s.course}
                        </span>
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
                    <td className="px-3 py-3 text-slate-700">
                      Amount to be Remitted to Zone Offices
                    </td>
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
                    <td className="px-3 py-3 text-slate-700">
                      Amount Remained at Central IGA Fund
                    </td>
                    <td className="px-3 py-3 text-right text-slate-900">
                      {formatNumber(totalContributionToCentralIGA)}
                    </td>
                  </tr>

                  <tr className="bg-slate-50 font-semibold text-base">
                    <td className="px-3 py-3 text-slate-900">Grand Total</td>
                    <td className="px-3 py-3 text-right text-slate-900">
                      {formatNumber(grandTotal)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Actions */}
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap gap-3">
                <Button
                  className="h-10 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm"
                  onClick={exportExcel}
                >
                  Export Excel
                </Button>

                {isCentreUser ? (
                  <Button
                    className="h-10 rounded-xl bg-slate-900 text-white hover:bg-slate-800 shadow-sm disabled:opacity-60"
                    onClick={saveApportionment}
                    disabled={apportionmentSaved}
                  >
                    {apportionmentSaved ? "Saved" : "Save Apportionment"}
                  </Button>
                ) : null}
              </div>

              {/* optional debug */}
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
