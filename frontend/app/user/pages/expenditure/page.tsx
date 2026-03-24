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
import { Download, FileText, Sheet, Filter, Wallet, Plus } from "lucide-react";

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

  const userType = (typeof window !== "undefined"
    ? localStorage.getItem("userType") || ""
    : ""
  ).toUpperCase();

  const userCentre =
    typeof window !== "undefined" ? localStorage.getItem("centre") || "" : "";
  const userZone =
    typeof window !== "undefined" ? localStorage.getItem("zone") || "" : "";
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

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [centre, setCentre] = useState("ALL");
  const [centreOptions, setCentreOptions] = useState<string[]>([]);

  const [data, setData] = useState<Apposhment[]>([]);
  const [selectedApposhmentId, setSelectedApposhmentId] = useState<string | null>(
    null
  );

  const [services, setServices] = useState<Service[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);

  const effectiveCentre = useMemo(() => {
    if (isCentreUser) return userCentre;
    return centre === "ALL" ? null : centre;
  }, [isCentreUser, userCentre, centre]);

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

        await fetchExpenses(firstRow.id);
      } else {
        setSelectedApposhmentId(null);
        setExpenses([]);
        setServices([]);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Unable to fetch data.");
      setData([]);
      setSelectedApposhmentId(null);
      setExpenses([]);
      setServices([]);
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

  const totalExpenses = useMemo(
    () => expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0),
    [expenses]
  );

  const serviceSummary = useMemo(() => {
    const summary: Record<
      string,
      { allocated: number; spent: number; remaining: number }
    > = {};

    services.forEach((s) => {
      const allocated = Number(s.amount_paid_to_paid || 0);
      const spent = expenses
        .filter((e) => e.service_name === s.serviceName)
        .reduce((sum, e) => sum + Number(e.amount || 0), 0);

      summary[s.serviceName] = {
        allocated,
        spent,
        remaining: allocated - spent,
      };
    });

    return summary;
  }, [services, expenses]);

  const openAddExpenseModal = async () => {
    if (!canAddExpense) {
      await Swal.fire(
        "Not Allowed",
        "You don't have permission to add expenditure.",
        "warning"
      );
      return;
    }

    if (!selectedApposhmentId) {
      await Swal.fire("No Apportionment", "No apportionment selected.", "warning");
      return;
    }

    if (!services.length) {
      await Swal.fire("No Services", "No services available to add expenditure.", "warning");
      return;
    }

    const optionsHtml = services
      .map(
        (s) =>
          `<option value="${s.serviceName}">${s.serviceName} (BAL: ${Number(
            s.amount_paid_to_paid || 0
          ).toLocaleString()} TSH)</option>`
      )
      .join("");

    const result = await Swal.fire({
      title: "Add Expenditure",
      html: `
        <div style="display:flex; flex-direction:column; gap:12px; text-align:left;">
          <div>
            <label style="display:block; margin-bottom:6px; font-size:13px; font-weight:600;">Profit</label>
            <select id="swal-service" class="swal2-input" style="margin:0; width:100%;">
              <option value="">Select service</option>
              ${optionsHtml}
            </select>
          </div>

          <div>
            <label style="display:block; margin-bottom:6px; font-size:13px; font-weight:600;">Amount Spent</label>
            <input id="swal-amount" type="number" min="1000" class="swal2-input" placeholder="Enter amount" style="margin:0; width:100%;" />
          </div>

          <div>
            <label style="display:block; margin-bottom:6px; font-size:13px; font-weight:600;">Description of the Amount Spent</label>
            <textarea id="swal-description" class="swal2-textarea" placeholder="Write expense description..." style="margin:0; width:100%; min-height:120px;"></textarea>
          </div>
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: "Save",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#059669",
      cancelButtonColor: "#64748b",
      preConfirm: () => {
        const service = (
          document.getElementById("swal-service") as HTMLSelectElement | null
        )?.value;
        const amountRaw = (
          document.getElementById("swal-amount") as HTMLInputElement | null
        )?.value;
        const description = (
          document.getElementById("swal-description") as HTMLTextAreaElement | null
        )?.value?.trim();

        if (!service || !amountRaw || !description) {
          Swal.showValidationMessage(
            "Please select a service and enter both amount and description."
          );
          return false;
        }

        const amount = Number(amountRaw);

        if (!amount || amount <= 0) {
          Swal.showValidationMessage("Please enter a valid amount.");
          return false;
        }

        const serviceInfo = services.find((s) => s.serviceName === service);

        if (!serviceInfo) {
          Swal.showValidationMessage("Invalid service selected.");
          return false;
        }

        const serviceBalance = Number(serviceInfo.amount_paid_to_paid || 0);
        const totalForThisService = expenses
          .filter((e) => e.service_name === service)
          .reduce((sum, e) => sum + Number(e.amount || 0), 0);

        if (totalForThisService + amount > serviceBalance) {
          Swal.showValidationMessage(
            `Not enough balance for this service.
Available: ${serviceBalance.toLocaleString()} TSH
Already used: ${totalForThisService.toLocaleString()} TSH
Remaining: ${(serviceBalance - totalForThisService).toLocaleString()} TSH`
          );
          return false;
        }

        return {
          service_name: service,
          amount,
          description,
        };
      },
    });

    if (!result.isConfirmed || !result.value) return;

    const payload = {
      ...result.value,
      apposhment_id: selectedApposhmentId,
    };

    try {
      Swal.fire({
        title: "Saving...",
        text: "Please wait",
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        },
      });

      const token = localStorage.getItem("authToken");
      const apiKey = process.env.NEXT_PUBLIC_API_KEY;

      if (!token || !apiKey) {
        Swal.close();
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

      Swal.close();

      if (rawText === "Not enough money to distribute") {
        await Swal.fire("Warning", "Not enough money to distribute", "warning");
        return;
      }

      await Swal.fire("Success!", "Expense saved successfully!", "success");

      await fetchExpenses(selectedApposhmentId);
    } catch (err: any) {
      console.error(err);
      Swal.close();
      await Swal.fire("Failed", err?.message || "Failed to save expense.", "error");
    }
  };

  const exportExcel = () => {
    if (!expenses.length) {
      toast("No data to export");
      return;
    }

    const wsData = [
      ["VETA"],
      ["PROFIT EXPENDITURE REPORT"],
      ["Date Range", `${startDate || "-"} to ${endDate || "-"}`],
      ["Centre", `${effectiveCentre ?? "ALL"}`],
      [],
      ["DETAILS"],
      [
        "#",
        "Profit From",
        "Profit Earned",
        "Amount Spent",
        "Description of Profit Expenditure",
        "Amount Remitted",
      ],
      ...expenses.map((exp, i) => {
        const sum = serviceSummary[exp.service_name] || {
          allocated: 0,
          spent: 0,
          remaining: 0,
        };

        return [
          i + 1,
          exp.service_name,
          sum.allocated,
          Number(exp.amount || 0),
          exp.description || "-",
          sum.remaining,
        ];
      }),
      [],
      ["SUMMARY PER SERVICE"],
      ["Profit From", "Amount Earned", "Spent", "Remaining"],
      ...Object.keys(serviceSummary).map((serviceName) => {
        const { allocated, spent, remaining } = serviceSummary[serviceName];
        return [serviceName, allocated, spent, remaining];
      }),
      [],
      ["TOTAL EXPENSES", "", totalExpenses],
    ];

    const ws = XLSX.utils.aoa_to_sheet(wsData);

    ws["!cols"] = [
      { wch: 6 },
      { wch: 25 },
      { wch: 18 },
      { wch: 18 },
      { wch: 40 },
      { wch: 18 },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Expenditure Report");

    XLSX.writeFile(
      wb,
      `profit_expenditure_report_${String(effectiveCentre ?? "ALL").replaceAll(
        " ",
        "_"
      )}_${fileStamp()}.xlsx`
    );
  };

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
    const titleSub = "PROFIT EXPENDITURE REPORT";
    const dateRange = `Date Range: ${startDate || "-"} to ${endDate || "-"}`;
    const centreText = `Centre: ${effectiveCentre ?? "ALL"}`;

    doc.setFillColor(15, 23, 42);
    doc.rect(marginX, 10, pageWidth - marginX * 2, 24, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text(titleMain, pageWidth / 2, 18, { align: "center" });

    doc.setFontSize(11);
    doc.text(titleSub, pageWidth / 2, 24, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.text(dateRange, pageWidth / 2, 29, { align: "center" });
    doc.text(centreText, pageWidth / 2, 33, { align: "center" });

    let currentY = 42;

    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("DETAILS", marginX, currentY);

    const detailsHead = [[
      "#",
      "Profit From",
      "Profit Earned",
      "Amount Spent",
      "Description of Profit Expenditure",
      "Amount Remitted",
    ]];

    const detailsBody = expenses.map((exp, i) => {
      const sum = serviceSummary[exp.service_name] || {
        allocated: 0,
        spent: 0,
        remaining: 0,
      };

      return [
        i + 1,
        exp.service_name,
        sum.allocated.toLocaleString(),
        Number(exp.amount || 0).toLocaleString(),
        exp.description || "-",
        sum.remaining.toLocaleString(),
      ];
    });

    autoTable(doc, {
      startY: currentY + 3,
      head: detailsHead,
      body: detailsBody,
      margin: { left: marginX, right: marginX },
      styles: {
        fontSize: 7.8,
        cellPadding: 2,
        lineWidth: 0.2,
        lineColor: [203, 213, 225],
        overflow: "linebreak",
        valign: "middle",
      },
      headStyles: {
        fillColor: [30, 41, 59],
        textColor: 255,
        fontStyle: "bold",
        halign: "center",
      },
      columnStyles: {
        0: { halign: "center", cellWidth: 10 },
        1: { cellWidth: 30 },
        2: { halign: "right", cellWidth: 26 },
        3: { halign: "right", cellWidth: 26 },
        4: { cellWidth: pageWidth - marginX * 2 - (10 + 30 + 26 + 26 + 26) },
        5: { halign: "right", cellWidth: 26 },
      },
    });

    currentY = (doc as any).lastAutoTable.finalY + 8;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("SUMMARY PER SERVICE", marginX, currentY);

    const summaryHead = [["Profit From", "Amount Earned", "Spent", "Remaining"]];

    const summaryBody = Object.keys(serviceSummary).map((serviceName) => {
      const { allocated, spent, remaining } = serviceSummary[serviceName];
      return [
        serviceName,
        allocated.toLocaleString(),
        spent.toLocaleString(),
        remaining.toLocaleString(),
      ];
    });

    autoTable(doc, {
      startY: currentY + 3,
      head: summaryHead,
      body: summaryBody,
      margin: { left: marginX, right: marginX },
      styles: {
        fontSize: 8.2,
        cellPadding: 2.2,
        lineWidth: 0.2,
        lineColor: [203, 213, 225],
        overflow: "linebreak",
      },
      headStyles: {
        fillColor: [37, 99, 235],
        textColor: 255,
        fontStyle: "bold",
        halign: "center",
      },
      columnStyles: {
        0: { cellWidth: pageWidth - marginX * 2 - 78 },
        1: { halign: "right", cellWidth: 26 },
        2: { halign: "right", cellWidth: 26 },
        3: { halign: "right", cellWidth: 26 },
      },
    });

    currentY = (doc as any).lastAutoTable.finalY + 8;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text(`TOTAL EXPENSES: ${totalExpenses.toLocaleString()} TSH`, marginX, currentY);

    const pages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pages; i++) {
      doc.setPage(i);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(100);
      doc.text(`Generated on ${new Date().toLocaleString()}`, marginX, pageHeight - 8);
      doc.text(`Page ${i} of ${pages}`, pageWidth - marginX, pageHeight - 8, {
        align: "right",
      });
    }

    doc.save(
      `profit_expenditure_report_${String(effectiveCentre ?? "ALL").replaceAll(
        " ",
        "_"
      )}_${fileStamp()}.pdf`
    );
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
            {canAddExpense && (
              <Button
                onClick={openAddExpenseModal}
                className="h-10 rounded-xl bg-slate-800 text-white hover:bg-emerald-700 shadow-sm"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Expenditure
              </Button>
            )}

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

        <Card className="rounded-2xl border-slate-200/60 bg-white shadow-sm">
          <CardHeader className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <CardTitle className="text-lg text-slate-900">Profit Expenditure</CardTitle>
              <CardDescription className="text-slate-600">
                All recorded expenses for the selected period.
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="overflow-x-auto space-y-6">
            <div>
              <h3 className="mb-3 text-sm font-semibold text-slate-800">DETAILS</h3>
              <div className="overflow-auto rounded-2xl border border-slate-200/70">
                <table className="min-w-full text-sm">
                  <thead className="sticky top-0 z-10 bg-slate-900 text-white">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium">#</th>
                      <th className="px-4 py-3 text-left font-medium">Profit From</th>
                      <th className="px-4 py-3 text-left font-medium">Profit Earned</th>
                      <th className="px-4 py-3 text-left font-medium">Amount Spent</th>
                      <th className="px-4 py-3 text-left font-medium">
                        Description of Profit Expenditure
                      </th>
                      <th className="px-4 py-3 text-left font-medium">Amount Remitted</th>
                    </tr>
                  </thead>

                  <tbody>
                    {expenses.length > 0 ? (
                      <>
                        {expenses.map((exp, i) => {
                          const sum = serviceSummary[exp.service_name] || {
                            allocated: 0,
                            spent: 0,
                            remaining: 0,
                          };

                          return (
                            <tr
                              key={i}
                              className="border-t border-slate-200/70 hover:bg-slate-50"
                            >
                              <td className="px-4 py-3 text-slate-700">{i + 1}</td>
                              <td className="px-4 py-3 text-slate-900">{exp.service_name}</td>
                              <td className="px-4 py-3 font-medium text-slate-900">
                                {formatNumber(sum.allocated)}{" "}
                                <span className="font-medium text-slate-500">TSH</span>
                              </td>
                              <td className="px-4 py-3 font-medium text-slate-900">
                                {formatNumber(exp.amount)}{" "}
                                <span className="font-medium text-slate-500">TSH</span>
                              </td>
                              <td className="px-4 py-3 text-slate-700">
                                {exp.description || "-"}
                              </td>
                              <td className="px-4 py-3 font-semibold text-slate-900">
                                {formatNumber(sum.remaining)}{" "}
                                <span className="font-medium text-slate-500">TSH</span>
                              </td>
                            </tr>
                          );
                        })}

                        <tr className="border-t-2 border-slate-300 bg-emerald-50">
                          <td className="px-4 py-3 font-bold text-slate-900" colSpan={3}>
                            TOTAL EXPENSES
                          </td>
                          <td className="px-4 py-3 font-bold text-slate-900">
                            {formatNumber(totalExpenses)}{" "}
                            <span className="font-medium text-slate-500">TSH</span>
                          </td>
                          <td className="px-4 py-3"></td>
                          <td className="px-4 py-3"></td>
                        </tr>
                      </>
                    ) : (
                      <tr>
                        <td className="px-4 py-10 text-center text-slate-500" colSpan={6}>
                          No expenditures added
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {Object.keys(serviceSummary).length > 0 && (
              <div>
                <h3 className="mb-3 text-sm font-semibold text-slate-800">
                  SUMMARY PER SERVICE
                </h3>
                <div className="overflow-auto rounded-2xl border border-slate-200/70">
                  <table className="min-w-full text-sm">
                    <thead className="bg-slate-800 text-white">
                      <tr>
                        <th className="px-4 py-3 text-left font-medium">Profit From</th>
                        <th className="px-4 py-3 text-left font-medium">Amount Earned</th>
                        <th className="px-4 py-3 text-left font-medium">Spent</th>
                        <th className="px-4 py-3 text-left font-medium">Remaining</th>
                      </tr>
                    </thead>

                    <tbody>
                      {services.map((s, i) => {
                        const sum = serviceSummary[s.serviceName] || {
                          allocated: 0,
                          spent: 0,
                          remaining: 0,
                        };

                        return (
                          <tr
                            key={i}
                            className="border-t border-slate-200/70 hover:bg-slate-50"
                          >
                            <td className="px-4 py-3 text-slate-900">{s.serviceName}</td>
                            <td className="px-4 py-3 font-medium text-slate-900">
                              {formatNumber(sum.allocated)}{" "}
                              <span className="font-medium text-slate-500">TSH</span>
                            </td>
                            <td className="px-4 py-3 font-medium text-slate-900">
                              {formatNumber(sum.spent)}{" "}
                              <span className="font-medium text-slate-500">TSH</span>
                            </td>
                            <td className="px-4 py-3 font-semibold text-slate-900">
                              {formatNumber(sum.remaining)}{" "}
                              <span className="font-medium text-slate-500">TSH</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}