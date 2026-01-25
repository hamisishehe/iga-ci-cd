"use client";

import { useEffect, useState } from "react";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import Swal from "sweetalert2";
import { toast } from "sonner";

interface Service {
  serviceName: string;
  amount_paid_to_paid: number;
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
  const [selectedApposhmentId, setSelectedApposhmentId] = useState<
    string | null
  >(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "/api";


  const [services, setServices] = useState<Service[]>([]);
  const [servicesAmount, setServicesAmount] = useState<Service[]>([]);
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
    const lastDay = `${year}-${pad(month)}-${pad(
      new Date(year, month, 0).getDate()
    )}`;
    setStartDate(firstDay);
    setEndDate(lastDay);

    fetchData(firstDay, lastDay, uCentre);
  }, []);

  const fetchData = async (start: string, end: string, centreName: string) => {
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("authToken");
      const apiKey = process.env.NEXT_PUBLIC_API_KEY;

      if (!token || !apiKey) {
        toast("Missing authentication credentials");
        return;
      }

      const res = await fetch(`${apiUrl}/apposhments/all`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
          "X-API-KEY": apiKey,
        },
      });
      const rows: Apposhment[] = await res.json();

      let filteredRows = [...rows];

      console.log(
        "Filter Params - Start:",
        start,
        "End:",
        end,
        "Centre:",
        centreName
      );
      console.log("Fetched Apposhments:", rows);

      if (userCentre === "CENTRE" && userCentre) {
        filteredRows = filteredRows.filter(
          (r) => r.centre?.name?.toLowerCase() === userCentre.toLowerCase()
        );
      } else if (userType === "ZONE" && userZone) {
        filteredRows = filteredRows.filter(
          (r) => r.centre?.zone?.toLowerCase() === userZone.toLowerCase()
        );
      }

      if (centreName && userCentre !== "CENTRE") {
        filteredRows = filteredRows.filter(
          (r) => r.centre?.name === centreName
        );
      }

      const requestedStart = new Date(start).getTime();
      const requestedEnd = new Date(end).getTime();
      filteredRows = filteredRows.filter((row) => {
        if (!row.startDate || !row.endDate) return false;
        const rowStart = new Date(row.startDate).getTime();
        const rowEnd = new Date(row.endDate).getTime();
        return rowEnd >= requestedStart && rowStart <= requestedEnd;
      });

      const uniqueCentres = [
        ...new Set(rows.map((r) => r.centre?.name).filter(Boolean)),
      ];
      setCentres(uniqueCentres as string[]);
      setData(filteredRows);

      if (filteredRows.length > 0) {
        setSelectedApposhmentId(filteredRows[0].id);
        const firstServices = filteredRows[0].services || [];
        const firstServicesAmount = filteredRows[0].services || [];
        setServices(firstServices);
        setServicesAmount(firstServicesAmount);
        if (firstServices.length > 0)
          setSelectedService(firstServices[0].serviceName);
        fetchExpenses(filteredRows[0].id);
      } else {
        setSelectedApposhmentId(null);
        setExpenses([]);
        setServices([]);
        setServicesAmount([]);
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
      const token = localStorage.getItem("authToken");
      const apiKey = process.env.NEXT_PUBLIC_API_KEY;

      if (!token || !apiKey) {
        toast("Missing authentication credentials");
        return;
      }
      const res = await fetch(
        `${apiUrl}/apposhment_distribution/get/${apposhmentId}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            "X-API-KEY": apiKey,
          },
        }
      );
      const data = await res.json();

      console.log(data);

      setExpenses(data || []);
    } catch (err) {
      console.error(err);
      setExpenses([]);
    }
  };

  const formatNumber = (val: any) =>
    val != null ? Number(val).toLocaleString() : "-";
  const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

  const exportExcel = () => {
    // Build per-service totals
    const serviceSummary: Record<string, { allocated: number; spent: number }> =
      {};

    services.forEach((s) => {
      const allocated = Number(s.amount_paid_to_paid);

      const spent = expenses
        .filter((e) => e.service_name === s.serviceName)
        .reduce((sum, e) => sum + Number(e.amount), 0);

      serviceSummary[s.serviceName] = {
        allocated,
        spent,
      };
    });

    // Excel sheet data
    const wsData = [
      ["EXPENDITURE REPORT"],
      [],
      ["DETAILS"],
      ["#", "Service", "Description", "Amount Spent", "Remaining"],

      ...expenses.map((exp, i) => {
        const summary = serviceSummary[exp.service_name];
        const remaining = summary.allocated - summary.spent;
        return [
          i + 1,
          exp.service_name,
          exp.description,
          Number(exp.amount),
          remaining,
        ];
      }),

      [],
      ["SUMMARY PER SERVICE"],
      ["Service", "Allocated", "Spent", "Remaining"],

      ...Object.keys(serviceSummary).map((serviceName) => {
        const { allocated, spent } = serviceSummary[serviceName];
        return [serviceName, allocated, spent, allocated - spent];
      }),

      [],
      ["TOTAL EXPENSES", "", "", totalExpenses],
    ];

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Expenditure Report");

    XLSX.writeFile(wb, "expenditure_report.xlsx");
  };

  const getRemainingBalance = (serviceName: string) => {
    // Find the service info (total allocated)
    const s = services.find((x) => x.serviceName === serviceName);
    if (!s) return 0;

    const totalAllocated = Number(s.amount_paid_to_paid);

    // Sum expenses for this service
    const spent = expenses
      .filter((e) => e.service_name === serviceName)
      .reduce((sum, e) => sum + Number(e.amount), 0);

    return totalAllocated - spent;
  };

  const addExpense = async () => {
    setExpenseError("");
    setSuccessMessage("");

    if (!expenseAmount || !expenseDescription || !selectedService) {
      setExpenseError(
        "Please select a service and enter both amount and description."
      );
      return;
    }

    if (!selectedApposhmentId) {
      setExpenseError("No apportionment selected.");
      return;
    }

    //  1. Find selected service full object
    const serviceInfo = services.find((s) => s.serviceName === selectedService);

    if (!serviceInfo) {
      setExpenseError("Invalid service selected.");
      return;
    }

    const serviceBalance = Number(serviceInfo.amount_paid_to_paid);
    const newAmount = Number(expenseAmount);

    // 🟦 2. Get total expenses already deducted from this SAME service
    const totalForThisService = expenses
      .filter((e) => e.service_name === selectedService)
      .reduce((sum, e) => sum + Number(e.amount), 0);

    const totalAfterAdding = totalForThisService + newAmount;

    //  3. Check if greater than allowed amount
    if (totalAfterAdding > serviceBalance) {
      Swal.fire({
        title: "Failed",
        text: `Not enough balance for this service. 
Available: ${serviceBalance.toLocaleString()} TSH 
Already used: ${totalForThisService.toLocaleString()} TSH 
Remaining: ${(serviceBalance - totalForThisService).toLocaleString()} TSH`,
        icon: "error",
      });
      return;
    }

    //  4. Everything OK → Save
    const newExpense = {
      amount: newAmount,
      description: expenseDescription,
      service_name: selectedService,
      apposhment_id: selectedApposhmentId,
    };

    try {
      const token = localStorage.getItem("authToken");
      const apiKey = process.env.NEXT_PUBLIC_API_KEY;

      if (!token || !apiKey) {
        toast("Missing authentication credentials");
        return;
      }

      const response = await fetch(`${apiUrl}/apposhment_distribution/save`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "X-API-KEY": apiKey,
        },
        body: JSON.stringify(newExpense),
      });

      const rawText = await response.text();
      console.log("RAW:", rawText);

      if (rawText === "Not enough money to distribute") {
        Swal.fire("Warning", "Not enough money to distribute", "warning");
        return;
      }

      Swal.fire({
        title: "Success!",
        text: "Expense saved successfully!",
        icon: "success",
      });

      setExpenseAmount("");
      setExpenseDescription("");

      // Refresh expenses list
      fetchExpenses(selectedApposhmentId);
    } catch (err) {
      console.error(err);
      setExpenseError("Failed to save expense.");
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
    <div className="px-4 py-6 space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center justify-between">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink
                href="/user/chief_accountant/dashboard"
                className="font-semibold text-slate-800"
              >
                Dashboard
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem className="text-slate-600">Expenditure</BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      {/* Filters */}
      <Card className="relative overflow-hidden rounded-2xl border-slate-200/60 bg-white shadow-sm">
        <div className="absolute inset-0 bg-gradient-to-br from-sky-500/8 via-transparent to-indigo-500/8" />
        <CardContent className="relative p-5">
          <div className="flex flex-col gap-1 mb-4">
            <div className="text-base font-semibold text-slate-900">Filters</div>
            <div className="text-sm text-slate-600">
              Choose date range (and centre if available) to view expenditure.
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-700">Start Date</label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-10 rounded-xl border-slate-200 bg-white"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-700">End Date</label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-10 rounded-xl border-slate-200 bg-white"
              />
            </div>

            {userType !== "CENTRE" && (
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-700">Centre</label>
                <Select value={centre} onValueChange={setCentre}>
                  <SelectTrigger className="h-10 rounded-xl border-slate-200 bg-white">
                    <SelectValue placeholder="All Centres" />
                  </SelectTrigger>
                  <SelectContent>
                    {centres.map((c, i) => (
                      <SelectItem key={i} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="md:col-span-1">
              <Button
                onClick={() => fetchData(startDate, endDate, centre)}
                className="h-10 w-full rounded-xl bg-slate-900 text-white hover:bg-slate-800 shadow-sm"
              >
                Filter
              </Button>
            </div>

            <div className="hidden md:block md:col-span-2">
              <div className="h-10 rounded-xl border border-slate-200 bg-white px-3 flex items-center text-xs text-slate-600">
                Tip: Use broad dates to capture more records.
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Add Expense */}
      <Card className="relative overflow-hidden rounded-2xl border-slate-200/60 bg-white shadow-sm">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/8 via-transparent to-teal-500/8" />
        <CardHeader className="relative">
          <CardTitle className="text-lg text-slate-900">Add Expenditure</CardTitle>
          <CardDescription className="text-slate-600">
            Record a new expense and automatically compute remaining balance.
          </CardDescription>
        </CardHeader>

        <CardContent className="relative">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
            {/* Service */}
            <div className="md:col-span-3 flex flex-col gap-2">
              <label className="text-xs font-medium text-slate-700">Service</label>
              <Select value={selectedService} onValueChange={setSelectedService}>
                <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-white">
                  <SelectValue placeholder="Select Service" />
                </SelectTrigger>
                <SelectContent>
                  {services.map((s, i) => (
                    <SelectItem
                      key={i}
                      value={s.serviceName}
                      className="truncate max-w-full"
                    >
                      <div className="flex items-center justify-between gap-3 w-full">
                        <span className="truncate">{s.serviceName}</span>
                        <span className="text-slate-500 text-xs whitespace-nowrap">
                          BAL: {s.amount_paid_to_paid} TSH
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Amount */}
            <div className="md:col-span-3 flex flex-col gap-2">
              <label className="text-xs font-medium text-slate-700">Amount</label>
              <Input
                type="number"
                placeholder="Enter amount"
                className="h-11 rounded-xl border-slate-200 bg-white"
                value={expenseAmount}
                onChange={(e) => setExpenseAmount(e.target.value)}
              />
            </div>

            {/* Description */}
            <div className="md:col-span-4 flex flex-col gap-2">
              <label className="text-xs font-medium text-slate-700">Description</label>
              <textarea
                placeholder="Write expense description..."
                className="w-full h-24 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-slate-900/10"
                value={expenseDescription}
                onChange={(e) => setExpenseDescription(e.target.value)}
              />
            </div>

            {/* Save */}
            <div className="md:col-span-2 flex items-end">
              <Button
                className="w-full h-11 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm"
                onClick={addExpense}
              >
                Save
              </Button>
            </div>

            {/* Messages */}
            {expenseError && (
              <div className="md:col-span-12 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {expenseError}
              </div>
            )}

            {successMessage && (
              <div className="md:col-span-12 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                {successMessage}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Expenses Table */}
      <Card className="rounded-2xl border-slate-200/60 bg-white shadow-sm">
        <CardHeader className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <CardTitle className="text-lg text-slate-900">Expenditures</CardTitle>
            <CardDescription className="text-slate-600">
              All recorded expenses for the selected period.
            </CardDescription>
          </div>

          <Button
            onClick={exportExcel}
            className="h-10 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm"
          >
            Export Excel
          </Button>
        </CardHeader>

        <CardContent className="overflow-x-auto">
          <div className="overflow-auto rounded-2xl border border-slate-200/70">
            <table className="min-w-full text-sm">
              <thead className="sticky top-0 z-10 bg-slate-900 text-white">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">#</th>
                  <th className="px-4 py-3 text-left font-medium">Deducted from</th>
                  <th className="px-4 py-3 text-left font-medium">Description</th>
                  <th className="px-4 py-3 text-left font-medium">Amount</th>
                  <th className="px-4 py-3 text-left font-medium">Remaining</th>
                </tr>
              </thead>

              <tbody>
                {expenses.length > 0 ? (
                  expenses.map((exp, i) => (
                    <tr
                      key={i}
                      className="border-t border-slate-200/70 hover:bg-slate-50"
                    >
                      <td className="px-4 py-3 text-slate-700">{i + 1}</td>
                      <td className="px-4 py-3 text-slate-900">{exp.service_name}</td>
                      <td className="px-4 py-3 text-slate-700">{exp.description}</td>
                      <td className="px-4 py-3 font-semibold text-slate-900">
                        {formatNumber(exp.amount)} <span className="font-medium text-slate-500">TSH</span>
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-900">
                        <span className="inline-flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-sky-500" />
                          {formatNumber(getRemainingBalance(exp.service_name))}{" "}
                          <span className="font-medium text-slate-500">TSH</span>
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="px-4 py-10 text-center text-slate-500" colSpan={5}>
                      No expenditures added
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
);

}
