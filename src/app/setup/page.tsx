"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardContent,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import Link from "next/link";
import { useRouter } from "next/navigation";

const steps = [
  { title: "Welcome", description: "Welcome to R.K. Njogu & Co. Advocates Setup Wizard" },
  { title: "Firm Details", description: "Enter your firm’s name, email, and address." },
  { title: "Admin Account", description: "Create your admin account to manage your firm." },
  { title: "Database Connection", description: "Connect to your Firebase backend." },
  { title: "Finish", description: "Setup is complete! Continue to create your admin account." },
];

export default function SetupWizard() {
  const [step, setStep] = useState(0);
  const router = useRouter();

  const next = () => {
    if (step === steps.length - 1) {
      router.push("/signup"); // ✅ Redirect to signup instead of dashboard
    } else {
      setStep((s) => Math.min(s + 1, steps.length - 1));
    }
  };

  const back = () => setStep((s) => Math.max(s - 1, 0));
  const progress = ((step + 1) / steps.length) * 100;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-milky-gray dark:bg-gray-950 px-6">
      <Card className="w-full max-w-lg shadow-lg border border-gray-200 dark:border-gray-800">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">{steps[step].title}</CardTitle>
          <CardDescription className="text-center">{steps[step].description}</CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <Progress value={progress} className="w-full" />

          {step === 0 && (
            <div className="text-center">
              <p>This wizard will guide you through setting up your firm's management system.</p>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <Input placeholder="Firm Name" defaultValue="R.K. Njogu & Co. Advocates" />
              <Input placeholder="Firm Email" type="email" defaultValue="contact@rknjogu.com" />
              <Input placeholder="Firm Address" defaultValue="Legal Lane, Lawsville" />
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <Input placeholder="Admin First Name" />
              <Input placeholder="Admin Last Name" />
              <Input placeholder="Email" type="email" />
              <Input placeholder="Password" type="password" />
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4 text-center">
              <p className="text-sm text-muted-foreground">
                Your application is already configured to connect to a Firebase backend. No further action is needed here.
              </p>
            </div>
          )}

          {step === 4 && (
            <div className="text-center space-y-4">
              <p>Setup complete! Let’s create your admin account to access the system.</p>
              <Button onClick={() => router.push("/signup")}>Go to Signup</Button>
            </div>
          )}

          <div className="flex justify-between pt-4">
            <Button variant="outline" onClick={back} disabled={step === 0}>
              Back
            </Button>
            <Button onClick={next}>
              {step >= steps.length - 1 ? "Finish" : "Next"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <footer className="mt-6 text-sm text-gray-500 dark:text-gray-400">
        © 2025 R.K. Njogu & Co. Advocates
      </footer>
    </div>
  );
}
