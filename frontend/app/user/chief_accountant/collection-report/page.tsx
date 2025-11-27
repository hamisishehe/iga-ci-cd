"use client";

import { useEffect, useState } from "react";
import jsPDF from "jspdf";
import * as XLSX from "xlsx";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Loader2, FileDown, FileSpreadsheet } from "lucide-react";
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbSeparator } from "@/components/ui/breadcrumb";

interface CollectionRecord {
  id: number;
  name: string;
  center: string;
  zone: string;
  serviceCode: string;
  service: string;
  amount: number;
  date: string;
}

interface ServiceSummary {
  serviceCode: string;
  service: string;
  total: number;
}

export default function CollectionReport() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api";

  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [service, setService] = useState("ALL");
  const [data, setData] = useState<CollectionRecord[]>([]);
  const [filteredData, setFilteredData] = useState<CollectionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;

  // Get user info from localStorage
  
  const userType = localStorage.getItem("userType");
  const userCentre: string = localStorage.getItem("centre") || "";
  const userZone: string = localStorage.getItem("zone") || "";

  const isCentreUser = userType === "CENTRE";
  const isZoneUser = userType === "ZONE";
  const isHQUser = userType === "HQ";

  // Set default dates to current month
  useEffect(() => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    setFromDate(firstDay.toISOString().split("T")[0]);
    setToDate(lastDay.toISOString().split("T")[0]);
  }, []);

  // Fetch all data
useEffect(() => {
  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${apiUrl}/collections/get`);
      if (!res.ok) throw new Error("Network response was not ok");

      const text = await res.text();
      const dataJson: any[] = text ? JSON.parse(text) : [];

      const mappedData: CollectionRecord[] = dataJson.map((item: any) => ({
        id: item.id,
        name: item.customer?.name || "",
        center: item.customer?.centre?.name || "",
        zone: item.customer?.centre?.zones?.name || "",
        serviceCode: item.gfs_code?.code || "",
        service:
          item.gfs_code?.description === "Miscellaneous receipts"
            ? "Separate production Unit"
            : item.gfs_code?.description || "",
        amount: item.amount || 0,
        date: item.date ? item.date.split("T")[0] : "",
      }));

      setData(mappedData);
    } catch (err) {
      console.error("Error fetching collection data:", err);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  fetchData();
}, [apiUrl]); // <- stable, fixed-size array


  // Filter logic (always enforce user centre/zone)
  const handleFilter = () => {
    const filtered = data.filter((item) => {
      const itemDate = new Date(item.date);
      const isAfterFrom = fromDate ? itemDate >= new Date(fromDate) : true;
      const isBeforeTo = toDate ? itemDate <= new Date(toDate) : true;
      const matchService = service === "ALL" ? true : item.service === service;

      // Always enforce centre/zone restriction
      const matchCentre = isCentreUser ? item.center === userCentre : true;
      const matchZone = isZoneUser ? item.zone === userZone : true;

      return isAfterFrom && isBeforeTo && matchService && matchCentre && matchZone;
    });

    setFilteredData(filtered);
    setCurrentPage(1);
  };

  // Apply filter automatically when data or default dates change
  useEffect(() => {
    if (data.length && fromDate && toDate) handleFilter();
  }, [data, fromDate, toDate, service]);

  const indexOfLastRow = currentPage * rowsPerPage;
  const indexOfFirstRow = indexOfLastRow - rowsPerPage;
  const currentRows = filteredData.slice(indexOfFirstRow, indexOfLastRow);
  const totalPages = Math.ceil(filteredData.length / rowsPerPage);
  const totalAmount = filteredData.reduce((sum, item) => sum + item.amount, 0);

  const summaryByService: ServiceSummary[] = Object.values(
    filteredData.reduce<Record<string, ServiceSummary>>((acc, curr) => {
      if (!acc[curr.serviceCode])
        acc[curr.serviceCode] = { serviceCode: curr.serviceCode, service: curr.service, total: 0 };
      acc[curr.serviceCode].total += curr.amount;
      return acc;
    }, {})
  ).sort((a, b) => b.total - a.total);

  // Export PDF
  const exportPDF = () => {
    const doc = new jsPDF();
    doc.text("Collection Report", 14, 10);
    const tableData = filteredData.map((item, index) => [
      index + 1,
      item.name,
      item.center,
      item.zone,
      item.serviceCode,
      item.service,
      item.amount.toLocaleString(),
      item.date,
    ]);
   
  };

  // Export Excel
  const exportExcel = () => {
    const wsData = [
      ["#", "Customer", "Center", "Zone", "Service Code", "Service", "Amount", "Date"],
      ...filteredData.map((item, i) => [i + 1, item.name, item.center, item.zone, item.serviceCode, item.service, item.amount, item.date]),
      ["", "", "", "", "", "TOTAL", totalAmount, ""],
    ];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Collection Report");
    XLSX.writeFile(wb, "collection_report.xlsx");
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
            <BreadcrumbLink href="/user/chief_accountant/dashboard">Dashboard</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>Collection Report</BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <Card>
        <CardHeader>
          <CardTitle>Collection Report</CardTitle>
        </CardHeader>
        <CardContent>
       
          {/* Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-6">
            <div>
              <label className="text-sm font-medium">From</label>
              <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium">To</label>
              <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium">Service</label>
              <Select onValueChange={setService} value={service}>
                <SelectTrigger>
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All</SelectItem>
                  {Array.from(new Set(data.map((d) => d.service))).map((srv, i) => (
                    <SelectItem key={i} value={srv}>{srv}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button className="w-full bg-blue-950" onClick={handleFilter}>Filter</Button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-auto border rounded-md">
            <table className="min-w-full text-sm text-left border-collapse">
              <thead className="bg-blue-950 text-white">
                <tr>
                  {["#", "Customer", "Service Code", "Service", "Amount (TZS)", "Date Paid"].map(head => (
                    <th key={head} className="p-3 border">{head}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {currentRows.map((row, i) => (
                  <tr key={row.id} className="hover:bg-sky-50">
                    <td className="p-2 border">{indexOfFirstRow + i + 1}</td>
                    <td className="p-2 border">{row.name}</td>
                    <td className="p-2 border">{row.serviceCode}</td>
                    <td className="p-2 border">{row.service}</td>
                    <td className="p-2 border text-left">{row.amount.toLocaleString()}</td>
                    <td className="p-2 border">{row.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex justify-between items-center mt-4">
            <Button variant="outline" disabled={currentPage === 1} onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}>Previous</Button>
            <div className="text-sm text-gray-600">Page {currentPage} of {totalPages}</div>
            <Button variant="outline" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}>Next</Button>
          </div>

          {/* Summary */}
          <div className="mt-6 text-lg font-semibold">Total Income: {totalAmount.toLocaleString()} TZS</div>

          {/* Summary by Service */}
          <h3 className="mt-6 mb-2 font-bold">Summary per Service</h3>
          <div className="overflow-auto border rounded-md">
            <table className="min-w-full text-sm text-left border-collapse">
              <thead className="bg-blue-950 text-white">
                <tr>
                  <th className="p-3 border">Service Code</th>
                  <th className="p-3 border">Service Name</th>
                  <th className="p-3 border text-right">Total Amount Collected (TZS)</th>
                </tr>
              </thead>
              <tbody>
                {summaryByService.map(srv => (
                  <tr key={srv.serviceCode} className="hover:bg-sky-50">
                    <td className="p-2 border">{srv.serviceCode}</td>
                    <td className="p-2 border">{srv.service}</td>
                    <td className="p-2 border text-right font-semibold">{srv.total.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Export */}
          <div className="flex gap-3 mt-6">
      
            <Button onClick={exportExcel} className="bg-green-600 hover:bg-green-700"><FileSpreadsheet className="mr-2 h-4 w-4" /> Excel</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
