import { InterviewReport } from "@/modules/reports";

export default async function ReportPage({ params }: { params: Promise<{ sessionId: string }> }) {
  return <InterviewReport sessionId={(await params).sessionId} />;
}
