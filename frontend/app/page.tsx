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
import { Eye, EyeOff, Loader2 } from "lucide-react";

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

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
  }, [slides.length]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setFailMessage("");
    setIsLoading(true);

    if (!email || !password) {
      toast.error("Please fill in all fields");
      setIsLoading(false);
      return;
    }

    try {
      const apiUrl = process.env.NEXT_AUTH_URL || "https://vets.veta.go.tz/auth";

      const response = await fetch(`${apiUrl}/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-KEY": process.env.NEXT_PUBLIC_API_KEY!,
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-950 via-blue-900 to-slate-950 px-4 py-10">
      <motion.div
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: "easeOut" }}
        // ✅ reduced overall width + height feel
        className="w-full max-w-4xl overflow-hidden rounded-3xl bg-white/10 backdrop-blur-xl border border-white/15 shadow-2xl flex flex-col md:flex-row"
      >
        {/* LEFT – SLIDESHOW */}
        <div className="relative hidden md:block md:w-1/2 bg-blue-950">
          <AnimatePresence mode="wait">
            {slides.map(
              (src, index) =>
                index === currentSlide && (
                  <motion.div
                    key={src}
                    initial={{ opacity: 0, scale: 1.03 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.9 }}
                    className="absolute inset-0"
                  >
                    <Image
                      src={src}
                      alt="Slide"
                      fill
                      className="object-cover"
                      priority
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-blue-950/60 via-blue-950/10 to-transparent" />
                  </motion.div>
                )
            )}
          </AnimatePresence>

          {/* Indicators */}
          <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex gap-2 z-10">
            {slides.map((_, i) => (
              <span
                key={i}
                className={`h-2.5 rounded-full transition-all duration-300 ${
                  i === currentSlide ? "w-6 bg-white" : "w-2.5 bg-white/40"
                }`}
              />
            ))}
          </div>
        </div>

        {/* RIGHT – FORM */}
        <div className="w-full md:w-1/2 text-white">
          {/* ✅ reduced padding + tighter layout */}
          <div className="px-7 py-7 sm:px-8 sm:py-8">
            {/* Logo */}
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.15 }}
              className="flex justify-center mb-4"
            >
              <div className="relative h-16 w-16 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center shadow-md">
                <Image
                  src="/veta.png"
                  alt="VETA"
                  width={52}
                  height={52}
                  className="rounded-xl"
                />
              </div>
            </motion.div>

            <h3 className="text-center text-[15px] text-blue-100/90 font-semibold leading-snug">
              Vocational Education and Training Authority
            </h3>
            <h1 className="text-center text-lg font-semibold mt-1">
              VETA IGA System (VETIS)
            </h1>

            <div className="my-5 h-px w-full bg-white/10" />

            {failMessage && (
              <Alert variant="destructive" className="mb-4">
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{failMessage}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-blue-50/90">Email</Label>
                <Input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter email"
                  autoComplete="email"
                  className="h-10 bg-white/15 border-white/20 placeholder:text-blue-100/60 focus-visible:ring-2 focus-visible:ring-blue-400/70"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-blue-50/90">Password</Label>

                {/* ✅ Password with show/hide */}
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    autoComplete="current-password"
                    className="h-10 pr-11 bg-white/15 border-white/20 placeholder:text-blue-100/60 focus-visible:ring-2 focus-visible:ring-blue-400/70"
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-2 text-white/70 hover:text-white hover:bg-white/10 transition"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-10 bg-blue-600 hover:bg-blue-500 transition-all shadow-lg shadow-blue-500/25"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Signing in...
                  </span>
                ) : (
                  "LOGIN"
                )}
              </Button>
            </form>

            <p className="mt-6 text-center text-[11px] text-blue-200/80">
              © 2025 VETA • Version 1.0.0
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
