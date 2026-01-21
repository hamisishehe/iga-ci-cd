"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  IconFileReport,
  IconReceipt,
  IconArrowDownDashed,
  IconArrowsShuffle,
  IconCalendar,
  IconBuilding,
  IconSearch,
  IconChevronRight,
} from "@tabler/icons-react";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type ReportType = "collections" | "distributions" | "apposhment";

const REPORTS: Array<{
  id: ReportType;
  title: string;
  description: string;
  href: string;
  icon: React.ElementType;
}> = [
  {
    id: "collections",
    title: "Collections Report",
    description: "Generate reports for collections by date range (and centre if applicable).",
    href: "/user/pages/reports/collections-reports",
    icon: IconReceipt,
  },
  {
    id: "distributions",
    title: "Distributions Report",
    description: "Generate distribution reports to track allocation and flow of proceeds.",
    href: "/user/pages/reports/distribution-reports",
    icon: IconArrowDownDashed,
  },
  {
    id: "apposhment",
    title: "Apposhment Report",
    description: "Generate apposhment reports for approvals, posting, or allocations.",
    href: "/user/pages/reports/apposhment-reports",
    icon: IconArrowsShuffle,
  },
];

export default function ReportsHubPage() {
  const router = useRouter();

  const [reportType, setReportType] = React.useState<ReportType>("collections");
  const [startDate, setStartDate] = React.useState("");
  const [endDate, setEndDate] = React.useState("");
  const [centre, setCentre] = React.useState<string>("ALL");

  // Optional: replace with real centres from API
  const centres = React.useMemo(() => ["ALL", "DODOMA", "DAR ES SALAAM", "ARUSHA", "MOROGORO"], []);

  // Optional: read userType if you want to hide centre for centre users
  const [userType, setUserType] = React.useState<string | null>(null);
  React.useEffect(() => {
    setUserType(localStorage.getItem("userType"));
  }, []);

  const selected = React.useMemo(
    () => REPORTS.find((r) => r.id === reportType) ?? REPORTS[0],
    [reportType]
  );

  function goGenerate() {
  const params = new URLSearchParams();

  // Dates
  if (startDate) params.set("startDate", startDate);
  if (endDate) params.set("endDate", endDate);

  // Centre
  if (centre && centre !== "ALL") params.set("centre", centre);

  const query = params.toString();
  router.push(query ? `${selected.href}?${query}` : selected.href);
}


  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50">
      <div className="px-4 py-6 space-y-6">
        {/* Breadcrumb */}
        <div className="flex items-center justify-between">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                {/* Change to your dashboard path */}
                <BreadcrumbLink href="/user/pages/dashboard" className="font-semibold text-slate-800">
                  Dashboard
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem className="text-slate-600">Reports</BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>

        {/* Header */}
        <Card className="relative overflow-hidden rounded-2xl border-slate-200/60 bg-white shadow-sm">
          <div className="absolute inset-0 bg-gradient-to-br from-sky-500/10 via-transparent to-indigo-500/10" />
          <CardContent className="relative p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-2 text-slate-900">
                  <span className="h-10 w-10 rounded-2xl bg-slate-900 text-white grid place-items-center shadow-sm">
                    <IconFileReport className="h-5 w-5" />
                  </span>
                  <h1 className="text-xl md:text-2xl font-bold">Reports Generator</h1>
                </div>
                <p className="text-sm text-slate-600">
                  Choose a report type, set filters, then generate the report page.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Link
                  href={selected.href}
                  className="hidden md:inline-flex h-10 items-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Open selected report page <IconChevronRight className="ml-2 h-4 w-4" />
                </Link>
                <Button
                  onClick={goGenerate}
                  className="h-10 rounded-xl bg-slate-900 text-white hover:bg-slate-800 shadow-sm"
                >
                  Generate
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Filters */}
        <Card className="relative overflow-hidden rounded-2xl border-slate-200/60 bg-white shadow-sm">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-transparent to-teal-500/10" />
          <CardHeader className="relative pb-3">
            <CardTitle className="text-lg text-slate-900">Filters</CardTitle>
            <CardDescription className="text-slate-600">
              Choose report type and parameters (dates + centre if available).
            </CardDescription>
          </CardHeader>

          <CardContent className="relative">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
              {/* Report type */}
              <div className="md:col-span-4 space-y-1.5">
                <label className="block text-xs font-medium text-slate-700">Report Type</label>
                <Select value={reportType} onValueChange={(v) => setReportType(v as ReportType)}>
                  <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-white">
                    <SelectValue placeholder="Select report type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="collections">
                      <div className="flex items-center gap-2">
                        <IconReceipt className="h-4 w-4" />
                        Collections
                      </div>
                    </SelectItem>
                    <SelectItem value="distributions">
                      <div className="flex items-center gap-2">
                        <IconArrowDownDashed className="h-4 w-4" />
                        Distributions
                      </div>
                    </SelectItem>
                    <SelectItem value="apposhment">
                      <div className="flex items-center gap-2">
                        <IconArrowsShuffle className="h-4 w-4" />
                        Apposhment
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Start date */}
              <div className="md:col-span-3 space-y-1.5">
                <label className="block text-xs font-medium text-slate-700">Start Date</label>
                <div className="relative">
                  <IconCalendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="h-11 rounded-xl border-slate-200 bg-white pl-9"
                  />
                </div>
              </div>

              {/* End date */}
              <div className="md:col-span-3 space-y-1.5">
                <label className="block text-xs font-medium text-slate-700">End Date</label>
                <div className="relative">
                  <IconCalendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="h-11 rounded-xl border-slate-200 bg-white pl-9"
                  />
                </div>
              </div>

              {/* Centre (optional)
              {userType !== "CENTRE" && (
                <div className="md:col-span-2 space-y-1.5">
                  <label className="block text-xs font-medium text-slate-700">Centre</label>
                  <Select value={centre} onValueChange={setCentre}>
                    <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-white">
                      <SelectValue placeholder="All Centres" />
                    </SelectTrigger>
                    <SelectContent>
                      {centres.map((c) => (
                        <SelectItem key={c} value={c}>
                          <div className="flex items-center gap-2">
                            <IconBuilding className="h-4 w-4" />
                            {c}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )} */}

              {/* Generate */}
              <div className={`${userType !== "CENTRE" ? "md:col-span-12" : "md:col-span-2"} pt-2`}>
                <Button
                  onClick={goGenerate}
                  className="h-11 w-full rounded-xl bg-slate-900 text-white hover:bg-slate-800 shadow-sm"
                >
                  <IconSearch className="mr-2 h-5 w-5" />
                  Generate Report
                </Button>

                <div className="mt-3 text-xs text-slate-500">
                  Tip: If you leave centre as <span className="font-semibold text-slate-700">ALL</span>, the report page can
                  show combined results (depending on your backend).
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick links */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {REPORTS.map((r) => {
            const active = r.id === reportType;
            const Icon = r.icon;

            return (
              <Card
                key={r.id}
                className={`relative overflow-hidden rounded-2xl border-slate-200/60 bg-white shadow-sm transition ${
                  active ? "ring-2 ring-slate-900/15" : "hover:shadow-md"
                }`}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-slate-900/0 via-transparent to-slate-900/5" />
                <CardContent className="relative p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-slate-900">
                        <span className="h-10 w-10 rounded-2xl bg-slate-900 text-white grid place-items-center shadow-sm">
                          <Icon className="h-5 w-5" />
                        </span>
                        <div className="font-semibold">{r.title}</div>
                      </div>
                      <div className="text-sm text-slate-600">{r.description}</div>
                    </div>

                    <button
                      onClick={() => setReportType(r.id)}
                      className={`shrink-0 rounded-xl px-3 py-2 text-xs font-semibold border transition ${
                        active
                          ? "border-slate-900 bg-slate-900 text-white"
                          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      {active ? "Selected" : "Select"}
                    </button>
                  </div>

                  <div className="mt-4 flex items-center justify-between">
                    <Link
                      href={r.href}
                      className="text-sm font-medium text-slate-800 hover:text-slate-900 underline underline-offset-4"
                    >
                      Open page
                    </Link>

                    <Button
                      variant="outline"
                      className="h-9 rounded-xl border-slate-200"
                      onClick={() => router.push(r.href)}
                    >
                      Continue <IconChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
