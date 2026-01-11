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
import { motion, AnimatePresence } from "framer-motion";

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [failMessage, setFailMessage] = useState("");

  const slides = ["/bg2.jpg", "/bg3.png", "/slide.png"];
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const interval = setInterval(
      () => setCurrentSlide((prev) => (prev + 1) % slides.length),
      8000
    );
    return () => clearInterval(interval);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    if (!email || !password) {
      toast.error("Please fill in all fields");
      setIsLoading(false);
      return;
    }

    try {
      const apiUrl =
        process.env.NEXT_AUTH_URL || "http://10.10.11.12:8080/auth";

      const response = await fetch(`${apiUrl}/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-KEY": process.env.NEXT_PUBLIC_API_KEY!,
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const err = await response.json();
        setFailMessage(err.message || "Invalid credentials");
        return;
      }

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

      router.push(
        data.role === "ADMIN"
          ? "/user/admin/dashboard"
          : "/user/pages/dashboard"
      );
    } catch {
      setFailMessage("Login failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 via-blue-800 to-blue-950 px-4">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="w-full max-w-5xl overflow-hidden rounded-3xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl flex flex-col md:flex-row"
      >
        {/* LEFT – SLIDESHOW */}
        <div className="relative hidden md:block md:w-1/2 bg-blue-950">
          <AnimatePresence>
            {slides.map(
              (src, index) =>
                index === currentSlide && (
                  <motion.div
                    key={src}
                    initial={{ opacity: 0, scale: 1.05 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 1 }}
                    className="absolute inset-0"
                  >
                    <Image
                      src={src}
                      alt="Slide"
                      fill
                      className="object-cover"
                      priority
                    />
                  </motion.div>
                )
            )}
          </AnimatePresence>

          {/* Indicators */}
          <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex gap-2 z-10">
            {slides.map((_, i) => (
              <span
                key={i}
                className={`w-2.5 h-2.5 rounded-full transition ${
                  i === currentSlide ? "bg-white" : "bg-white/40"
                }`}
              />
            ))}
          </div>
        </div>

        {/* RIGHT – FORM */}
        <div className="w-full md:w-1/2 p-10 text-white">
          {/* Logo */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="flex justify-center mb-4"
          >
            <Image src="/veta.png" alt="VETA" width={90} height={90} className="rounded-full" />
          </motion.div>

          <h3 className="text-center text-xl text-blue-100 font-semibold">
            Vocational Education and Training Authority
          </h3>
          <h1 className="text-center text-md font-semibold mb-6">
            VETA IGA System (VETIS)
          </h1>

          {failMessage && (
            <Alert variant="destructive" className="mb-4">
              <AlertTitle>Error - </AlertTitle>
              <AlertDescription>{failMessage}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <Label className=" py-2.5">Email</Label>
              <Input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter email"
                className="h-12 bg-white/20 border-white/30 placeholder:text-blue-100 focus:ring-2 focus:ring-blue-400"
              />
            </div>

            <div>
              <Label className=" py-2.5">Password</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="h-12 bg-white/20 border-white/30 placeholder:text-blue-100 focus:ring-2 focus:ring-blue-400"
              />
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 bg-blue-600 hover:bg-blue-500 transition-all shadow-lg shadow-blue-500/30"
            >
              {isLoading ? "Signing in..." : "LOGIN"}
            </Button>
          </form>

          <p className="mt-8 text-center text-xs text-blue-200">
            © 2025 VETA • Version 1.0.0
          </p>
        </div>
      </motion.div>
    </div>
  );
}
