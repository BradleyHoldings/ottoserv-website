import type { Metadata } from "next";
import ProcessScanIntake from "@/components/ProcessScanIntake";

export const metadata: Metadata = {
  title: "Free Front Office Leak Check | OttoServ",
  description:
    "Submit one front office workflow for a free OttoServ process scan. Get a process map, detected leaks, automation opportunities, and a recommended 30-day pilot path.",
};

export default function FrontOfficeLeakCheckPage() {
  return <ProcessScanIntake />;
}
