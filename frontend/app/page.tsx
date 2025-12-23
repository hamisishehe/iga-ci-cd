"use client";

import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useEffect, useState } from "react";
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
      process.env.NEXT_AUTH_URL || "http://localhost:8080/auth";

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
      const apiKey = process.env.NEXT_PUBLIC_API_KEY;

      if (!apiKey) {
        throw new Error("API key is missing in environment variables");
      }

      const response = await fetch(`${apiUrl}/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-KEY": apiKey,
        },
        body: JSON.stringify({
          email: safeEmail,
          password: safePassword,
        }),
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
          data.zone,
          data.userId
        );

        if (data.role === "ADMIN") {
          router.push("/user/admin/dashboard");
        } else {
          router.push("/user/pages/dashboard");
        }
      } else {
        const errorData = await response.json();
        setFailMessage(errorData.message || "Invalid email or password");
      }
    } catch (err) {
      console.error(err);
      setFailMessage("Login failed");
    } finally {
      setIsLoading(false);
    }
  };

  const slides = ["/bg2.jpg", "/bg3.png", "/slide.png"];

  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 10000); // 4 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-cover bg-center bg-no-repeat">
      <div className=" shadow-amber-200 shadow-2xs w-full max-w-5xl overflow-hidden rounded-2xl border border-gray-200 bg-white/90 backdrop-blur-md  flex flex-col md:flex-row">
        {/* LEFT SIDE – SLIDESHOW */}
        <div className="hidden relative w-full md:w-1/2 h-80 md:h-auto bg-blue-950 overflow-hidden p-6 md:block">
          {slides.map((src, index) => (
            <div
              key={src}
              className={`absolute inset-0 transition-opacity duration-1000 ${
                index === currentSlide ? "opacity-100" : "opacity-0"
              }`}
            >
              <Image
                src={src}
                alt="VETA slide"
                fill
                priority={index === 0}
                className="object-cover "
              />
            </div>
          ))}

          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
            {slides.map((_, i) => (
              <span
                key={i}
                className={`w-2 h-2 rounded-full ${
                  i === currentSlide ? "bg-white" : "bg-white/50"
                }`}
              />
            ))}
          </div>
        </div>

        {/* RIGHT SIDE – LOGIN FORM */}
        <div className="w-full md:w-1/2 bg-blue-100 p-10 flex flex-col justify-center">
          {/* LOGO */}
          <div className="flex justify-center mb-4">
            <Image
              src="/veta.png"
              alt="VETA Logo"
              width={90}
              height={90}
              className="rounded-full"
            />
          </div>

          {/* HEADINGS */}
          <h3 className="text-center text-sm text-gray-700">
            The United Republic of Tanzania
          </h3>
          <h1 className="text-center text-xl font-bold mb-6">
            VETA IGA System (VETIS)
          </h1>

          {/* ERROR MESSAGE */}
          {failMessage && (
            <Alert variant="destructive" className="mb-4">
              <AlertTitle>Login Failed</AlertTitle>
              <AlertDescription>{failMessage}</AlertDescription>
            </Alert>
          )}

          {/* LOGIN FORM */}
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <Label>Email *</Label>
              <Input
                type="text"
                placeholder="Enter email"
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

          {/* FOOTER */}
          <p className="mt-8 text-center text-xs text-gray-600">
            © 2025 VETA. All Rights Reserved
            <span className="italic"> Version 1.0.0</span>
          </p>
        </div>
      </div>
    </div>
  );
}
