"use server";

import { revalidatePath } from "next/cache";
import { writeApprovalDecision } from "@/lib/hermesApprovalOutbox";

export async function submitApprovalDecision(_previousState: { status: string; message: string }, formData: FormData) {
  const result = await writeApprovalDecision(formData);
  revalidatePath("/os/hermes/approvals");
  return result;
}
