"use client";

import { useEffect, useState } from "react";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbSeparator } from "@/components/ui/breadcrumb";

interface Service {
  serviceName: string;
}

interface Expense {
  service_name: string;
  description: string;
  amount: number;
}

interface Apposhment {
  id: string;
  startDate?: string;
  endDate?: string;
  centre?: { name?: string; zone?: string };
  services?: Service[];
}

export default function Expenditure() {
  const [data, setData] = useState<Apposhment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [expenseError, setExpenseError] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [centre, setCentre] = useState("");
  const [centres, setCentres] = useState<string[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseDescription, setExpenseDescription] = useState("");
  const [selectedApposhmentId, setSelectedApposhmentId] = useState<string | null>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api";

  const [services, setServices] = useState<Service[]>([]);
  const [selectedService, setSelectedService] = useState("");

  const [userType, setUserType] = useState("");
  const [userCentre, setUserCentre] = useState("");
  const [userZone, setUserZone] = useState("");

  useEffect(() => {
    const uType = localStorage.getItem("userType") || "";
    const uCentre = localStorage.getItem("centre") || "";
    const uZone = localStorage.getItem("zone") || "";

    setUserType(uType);
    setUserCentre(uCentre);
    setUserZone(uZone);

    if (uType === "CENTRE") setCentre(uCentre);

    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth() + 1;
    const pad = (n: number) => n.toString().padStart(2, "0");
    const firstDay = `${year}-${pad(month)}-01`;
    const lastDay = `${year}-${pad(month)}-${pad(new Date(year, month, 0).getDate())}`;
    setStartDate(firstDay);
    setEndDate(lastDay);

    fetchData(firstDay, lastDay, uCentre);
  }, []);

  const fetchData = async (start: string, end: string, centreName: string) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${apiUrl}/apposhments/all`);
      const rows: Apposhment[] = await res.json();

      let filteredRows = [...rows];

      console.log("Filter Params - Start:", start, "End:", end, "Centre:", centreName);
      console.log("Fetched Apposhments:", rows);  

      if (userCentre === "CENTRE" && userCentre) {
        filteredRows = filteredRows.filter(r => r.centre?.name?.toLowerCase() === userCentre.toLowerCase());
      } else if (userType === "ZONE" && userZone) {
        filteredRows = filteredRows.filter(r => r.centre?.zone?.toLowerCase() === userZone.toLowerCase());
      }

      if (centreName && userCentre !== "CENTRE") {
        filteredRows = filteredRows.filter(r => r.centre?.name === centreName);
      }

      const requestedStart = new Date(start).getTime();
      const requestedEnd = new Date(end).getTime();
      filteredRows = filteredRows.filter(row => {
        if (!row.startDate || !row.endDate) return false;
        const rowStart = new Date(row.startDate).getTime();
        const rowEnd = new Date(row.endDate).getTime();
        return rowEnd >= requestedStart && rowStart <= requestedEnd;
      });

      const uniqueCentres = [...new Set(rows.map(r => r.centre?.name).filter(Boolean))];
      setCentres(uniqueCentres as string[]);
      setData(filteredRows);

      if (filteredRows.length > 0) {
        setSelectedApposhmentId(filteredRows[0].id);
        const firstServices = filteredRows[0].services || [];
        setServices(firstServices);
        if (firstServices.length > 0) setSelectedService(firstServices[0].serviceName);
        fetchExpenses(filteredRows[0].id);
      } else {
        setSelectedApposhmentId(null);
        setExpenses([]);
        setServices([]);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Unable to fetch data.");
    } finally {
      setLoading(false);
    }
  };

  const fetchExpenses = async (apposhmentId: string) => {
    try {
      const res = await fetch(`${apiUrl}/apposhment_distribution/get/${apposhmentId}`);
      const data = await res.json();

      console.log(data);


      setExpenses(data || []);
    } catch (err) {
      console.error(err);
      setExpenses([]);
    }
  };

  const formatNumber = (val: any) => val != null ? Number(val).toLocaleString() : "-";
  const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

  const exportExcel = () => {
    const wsData = [
      ["EXPENSES"],
      ["#", "Service", "Description", "Amount"],
      ...expenses.map((exp, i) => [i + 1, exp.service_name, exp.description, exp.amount]),
      ["TOTAL EXPENSES", "", "", totalExpenses],
    ];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Expenditure Report");
    XLSX.writeFile(wb, "expenditure_report.xlsx");
  };

  const addExpense = async () => {
    setExpenseError("");
    setSuccessMessage("");

    if (!expenseAmount || !expenseDescription || !selectedService) {
      setExpenseError("Please select a service and enter both amount and description.");
      return;
    }

    if (!selectedApposhmentId) {
      setExpenseError("No apportionment selected.");
      return;
    }

    const newExpense = {
      amount: Number(expenseAmount),
      description: expenseDescription,
      service_name: selectedService,
      apposhment_id: selectedApposhmentId,
    };

    try {
      await fetch(`${apiUrl}/apposhment_distribution/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newExpense),
      });
      setExpenses(prev => [...prev, newExpense]);
      setExpenseAmount("");
      setExpenseDescription("");
      setSuccessMessage("✅ Expense saved successfully!");
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err) {
      console.error(err);
      setExpenseError("Failed to save expense.");
    }
  };

  if (loading) return <div className="text-center mt-10 text-lg font-semibold">Loading...</div>;

  return (
    <div className="px-4  py-6">
       <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/user/chief_accountant/dashboard">Dashboard</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>Expenditure</BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      {/* Filters */}



      <Card className="mb-6 mt-5">
        <CardContent className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
          <div>
            <label className="block text-sm font-medium mb-1">Start Date</label>
            <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">End Date</label>
            <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
          </div>
          {userType !== "CENTRE" && (
            <div>
              <label className="block text-sm font-medium mb-1">Centre</label>
              <Select value={centre} onValueChange={setCentre}>
                <SelectTrigger>
                  <SelectValue placeholder="All Centres" />
                </SelectTrigger>
                <SelectContent>
                  {centres.map((c, i) => (
                    <SelectItem key={i} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <Button onClick={() => fetchData(startDate, endDate, centre)} className="md:col-span-1">Filter</Button>
          <Button  onClick={exportExcel} className="md:col-span-1 bg-green-500">Export Excel</Button>
        </CardContent>
      </Card>

      {/* Add Expense */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Add Expenditure</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
          <div className="md:col-span-3">
            <Select value={selectedService} onValueChange={setSelectedService}>
              <SelectTrigger>
                <SelectValue placeholder="Select Service" />
              </SelectTrigger>
              <SelectContent>
                {services.map((s, i) => (
                  <SelectItem key={i} value={s.serviceName}>{s.serviceName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-3">
            <Input type="number" placeholder="Amount" value={expenseAmount} onChange={e => setExpenseAmount(e.target.value)} />
          </div>
          <div className="md:col-span-4">
            <Input type="text" placeholder="Description" value={expenseDescription} onChange={e => setExpenseDescription(e.target.value)} />
          </div>
          <div className="md:col-span-2">
            <Button onClick={addExpense}>Save</Button>
          </div>
          {expenseError && <div className="text-red-600 md:col-span-12">{expenseError}</div>}
          {successMessage && <div className="text-green-600 md:col-span-12">{successMessage}</div>}
        </CardContent>
      </Card>

      {/* Expenses Table */}
      <Card>
        <CardContent className="overflow-x-auto">
          <table className="min-w-full border border-gray-200 divide-y divide-gray-200">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-2 text-left text-sm font-medium">#</th>
                <th className="px-4 py-2 text-left text-sm font-medium">Deducted from</th>
                <th className="px-4 py-2 text-left text-sm font-medium">Description</th>
                <th className="px-4 py-2 text-left text-sm font-medium">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {expenses.length > 0 ? expenses.map((exp, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-4 py-2">{i + 1}</td>
                  <td className="px-4 py-2">{exp.service_name}</td>
                  <td className="px-4 py-2">{exp.description}</td>
                  <td className="px-4 py-2">{formatNumber(exp.amount)}</td>
                </tr>
              )) : (
                <tr>
                  <td className="px-4 py-2 text-center" colSpan={4}>No expenditures added</td>
                </tr>
              )}
              {expenses.length > 0 && (
                <tr className="bg-gray-200 font-semibold">
                  <td className="px-4 py-2 text-center" colSpan={3}>TOTAL EXPENSES</td>
                  <td className="px-4 py-2">{formatNumber(totalExpenses)}</td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
