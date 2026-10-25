"use client";
import type { MonitoringConsent } from "@/contracts";

export function MonitoringConsentFields({
  value,
  onChange,
  disabled = false,
  required = false,
}: {
  value: MonitoringConsent;
  onChange: (value: MonitoringConsent) => void;
  disabled?: boolean;
  required?: boolean;
}) {
  return (
    <fieldset disabled={disabled} className="stack">
      <legend className="eyebrow">
        {required ? "Camera and microphone required" : "Optional session observations"}
      </legend>
      {(
        [
          ["focus", "Observe when this interview tab is hidden."],
          ["camera", "Allow local webcam face-count observations. Frames are never uploaded."],
          [
            "audio",
            "Allow local speech-activity observations. Audio is never recorded or uploaded.",
          ],
        ] as const
      ).map(([source, text]) => (
        <label className="checkbox" key={source}>
          <input
            type="checkbox"
            checked={value[source]}
            required={required && source !== "focus"}
            onChange={(event) => onChange({ ...value, [source]: event.target.checked })}
          />
          <span>{text}</span>
        </label>
      ))}
      <p className="small muted">
        {required
          ? "Camera and microphone consent are required to proceed; page visibility remains optional. You must also allow the browser permission prompts in the device step. Decline by leaving setup. "
          : "All sources are optional. "}
        Observations do not affect technical feedback. Devices start only after explicit start
        buttons.
      </p>
    </fieldset>
  );
}
