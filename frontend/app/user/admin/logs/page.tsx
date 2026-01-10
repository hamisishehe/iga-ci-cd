"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
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
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">System Logs</h1>

      <Tabs defaultValue="login">
        <TabsList>
          <TabsTrigger value="login">Login Attempts</TabsTrigger>
          <TabsTrigger value="activity">User Activity</TabsTrigger>
        </TabsList>

        {/* ================= LOGIN ATTEMPTS ================= */}
        <TabsContent value="login">
          <Card>
            <CardHeader className="flex flex-col gap-2 md:flex-row md:justify-between">
              <CardTitle>Login Attempts</CardTitle>
              <Input
                placeholder="Search login attempts..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
                className="md:max-w-xs"
              />
            </CardHeader>

            <CardContent>
              <div className="overflow-x-auto border rounded-lg">
                <table className="min-w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="p-3 text-left">#</th>
                      <th className="p-3 text-left">Username</th>
                      <th className="p-3 text-left">IP Address</th>
                      <th className="p-3 text-left">Status</th>
                      <th className="p-3 text-left">Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedLoginAttempts.length ? (
                      paginatedLoginAttempts.map((log, i) => (
                        <tr key={log.id} className="border-t hover:bg-muted/40">
                          <td className="p-3">
                            {startLoginIndex + i + 1}
                          </td>
                          <td className="p-3 font-medium">{log.username}</td>
                          <td className="p-3 text-muted-foreground">
                            {log.ipAddress}
                          </td>
                          <td className="p-3">
                            <Badge
                              variant={
                                log.status === "SUCCESS"
                                  ? "default"
                                  : "destructive"
                              }
                            >
                              {log.status}
                            </Badge>
                          </td>
                          <td className="p-3 text-muted-foreground">
                            {new Date(log.createdAt).toLocaleString()}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="text-center py-6 text-muted-foreground">
                          No login attempts found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <Pagination
                start={startLoginIndex}
                total={filteredLoginAttempts.length}
                rowsPerPage={rowsPerPage}
                currentPage={currentPage}
                totalPages={totalLoginPages}
                prevPage={prevPage}
                nextPage={() => nextPage(totalLoginPages)}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ================= USER ACTIVITY ================= */}
        <TabsContent value="activity">
          <Card>
            <CardHeader className="flex flex-col gap-2 md:flex-row md:justify-between">
              <CardTitle>User Activity</CardTitle>
              <Input
                placeholder="Search activity logs..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
                className="md:max-w-xs"
              />
            </CardHeader>

            <CardContent>
              <div className="overflow-x-auto border rounded-lg">
                <table className="min-w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="p-3 text-left">#</th>
                      <th className="p-3 text-left">User</th>
                      <th className="p-3 text-left">Action</th>
                      <th className="p-3 text-left">Object</th>
                      <th className="p-3 text-left">User Agent</th>
                      <th className="p-3 text-left">IP</th>
                      <th className="p-3 text-left">Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedActivityLogs.length ? (
                      paginatedActivityLogs.map((log, i) => (
                        <tr key={log.id} className="border-t hover:bg-muted/40">
                          <td className="p-3">
                            {startActivityIndex + i + 1}
                          </td>
                          <td className="p-3 font-medium">
                            {log.username} 
                          </td>
                          <td className="p-3">
                            <Badge variant="outline">{log.action}</Badge>
                          </td>
                          <td className="p-3">
                            {log.objectType}
                            {log.objectId && ` #${log.objectId}`}
                          </td>
                           <td className="p-3 text-muted-foreground">
                            {log.userAgent}
                          </td>
                          <td className="p-3 text-muted-foreground">
                            {log.ipAddress}
                          </td>
                          <td className="p-3 text-muted-foreground">
                            {new Date(log.createdAt).toLocaleString()}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="text-center py-6 text-muted-foreground">
                          No activity logs found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <Pagination
                start={startActivityIndex}
                total={filteredActivityLogs.length}
                rowsPerPage={rowsPerPage}
                currentPage={currentPage}
                totalPages={totalActivityPages}
                prevPage={prevPage}
                nextPage={() => nextPage(totalActivityPages)}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
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
