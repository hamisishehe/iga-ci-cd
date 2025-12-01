"use client";

import { useEffect, useState } from "react";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbSeparator } from "@/components/ui/breadcrumb";

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
  const [mounted, setMounted] = useState(false);
  const [data, setData] = useState<ServiceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [centre, setCentre] = useState("all"); // default value for placeholder
  const [centres, setCentres] = useState<string[]>([]);

  const [userType, setUserType] = useState("");
  const [userCentre, setUserCentre] = useState("");
  const [userZone, setUserZone] = useState("");

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api";

  useEffect(() => {
    setMounted(true);
     const userType = localStorage.getItem("userType");
  const userCentre: string = localStorage.getItem("centre") || "";
  const userZone: string = localStorage.getItem("zone") || "";

    const userPayload = JSON.parse(localStorage.getItem("userInfo") || "{}");
    setUserType(userType || "");
    setUserCentre(userCentre || "");
    setUserZone(userZone || "");

    if (userType === "CENTRE") setCentre(userCentre || "all");

    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth() + 1;
    const pad = (n: number) => n.toString().padStart(2, "0");
    const firstDay = `${year}-${pad(month)}-01`;
    const lastDay = `${year}-${pad(month)}-${pad(new Date(year, month, 0).getDate())}`;
    setStartDate(firstDay);
    setEndDate(lastDay);

    fetchData(firstDay, lastDay, userCentre || "all");
  }, []);

  const fetchData = async (start: string, end: string, centreName: string) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${apiUrl}/apposhments/all`);
      const rows = await res.json();

      let filteredRows = [...rows];

      if (userType === "CENTRE" && userCentre) {
        filteredRows = filteredRows.filter(
          (r: any) => r.centre?.name?.toLowerCase() === userCentre.toLowerCase()
        );
      } else if (userType === "ZONE" && userZone) {
        filteredRows = filteredRows.filter(
          (r: any) => r.centre?.zone?.toLowerCase() === userZone.toLowerCase()
        );
      }

      if (centreName !== "all" && userType !== "CENTRE") {
        filteredRows = filteredRows.filter((r: any) => r.centre?.name === centreName);
      }

      const requestedStart = new Date(start).getTime();
      const requestedEnd = new Date(end).getTime();
      const finalRows = filteredRows.filter((row: any) => {
        if (!row.startDate || !row.endDate) return false;
        const rowStart = new Date(row.startDate).getTime();
        const rowEnd = new Date(row.endDate).getTime();
        return rowEnd >= requestedStart && rowStart <= requestedEnd;
      });

      const uniqueCentres = [...new Set(rows.map((r: any) => r.centre?.name).filter(Boolean))];
      setCentres(uniqueCentres as string[]);

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

  const formatNumber = (val: number | undefined) => (val != null ? Number(val).toLocaleString() : "-");

  const totals = data.reduce(
    (acc, row) => {
      acc.amountRemitted += row.amountRemitted;
      acc.executors += row.executors;
      acc.supporters += row.supporters;
      acc.agencyFee += row.agencyFee;
      acc.amountToBePaid += row.amountToBePaid;
      return acc;
    },
    { amountRemitted: 0, executors: 0, supporters: 0, agencyFee: 0, amountToBePaid: 0 }
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
    <div className="p-4 space-y-4">

        <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/user/chief_accountant/dashboard">Dashboard</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>Apposhment Report</BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    
      <Card>
        <CardHeader>
          
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block mb-1">Start Date</label>
            <input
              type="date"
              className="border rounded px-2 py-1"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div>
            <label className="block mb-1">End Date</label>
            <input
              type="date"
              className="border rounded px-2 py-1"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          {userType !== "CENTRE" && (
            <div>
              <label className="block mb-1">Centre</label>
              <Select value={centre} onValueChange={(val) => setCentre(val)}>
                <SelectTrigger className="w-40">
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
          <Button className="bg-blue-950 text-white" onClick={() => fetchData(startDate, endDate, centre)}>
            Filter
          </Button>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Apportionment Data</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="min-w-full border border-gray-300 table-auto">
            <thead className="text-blue-950">
              <tr>
                <th className="border px-2 py-1">#</th>
                <th className="border px-2 py-1">Date</th>
                <th className="border px-2 py-1">Course Name</th>
                <th className="border px-2 py-1">Centre</th>
                <th className="border px-2 py-1">Amount Remitted</th>
                <th className="border px-2 py-1">Executors</th>
                <th className="border px-2 py-1">Supporters</th>
                <th className="border px-2 py-1">Agency Fee</th>
                <th className="border px-2 py-1">Amount to be Paid</th>
              </tr>
            </thead>
            <tbody>
              {data.length > 0 ? (
                data.map((row, i) => (
                  <tr key={i}>
                    <td className="border px-2 py-1">{i + 1}</td>
                    <td className="border px-2 py-1">{row.date}</td>
                    <td className="border px-2 py-1">{row.courseName}</td>
                    <td className="border px-2 py-1">{row.centre}</td>
                    <td className="border px-2 py-1">{formatNumber(row.amountRemitted)}</td>
                    <td className="border px-2 py-1">{formatNumber(row.executors)}</td>
                    <td className="border px-2 py-1">{formatNumber(row.supporters)}</td>
                    <td className="border px-2 py-1">{formatNumber(row.agencyFee)}</td>
                    <td className="border px-2 py-1">{formatNumber(row.amountToBePaid)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="border px-2 py-1 text-center" colSpan={9}>
                    No apportionment data available
                  </td>
                </tr>
              )}
              {data.length > 0 && (
                <>
                  <tr className="bg-gray-200 font-bold">
                    <td colSpan={4} className="text-center border px-2 py-1">
                      TOTAL
                    </td>
                    <td className="border px-2 py-1">{formatNumber(totals.amountRemitted)}</td>
                    <td className="border px-2 py-1">{formatNumber(totals.executors)}</td>
                    <td className="border px-2 py-1">{formatNumber(totals.supporters)}</td>
                    <td className="border px-2 py-1">{formatNumber(totals.agencyFee)}</td>
                    <td className="border px-2 py-1">{formatNumber(totals.amountToBePaid)}</td>
                  </tr>
                  <tr className="bg-gray-200 font-bold">
                    <td colSpan={4} className="text-center border px-2 py-1">
                      REMAINING BALANCE
                    </td>
                    <td className="border px-2 py-1">{formatNumber(remaining)}</td>
                    <td colSpan={4}></td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </CardContent>

           <div>
             <Button className="bg-green-600 text-white w-32" onClick={exportExcel}>
            Export Excel
          </Button>
           </div>
      </Card>

      {error && <div className="text-red-600">{error}</div>}
      {loading && <div className="text-center py-4">Loading...</div>}
    </div>
  );
}
