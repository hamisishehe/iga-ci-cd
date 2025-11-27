"use client";

import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [failMessage, setFailMessage] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const apiUrl =
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api";

    const sanitizedEmail = email.trim();
    const sanitizedPassword = password.trim();
    const escapeInput = (str: string) => str.replace(/[<>'"]/g, "");
    const safeEmail = escapeInput(sanitizedEmail);
    const safePassword = escapeInput(sanitizedPassword);

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!safeEmail || !safePassword) {
      toast.error("Please fill in all fields");
      setIsLoading(false);
      return;
    }

    if (!emailPattern.test(safeEmail)) {
      toast.error("Please enter a valid email address");
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(`${apiUrl}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: safeEmail, password: safePassword }),
      });

      if (response.ok) {
        const data = await response.json();
        login(
          data.token,
          data.role,
          data.email,
          data.username,
          data.centre,
          data.userType,
          data.zone
        );

         router.push("/user/pages/dashboard");

      } else {
        const errorData = await response.json();
        setFailMessage(errorData.message || "Invalid email or password");
      }
    } catch (err) {
      setFailMessage("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex justify-center items-center bg-cover bg-center bg-no-repeat">
      <div className="bg-white/90 shadow-2xl  backdrop-blur-md rounded-2xl shadow-4xl flex flex-col md:flex-row max-w-5xl w-full overflow-hidden border border-gray-200">
        {/* LEFT SIDE IMAGE */}
        <div className="w-full md:w-1/2 h-80 md:h-auto flex items-center justify-center bg-blue-950 p-10">
          <Image
            src="/slide.png"
            alt="veta Image"
            width={600}
            height={600}
            className="w-w-full self-center h-full object-cover rounded-2xl"
          />
        </div>

        {/* RIGHT SIDE - LOGIN FORM */}
        <div className="w-full md:w-1/2 p-10 flex flex-col justify-center bg-blue-100">
          <div className="flex justify-center mb-4">
            <Image
              src="/veta.png"
              alt="Logo"
              width={90}
              height={90}
              className=" rounded-full"
            />
          </div>

          <h3 className="text-center text-sm text-gray-700">
            The United Republic of Tanzania
          </h3>
          <h2 className="text-center font-semibold text-lg"></h2>
          <h1 className="text-center text-xl font-bold mb-6">
            VETA IGA System
          </h1>

          {failMessage && (
            <Alert variant="destructive" className="mb-4">
              <AlertTitle>Login Failed</AlertTitle>
              <AlertDescription>{failMessage}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <Label>Email *</Label>
              <Input
                type="text"
                placeholder="Enter username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-12"
              />
            </div>

            <div>
              <Label>Password *</Label>
              <Input
                type="password"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-12"
              />
            </div>

            <Button
              type="submit"
              className="w-full h-12 bg-blue-950 text-white hover:bg-blue-800"
            >
              {isLoading ? "Loading..." : "LOGIN"}
            </Button>
          </form>

          <p className="text-center text-xs text-gray-600 mt-8">
            Copyright ©2025 VETA. All Rights Reserved
            <span className="italic"> Version 2.0.0</span>
          </p>
        </div>
      </div>
    </div>
  );
}
