"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { motion } from "framer-motion";
import Swal from "sweetalert2";

export default function ProfilePage() {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    const storedEmail = localStorage.getItem("email") || "";
    const storedUsername = localStorage.getItem("username") || "";
    setEmail(storedEmail);
    setUsername(storedUsername);
  }, []);


const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

const handlePasswordChange = async () => {
  if (!currentPassword || !newPassword || !confirmPassword) {
    Swal.fire("Error", "Please fill in all fields.", "error");
    return;
  }

  if (newPassword !== confirmPassword) {
    Swal.fire("Error", "New passwords do not match.", "error");
    return;
  }

  const userId = localStorage.getItem("userId");
  if (!userId) {
    Swal.fire("Error", "User not logged in.", "error");
    return;
  }

  try {
    const response = await fetch(`${apiUrl}/users/change-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: Number(userId),
        oldPassword: currentPassword,
        newPassword: newPassword,
      }),
    });

    const result = await response.text();
    console.log("Response:", result);

    if (result === "Incorrect old password") {
      Swal.fire("Error", "Incorrect old password.", "error");
      return;
    }

    if (result === "Password changed successfully") {
      Swal.fire("Success!", "Your password has been updated.", "success");

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      return;
    }

    // fallback for any message from backend
    Swal.fire("Message", result, "info");

  } catch (error) {
    console.error(error);
    Swal.fire("Error", "Failed to update password.", "error");
  }
};



  return (
    <div className="max-w-2xl mx-auto mt-10 p-6 w-full">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <Card className="shadow-xl rounded-2xl p-6 border border-gray-200 ">
          <CardHeader className="text-center">
            <Avatar className="w-24 h-24 mx-auto mb-3 shadow-md">
              <AvatarImage src="" />
              <AvatarFallback className="text-3xl font-semibold">
                {username ? username.charAt(0).toUpperCase() : "U"}
              </AvatarFallback>
            </Avatar>
            <CardTitle className="text-3xl font-bold tracking-tight">Profile</CardTitle>
            <p className="text-gray-500 mt-1">Manage your account settings and password</p>
          </CardHeader>

          <CardContent>
            <div className="space-y-5">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-gray-50 p-4 rounded-xl border"
              >
                <Label className="text-sm font-medium text-gray-600">Email</Label>
                <Input
                  value={email}
                  readOnly
                  className="mt-1 bg-white/70"
                />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-gray-50 p-4 rounded-xl border"
              >
                <Label className="text-sm font-medium text-gray-600">Username</Label>
                <Input
                  value={username}
                  readOnly
                  className="mt-1 bg-white/70"
                />
              </motion.div>

              <Separator className="my-6" />

              <h2 className="text-xl font-semibold mb-2">Change Password</h2>

              <div className="grid gap-4">
                <div>
                  <Label>Current Password</Label>
                  <Input
                    type="password"
                    className="mt-1"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                  />
                </div>

                <div>
                  <Label>New Password</Label>
                  <Input
                    type="password"
                    className="mt-1"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>

                <div>
                  <Label>Confirm Password</Label>
                  <Input
                    type="password"
                    className="mt-1"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>

                <Button
                  className="w-full mt-2 text-lg py-3 rounded-xl shadow-md"
                  onClick={handlePasswordChange}
                >
                  Update Password
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}