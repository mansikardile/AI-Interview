import type { MonitoringEvent } from "@/contracts";

export function downloadObservations(events: MonitoringEvent[], filename: string) {
  const blob = new Blob(
    [
      JSON.stringify(
        {
          version: 1,
          notice: "Observations are not proof of assistance and do not affect technical feedback.",
          events,
        },
        null,
        2,
      ),
    ],
    { type: "application/json" },
  );
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
