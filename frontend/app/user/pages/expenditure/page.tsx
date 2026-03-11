"use client";

import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import Swal from "sweetalert2";
import { toast } from "sonner";
import { Download, FileText, Sheet, Filter, Wallet } from "lucide-react";

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

const pad2 = (n: number) => String(n).padStart(2, "0");
const formatYmd = (d: Date) =>
  `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

const formatNumber = (val: any) =>
  val != null && val !== "" ? Number(val).toLocaleString() : "-";

const safeStr = (v: any) => (v == null ? "" : String(v));

const fileStamp = () => {
  const d = new Date();
  return `${d.getFullYear()}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}_${pad2(
    d.getHours()
  )}${pad2(d.getMinutes())}${pad2(d.getSeconds())}`;
};

export default function Expenditure() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "/api";

  // =========================
  // AUTH / ROLES (like payments)
  // =========================
  const userType = (typeof window !== "undefined"
    ? localStorage.getItem("userType") || ""
    : ""
  ).toUpperCase();

  const userCentre =
    typeof window !== "undefined" ? localStorage.getItem("centre") || "" : "";
  const userZone =
    typeof window !== "undefined" ? localStorage.getItem("zone") || "" : "";

  // ✅ permission role (ONLY for add)
  const userRoleRaw =
    typeof window !== "undefined" ? localStorage.getItem("userRole") || "" : "";

  const normalizedRole = useMemo(() => {
    return (userRoleRaw || "")
      .toUpperCase()
      .replace(/^ROLE_/, "")
      .replace(/\s+/g, "_")
      .trim();
  }, [userRoleRaw]);

  const isHQUser = userType === "HQ";
  const isCentreUser = userType === "CENTRE" && Boolean(userCentre);
  const isZoneUser = userType === "ZONE" && Boolean(userZone);

  const canAddExpense = useMemo(() => {
    return (
      normalizedRole === "BURSAR" ||
      normalizedRole === "ACCOUNT_OFFICER" ||
      normalizedRole === "ASSISTANT_ACCOUNT"
    );
  }, [normalizedRole]);

  // =========================
  // STATE
  // =========================
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // filters
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [centre, setCentre] = useState("ALL");
  const [centreOptions, setCentreOptions] = useState<string[]>([]);

  // apportionments
  const [data, setData] = useState<Apposhment[]>([]);
  const [selectedApposhmentId, setSelectedApposhmentId] = useState<string | null>(
    null
  );

  // services + expenses
  const [services, setServices] = useState<Service[]>([]);
  const [selectedService, setSelectedService] = useState("");
  const [expenses, setExpenses] = useState<Expense[]>([]);

  // add expense fields
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseDescription, setExpenseDescription] = useState("");
  const [expenseError, setExpenseError] = useState("");

  // =========================
  // EFFECTIVE FILTERS (same pattern as payments)
  // =========================
  const effectiveCentre = useMemo(() => {
    if (isCentreUser) return userCentre; // locked
    return centre === "ALL" ? null : centre;
  }, [isCentreUser, userCentre, centre]);

  // =========================
  // INIT: default month + lock centre if centre user
  // =========================
  useEffect(() => {
    const now = new Date();
    const first = formatYmd(new Date(now.getFullYear(), now.getMonth(), 1));
    const last = formatYmd(new Date(now.getFullYear(), now.getMonth() + 1, 0));

    setStartDate(first);
    setEndDate(last);

    if (isCentreUser) setCentre(userCentre);
    else setCentre("ALL");

    fetchApportionments(first, last, isCentreUser ? userCentre : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCentreUser, userCentre, isZoneUser, userZone, isHQUser]);

  // =========================
  // FETCH APPORTIONMENTS + APPLY ROLE FILTERS
  // =========================
  const fetchApportionments = async (
    start: string,
    end: string,
    centreName: string | null
  ) => {
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
          Authorization: `Bearer ${token}`,
          "X-API-KEY": apiKey,
        },
        cache: "no-store",
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(`HTTP ${res.status} ${txt ? `- ${txt}` : ""}`);
      }

      const rows: Apposhment[] = await res.json();

      let filtered = [...rows];

      if (isCentreUser) {
        filtered = filtered.filter(
          (r) =>
            (r.centre?.name || "").trim().toLowerCase() ===
            userCentre.trim().toLowerCase()
        );
      } else if (isZoneUser) {
        filtered = filtered.filter(
          (r) =>
            (r.centre?.zone || "").trim().toLowerCase() ===
            userZone.trim().toLowerCase()
        );
      }

      if (!isCentreUser && centreName) {
        filtered = filtered.filter(
          (r) =>
            (r.centre?.name || "").trim().toLowerCase() ===
            centreName.trim().toLowerCase()
        );
      }

      const requestedStart = new Date(start).getTime();
      const requestedEnd = new Date(end).getTime();

      filtered = filtered.filter((row) => {
        if (!row.startDate || !row.endDate) return false;
        const rowStart = new Date(row.startDate).getTime();
        const rowEnd = new Date(row.endDate).getTime();
        return rowEnd >= requestedStart && rowStart <= requestedEnd;
      });

      setData(filtered);

      if (isCentreUser) {
        setCentreOptions([userCentre]);
      } else if (isZoneUser) {
        const zoneCentres = Array.from(
          new Set(
            rows
              .filter(
                (r) =>
                  (r.centre?.zone || "").trim().toLowerCase() ===
                  userZone.trim().toLowerCase()
              )
              .map((r) => safeStr(r.centre?.name).trim())
              .filter(Boolean)
          )
        ).sort((a, b) => a.localeCompare(b));
        setCentreOptions(zoneCentres);
      } else {
        const allCentres = Array.from(
          new Set(rows.map((r) => safeStr(r.centre?.name).trim()).filter(Boolean))
        ).sort((a, b) => a.localeCompare(b));
        setCentreOptions(allCentres);
      }

      if (filtered.length > 0) {
        const firstRow = filtered[0];
        setSelectedApposhmentId(firstRow.id);

        const firstServices = firstRow.services || [];
        setServices(firstServices);
        setSelectedService(firstServices[0]?.serviceName || "");

        await fetchExpenses(firstRow.id);
      } else {
        setSelectedApposhmentId(null);
        setExpenses([]);
        setServices([]);
        setSelectedService("");
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Unable to fetch data.");
      setData([]);
      setSelectedApposhmentId(null);
      setExpenses([]);
      setServices([]);
      setSelectedService("");
      setCentreOptions(isCentreUser ? [userCentre] : []);
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
          cache: "no-store",
        }
      );

      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(`HTTP ${res.status} ${txt ? `- ${txt}` : ""}`);
      }

      const rows = await res.json();
      setExpenses(rows || []);
    } catch (err) {
      console.error(err);
      setExpenses([]);
    }
  };

  // =========================
  // TOTALS + BALANCES
  // =========================
  const totalExpenses = useMemo(
    () => expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0),
    [expenses]
  );

  const getRemainingBalance = (serviceName: string) => {
    const s = services.find((x) => x.serviceName === serviceName);
    if (!s) return 0;

    const allocated = Number(s.amount_paid_to_paid || 0);
    const spent = expenses
      .filter((e) => e.service_name === serviceName)
      .reduce((sum, e) => sum + Number(e.amount || 0), 0);

    return allocated - spent;
  };

  // =========================
  // ADD EXPENSE
  // =========================
  const addExpense = async () => {
    if (!canAddExpense) {
      Swal.fire("Not Allowed", "You don't have permission to add expenditure.", "warning");
      return;
    }

    setExpenseError("");

    if (!expenseAmount || !expenseDescription || !selectedService) {
      setExpenseError("Please select a service and enter both amount and description.");
      return;
    }

    if (!selectedApposhmentId) {
      setExpenseError("No apportionment selected.");
      return;
    }

    const serviceInfo = services.find((s) => s.serviceName === selectedService);
    if (!serviceInfo) {
      setExpenseError("Invalid service selected.");
      return;
    }

    const serviceBalance = Number(serviceInfo.amount_paid_to_paid || 0);
    const newAmount = Number(expenseAmount);

    const totalForThisService = expenses
      .filter((e) => e.service_name === selectedService)
      .reduce((sum, e) => sum + Number(e.amount || 0), 0);

    if (totalForThisService + newAmount > serviceBalance) {
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

    const payload = {
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
        body: JSON.stringify(payload),
      });

      const rawText = await response.text();

      if (!response.ok) throw new Error(rawText || `HTTP ${response.status}`);

      if (rawText === "Not enough money to distribute") {
        Swal.fire("Warning", "Not enough money to distribute", "warning");
        return;
      }

      Swal.fire("Success!", "Expense saved successfully!", "success");

      setExpenseAmount("");
      setExpenseDescription("");

      await fetchExpenses(selectedApposhmentId);
    } catch (err) {
      console.error(err);
      setExpenseError("Failed to save expense.");
    }
  };

  // =========================
  // EXPORT EXCEL
  // =========================
  const exportExcel = () => {
    if (!expenses.length) {
      toast("No data to export");
      return;
    }

    const serviceSummary: Record<string, { allocated: number; spent: number }> = {};

    services.forEach((s) => {
      const allocated = Number(s.amount_paid_to_paid || 0);
      const spent = expenses
        .filter((e) => e.service_name === s.serviceName)
        .reduce((sum, e) => sum + Number(e.amount || 0), 0);

      serviceSummary[s.serviceName] = { allocated, spent };
    });

    const wsData = [
      ["VETA"],
      ["EXPENDITURE REPORT"],
      ["Date Range", `${startDate || "-"} to ${endDate || "-"}`],
      ["Centre", `${effectiveCentre ?? "ALL"}`],
      [],
      ["DETAILS"],
      ["#", "Service", "Description", "Amount Spent", "Remaining"],
      ...expenses.map((exp, i) => {
        const sum = serviceSummary[exp.service_name] || { allocated: 0, spent: 0 };
        return [
          i + 1,
          exp.service_name,
          exp.description,
          Number(exp.amount),
          sum.allocated - sum.spent,
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
    XLSX.writeFile(
      wb,
      `expenditure_report_${String(effectiveCentre ?? "ALL").replaceAll(" ", "_")}_${fileStamp()}.xlsx`
    );
  };

  // =========================
  // EXPORT PDF
  // =========================
  const exportPdf = async () => {
    if (!expenses.length) {
      toast("No data to export");
      return;
    }

    const doc = new jsPDF("p", "mm", "a4");
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const marginX = 12;

    const titleMain = "VETA";
    const titleSub = "EXPENDITURE REPORT";
    const dateRange = `From ${startDate || "-"}  To ${endDate || "-"}`;
    const meta = `Centre: ${effectiveCentre ?? "ALL"} "-"
    }`;

    // Header bar
    doc.setFillColor(15, 23, 42);
    doc.rect(marginX, 10, pageWidth - marginX * 2, 22, "F");
    doc.setDrawColor(203, 213, 225);
    doc.rect(marginX, 10, pageWidth - marginX * 2, 22);

    // Titles
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text(titleMain, pageWidth / 2, 17, { align: "center" });

    doc.setFontSize(10);
    doc.text(titleSub, pageWidth / 2, 22, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.text(dateRange, pageWidth / 2, 26.5, { align: "center" });

    doc.setFontSize(8);
    doc.text(meta, pageWidth / 2, 30.5, { align: "center" });

    // Build per-service totals
    const serviceSummary: Record<string, { allocated: number; spent: number }> = {};
    services.forEach((s) => {
      const allocated = Number(s.amount_paid_to_paid || 0);
      const spent = expenses
        .filter((e) => e.service_name === s.serviceName)
        .reduce((sum, e) => sum + Number(e.amount || 0), 0);
      serviceSummary[s.serviceName] = { allocated, spent };
    });

    // Main table
    const head = [["#", "Service", "Description", "Spent (TZS)", "Remaining (TZS)"]];
    const body = expenses.map((e, i) => {
      const sum = serviceSummary[e.service_name] || { allocated: 0, spent: 0 };
      const remaining = sum.allocated - sum.spent;
      return [
        i + 1,
        e.service_name,
        e.description,
        Number(e.amount).toLocaleString(),
        remaining.toLocaleString(),
      ];
    });

    // Total row
    body.push(["", "", "TOTAL", totalExpenses.toLocaleString(), ""]);

    autoTable(doc, {
      startY: 38,
      head,
      body,
      margin: { left: marginX, right: marginX },
      styles: {
        fontSize: 8.5,
        cellPadding: 2.2,
        lineWidth: 0.2,
        lineColor: [203, 213, 225],
        overflow: "linebreak",
      },
      headStyles: {
        fillColor: [30, 41, 59],
        textColor: 255,
        fontStyle: "bold",
      },
      columnStyles: {
        0: { halign: "center", cellWidth: 8 },
        1: { cellWidth: 38 },
        2: { cellWidth: pageWidth - marginX * 2 - (8 + 38 + 26 + 28) },
        3: { halign: "right", cellWidth: 26 },
        4: { halign: "right", cellWidth: 28 },
      },
      didParseCell: (d: any) => {
        if (d.section === "body" && d.row.index === body.length - 1) {
          d.cell.styles.fontStyle = "bold";
          d.cell.styles.fillColor = [220, 252, 231];
        }
      },
    });

    // Summary table
    const lastY = (doc as any).lastAutoTable?.finalY ?? 38;

    const summaryHead = [["Service", "Allocated", "Spent", "Remaining"]];
    const summaryBody = Object.keys(serviceSummary).map((name) => {
      const { allocated, spent } = serviceSummary[name];
      return [
        name,
        allocated.toLocaleString(),
        spent.toLocaleString(),
        (allocated - spent).toLocaleString(),
      ];
    });

    autoTable(doc, {
      startY: lastY + 8,
      head: summaryHead,
      body: summaryBody,
      margin: { left: marginX, right: marginX },
      styles: {
        fontSize: 8.5,
        cellPadding: 2.2,
        lineWidth: 0.2,
        lineColor: [203, 213, 225],
      },
      headStyles: {
        fillColor: [37, 99, 235],
        textColor: 255,
        fontStyle: "bold",
      },
      columnStyles: {
        0: { cellWidth: pageWidth - marginX * 2 - 78 },
        1: { halign: "right", cellWidth: 26 },
        2: { halign: "right", cellWidth: 26 },
        3: { halign: "right", cellWidth: 26 },
      },
    });

    // Footer pages
    const pages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(100);
      doc.text(`Generated on ${new Date().toLocaleString()}`, marginX, pageHeight - 8);
      doc.text(`Page ${i} of ${pages}`, pageWidth - marginX, pageHeight - 8, {
        align: "right",
      });
    }

    doc.save(
      `expenditure_report_${String(effectiveCentre ?? "ALL").replaceAll(" ", "_")}_${fileStamp()}.pdf`
    );
  };

  // =========================
  // UI
  // =========================
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

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={exportPdf}
              className="h-10 rounded-xl border-slate-200 bg-white"
            >
              <FileText className="h-4 w-4 mr-2" />
              Export PDF
            </Button>
            <Button
              onClick={exportExcel}
              className="h-10 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm"
            >
              <Sheet className="h-4 w-4 mr-2" />
              Export Excel
            </Button>
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Filters */}
        <Card className="relative overflow-hidden rounded-2xl border-slate-200/60 bg-white shadow-sm">
          <CardHeader className="pb-0">
            <CardTitle className="text-base text-slate-900 flex items-center gap-2">
              <Filter className="h-4 w-4 text-slate-700" />
              Filters
            </CardTitle>
            <CardDescription className="text-slate-600">
              Pick date range and centre (if allowed) then filter.
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-4">
            <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-700">Start</label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="h-11 rounded-2xl border-slate-200 bg-white shadow-sm focus-visible:ring-slate-900/15"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-700">End</label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="h-11 rounded-2xl border-slate-200 bg-white shadow-sm focus-visible:ring-slate-900/15"
                />
              </div>

              {/* CENTRE: same behavior as payments */}
              {(!isCentreUser || isHQUser) && (
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-slate-700">Centre</label>
                  <Select
                    value={isCentreUser ? userCentre : centre}
                    onValueChange={(v) => setCentre(v)}
                    disabled={isCentreUser}
                  >
                    <SelectTrigger className="h-11 rounded-2xl border-slate-200 bg-white shadow-sm">
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All</SelectItem>
                      {(centreOptions || []).map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="md:col-span-1">
                <Button
                  onClick={() => fetchApportionments(startDate, endDate, effectiveCentre)}
                  className="h-11 w-full rounded-2xl bg-slate-900 text-white hover:bg-slate-800 shadow-sm"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Filter
                </Button>
              </div>

              <div className="hidden md:block md:col-span-2">
                <div className="h-11 rounded-2xl border border-slate-200 bg-white px-3 flex items-center text-xs text-slate-600 shadow-sm">
                  {isZoneUser
                    ? `Zone locked: ${userZone}`
                    : isCentreUser
                    ? `Centre locked: ${userCentre}`
                    : isHQUser
                    ? "HQ access: all centres"
                    : "Tip: Use broad dates to capture more records."}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Add Expense */}
        {canAddExpense ? (
          <Card className="relative overflow-hidden rounded-2xl border-slate-200/60 bg-white shadow-sm">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/8 via-transparent to-teal-500/8" />
            <CardHeader className="relative">
              <CardTitle className="text-lg text-slate-900 flex items-center gap-2">
                <Wallet className="h-5 w-5 text-emerald-700" />
                Add Expenditure
              </CardTitle>
              <CardDescription className="text-slate-600">
                Record a new expense and track remaining balances.
              </CardDescription>
            </CardHeader>

            <CardContent className="relative">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                <div className="md:col-span-3 flex flex-col gap-2">
                  <label className="text-xs font-medium text-slate-700">Service</label>
                  <Select value={selectedService} onValueChange={setSelectedService}>
                    <SelectTrigger className="h-11 rounded-2xl border-slate-200 bg-white shadow-sm">
                      <SelectValue placeholder="Select Service" />
                    </SelectTrigger>
                    <SelectContent>
                      {services.map((s, i) => (
                        <SelectItem key={i} value={s.serviceName}>
                          <div className="flex items-center justify-between gap-3 w-full">
                            <span className="truncate">{s.serviceName}</span>
                            <span className="text-slate-500 text-xs whitespace-nowrap">
                              BAL: {formatNumber(s.amount_paid_to_paid)} TSH
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="md:col-span-3 flex flex-col gap-2">
                  <label className="text-xs font-medium text-slate-700">Amount</label>
                  <Input
                    type="number"
                    placeholder="Enter amount"
                    className="h-11 rounded-2xl border-slate-200 bg-white shadow-sm focus-visible:ring-emerald-600/15"
                    value={expenseAmount}
                    onChange={(e) => setExpenseAmount(e.target.value)}
                    min={1000}
                  />
                </div>

                <div className="md:col-span-4 flex flex-col gap-2">
                  <label className="text-xs font-medium text-slate-700">Description</label>
                  <textarea
                    placeholder="Write expense description..."
                    className="w-full h-24 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none shadow-sm focus:ring-2 focus:ring-emerald-600/15"
                    value={expenseDescription}
                    onChange={(e) => setExpenseDescription(e.target.value)}
                  />
                </div>

                <div className="md:col-span-2 flex items-end">
                  <Button
                    className="w-full h-11 rounded-2xl bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm"
                    onClick={addExpense}
                  >
                    Save
                  </Button>
                </div>

                {expenseError && (
                  <div className="md:col-span-12 rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {expenseError}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="rounded-2xl border-slate-200/60 bg-white shadow-sm">
            <CardContent className="p-5">
             
            </CardContent>
          </Card>
        )}

        {/* Table */}
        <Card className="rounded-2xl border-slate-200/60 bg-white shadow-sm">
          <CardHeader className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <CardTitle className="text-lg text-slate-900">Expenditures</CardTitle>
              <CardDescription className="text-slate-600">
                All recorded expenses for the selected period.
              </CardDescription>
            </div>

            
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
                      <tr key={i} className="border-t border-slate-200/70 hover:bg-slate-50">
                        <td className="px-4 py-3 text-slate-700">{i + 1}</td>
                        <td className="px-4 py-3 text-slate-900">{exp.service_name}</td>
                        <td className="px-4 py-3 text-slate-700">{exp.description}</td>
                        <td className="px-4 py-3 font-semibold text-slate-900">
                          {formatNumber(exp.amount)}{" "}
                          <span className="font-medium text-slate-500">TSH</span>
                        </td>
                        <td className="px-4 py-3 font-semibold text-slate-900">
                          {formatNumber(getRemainingBalance(exp.service_name))}{" "}
                          <span className="font-medium text-slate-500">TSH</span>
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