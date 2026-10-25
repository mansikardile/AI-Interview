import { InterviewExperience } from "@/modules/interview";

export default async function InterviewPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  return <InterviewExperience key={sessionId} sessionId={sessionId} />;
}
