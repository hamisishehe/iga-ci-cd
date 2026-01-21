"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

/* ================= TYPES ================= */
interface AuditLog {
  id: number;
  action: string;
  objectType: string;
  objectId: number | null;
  ipAddress: string;
  username: string;
  userAgent: string;
  createdAt: string;
}

interface LoginAttempt {
  id: number;
  username: string;
  ipAddress: string;
  status: "SUCCESS" | "FAILED";
  createdAt: string;
}

/* ================= COMPONENT ================= */
export default function LogsPage() {
  const apiUrl =
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api";

  const [activityLogs, setActivityLogs] = useState<AuditLog[]>([]);
  const [loginAttempts, setLoginAttempts] = useState<LoginAttempt[]>([]);

  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 5;

  useEffect(() => {
    fetchActivityLogs();
    fetchLoginAttempts();
  }, []);

  /* ================= FETCH ================= */
 const fetchActivityLogs = async () => {
  try {
    const token = localStorage.getItem("authToken");
    const apiKey = process.env.NEXT_PUBLIC_API_KEY;

    if (!token || !apiKey) {
      toast("Missing authentication credentials");
      return;
    }

    const res = await fetch(`${apiUrl}/audit_logs/getall`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        "X-API-KEY": apiKey,
      },
    });

    if (!res.ok) throw new Error();

    const data = await res.json(); // ✅ parse once
    console.log(data);             // ✅ Array(37)
    setActivityLogs(data);          // ✅ works

  } catch (error) {
    toast("Error loading activity logs");
  }
};

const fetchLoginAttempts = async () => {
  try {
    const token = localStorage.getItem("authToken");
    const apiKey = process.env.NEXT_PUBLIC_API_KEY;

    if (!token || !apiKey) {
      toast("Missing authentication credentials");
      return;
    }

    const res = await fetch(`${apiUrl}/login_attempts/get_all`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        "X-API-KEY": apiKey,
      },
    });

    if (!res.ok) throw new Error();

    const data = await res.json(); // ✅ parse once
    console.log(data);             // ✅ Array(...)
    setLoginAttempts(data);        // ✅ works

  } catch (error) {
    toast("Error loading login attempts");
  }
};

  /* ================= LOGIN FILTER + PAGINATION ================= */
  const filteredLoginAttempts = loginAttempts.filter((log) =>
    `${log.username} ${log.ipAddress} ${log.status}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  const totalLoginPages = Math.ceil(
    filteredLoginAttempts.length / rowsPerPage
  );
  const startLoginIndex = (currentPage - 1) * rowsPerPage;
  const paginatedLoginAttempts = filteredLoginAttempts.slice(
    startLoginIndex,
    startLoginIndex + rowsPerPage
  );

  /* ================= ACTIVITY FILTER + PAGINATION ================= */
  const filteredActivityLogs = activityLogs.filter((log) =>
    `${log.action} ${log.objectType} ${log.username} ${log.ipAddress}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  const totalActivityPages = Math.ceil(
    filteredActivityLogs.length / rowsPerPage
  );
  const startActivityIndex = (currentPage - 1) * rowsPerPage;
  const paginatedActivityLogs = filteredActivityLogs.slice(
    startActivityIndex,
    startActivityIndex + rowsPerPage
  );

  const nextPage = (total: number) =>
    currentPage < total && setCurrentPage((p) => p + 1);

  const prevPage = () =>
    currentPage > 1 && setCurrentPage((p) => p - 1);

  /* ================= UI ================= */
  return (
  <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50">
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          System Logs
        </h1>
        <p className="text-sm text-slate-600">
          Monitor authentication attempts and user actions across the system.
        </p>
      </div>

      <Tabs defaultValue="login">
        <TabsList className="rounded-xl bg-white border border-slate-200/70 p-1 shadow-sm">
          <TabsTrigger
            value="login"
            className="rounded-lg data-[state=active]:bg-slate-900 data-[state=active]:text-white"
          >
            Login Attempts
          </TabsTrigger>
          <TabsTrigger
            value="activity"
            className="rounded-lg data-[state=active]:bg-slate-900 data-[state=active]:text-white"
          >
            User Activity
          </TabsTrigger>
        </TabsList>

        {/* ================= LOGIN ATTEMPTS ================= */}
        <TabsContent value="login" className="mt-4">
          <Card className="relative overflow-hidden rounded-2xl border-slate-200/60 bg-white shadow-sm">
            <div className="absolute inset-0 bg-gradient-to-br from-sky-500/8 via-transparent to-indigo-500/8" />

            <CardHeader className="relative flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <CardTitle className="text-lg text-slate-900">Login Attempts</CardTitle>
                <CardDescription className="text-slate-600">
                  Recent sign-in activity including IP and success/failure status.
                </CardDescription>
              </div>

              <div className="w-full md:max-w-xs space-y-1.5">
                <label className="text-xs font-medium text-slate-700">
                  Search attempts
                </label>
                <Input
                  placeholder="Search by username or IP..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="h-10 rounded-xl border-slate-200 bg-white"
                />
              </div>
            </CardHeader>

            <CardContent className="relative">
              <div className="overflow-x-auto rounded-2xl border border-slate-200/70 bg-white">
                <table className="min-w-full text-sm">
                  <thead className="sticky top-0 z-10 bg-slate-900 text-white">
                    <tr>
                      <th className="p-3 text-left font-medium">#</th>
                      <th className="p-3 text-left font-medium">Username</th>
                      <th className="p-3 text-left font-medium">IP Address</th>
                      <th className="p-3 text-left font-medium">Status</th>
                      <th className="p-3 text-left font-medium">Time</th>
                    </tr>
                  </thead>

                  <tbody>
                    {paginatedLoginAttempts.length ? (
                      paginatedLoginAttempts.map((log, i) => {
                        const ok = log.status === "SUCCESS";
                        return (
                          <tr
                            key={log.id}
                            className="border-t border-slate-200/70 hover:bg-slate-50"
                          >
                            <td className="p-3 text-slate-700">
                              {startLoginIndex + i + 1}
                            </td>

                            <td className="p-3">
                              <div className="font-medium text-slate-900">
                                {log.username}
                              </div>
                            </td>

                            <td className="p-3 text-slate-600">{log.ipAddress}</td>

                            <td className="p-3">
                              <span
                                className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-medium ${
                                  ok
                                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                    : "border-red-200 bg-red-50 text-red-700"
                                }`}
                              >
                                <span
                                  className={`h-2 w-2 rounded-full ${
                                    ok ? "bg-emerald-500" : "bg-red-500"
                                  }`}
                                />
                                {log.status}
                              </span>
                            </td>

                            <td className="p-3 text-slate-600">
                              {new Date(log.createdAt).toLocaleString()}
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={5} className="text-center py-10 text-slate-500">
                          No login attempts found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="mt-4">
                <Pagination
                  start={startLoginIndex}
                  total={filteredLoginAttempts.length}
                  rowsPerPage={rowsPerPage}
                  currentPage={currentPage}
                  totalPages={totalLoginPages}
                  prevPage={prevPage}
                  nextPage={() => nextPage(totalLoginPages)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ================= USER ACTIVITY ================= */}
        <TabsContent value="activity" className="mt-4">
          <Card className="relative overflow-hidden rounded-2xl border-slate-200/60 bg-white shadow-sm">
            <div className="absolute inset-0 bg-gradient-to-br from-fuchsia-500/8 via-transparent to-rose-500/8" />

            <CardHeader className="relative flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <CardTitle className="text-lg text-slate-900">User Activity</CardTitle>
                <CardDescription className="text-slate-600">
                  Audited actions (create/update/delete) with object and device details.
                </CardDescription>
              </div>

              <div className="w-full md:max-w-xs space-y-1.5">
                <label className="text-xs font-medium text-slate-700">
                  Search activity
                </label>
                <Input
                  placeholder="Search user, action, object..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="h-10 rounded-xl border-slate-200 bg-white"
                />
              </div>
            </CardHeader>

            <CardContent className="relative">
              <div className="overflow-x-auto rounded-2xl border border-slate-200/70 bg-white">
                <table className="min-w-full text-sm">
                  <thead className="sticky top-0 z-10 bg-slate-900 text-white">
                    <tr>
                      <th className="p-3 text-left font-medium">#</th>
                      <th className="p-3 text-left font-medium">User</th>
                      <th className="p-3 text-left font-medium">Action</th>
                      <th className="p-3 text-left font-medium">Object</th>
                      <th className="p-3 text-left font-medium">User Agent</th>
                      <th className="p-3 text-left font-medium">IP</th>
                      <th className="p-3 text-left font-medium">Time</th>
                    </tr>
                  </thead>

                  <tbody>
                    {paginatedActivityLogs.length ? (
                      paginatedActivityLogs.map((log, i) => (
                        <tr
                          key={log.id}
                          className="border-t border-slate-200/70 hover:bg-slate-50"
                        >
                          <td className="p-3 text-slate-700">
                            {startActivityIndex + i + 1}
                          </td>

                          <td className="p-3">
                            <div className="font-medium text-slate-900">
                              {log.username}
                            </div>
                          </td>

                          <td className="p-3">
                            <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700">
                              {log.action}
                            </span>
                          </td>

                          <td className="p-3 text-slate-700">
                            {log.objectType}
                            {log.objectId && ` #${log.objectId}`}
                          </td>

                          <td className="p-3 text-slate-600">{log.userAgent}</td>
                          <td className="p-3 text-slate-600">{log.ipAddress}</td>

                          <td className="p-3 text-slate-600">
                            {new Date(log.createdAt).toLocaleString()}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="text-center py-10 text-slate-500">
                          No activity logs found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="mt-4">
                <Pagination
                  start={startActivityIndex}
                  total={filteredActivityLogs.length}
                  rowsPerPage={rowsPerPage}
                  currentPage={currentPage}
                  totalPages={totalActivityPages}
                  prevPage={prevPage}
                  nextPage={() => nextPage(totalActivityPages)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  </div>
);

}

/* ================= PAGINATION COMPONENT ================= */
function Pagination({
  start,
  total,
  rowsPerPage,
  currentPage,
  totalPages,
  prevPage,
  nextPage,
}: any) {
  return (
    <div className="flex justify-between items-center mt-4">
      <span className="text-sm text-muted-foreground">
        Showing {start + 1}–
        {Math.min(start + rowsPerPage, total)} of {total}
      </span>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={currentPage === 1}
          onClick={prevPage}
        >
          Prev
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={currentPage === totalPages}
          onClick={nextPage}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
