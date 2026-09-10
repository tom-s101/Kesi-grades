"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PrintButton() {
  return (
    <Button onClick={() => window.print()} className="no-print">
      <Printer size={16} /> Print / Save as PDF
    </Button>
  );
}
