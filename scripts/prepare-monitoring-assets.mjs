import { copyFile, mkdir, readFile, readdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";

const root = process.cwd();
const model = path.join(root, "public/monitoring/models/blaze_face_short_range-v1.tflite");
const expected = "b4578f35940bf5a1a655214a1cce5cab13eba73c1297cd78e1a04c2380b0152f";
if (
  createHash("sha256")
    .update(await readFile(model))
    .digest("hex") !== expected
) {
  throw new Error(
    "The pinned face model is missing or has an unexpected checksum. See specs/003-monitoring/ASSETS.md.",
  );
}
const speechModel = await readFile(
  path.join(root, "node_modules/@ricky0123/vad-web/dist/silero_vad_v5.onnx"),
);
if (
  createHash("sha256").update(speechModel).digest("hex") !==
  "2623a2953f6ff3d2c1e61740c6cdb7168133479b267dfef114a4a3cc5bdd788f"
) {
  throw new Error(
    "The pinned Silero model checksum changed; review the asset provenance before updating it.",
  );
}
for (const [source, target, accept] of [
  ["node_modules/@mediapipe/tasks-vision/wasm", "vision", (name) => /\.(js|wasm)$/.test(name)],
  [
    "node_modules/@ricky0123/vad-web/dist",
    "vad",
    (name) => name === "silero_vad_v5.onnx" || name === "vad.worklet.bundle.min.js",
  ],
  [
    "node_modules/onnxruntime-web/dist",
    "ort",
    (name) => /\.wasm$/.test(name) || /^ort-wasm.*\.mjs$/.test(name),
  ],
]) {
  const destination = path.join(root, "public/monitoring/vendor", target);
  await mkdir(destination, { recursive: true });
  for (const name of await readdir(path.join(root, source))) {
    if (accept(name)) await copyFile(path.join(root, source, name), path.join(destination, name));
  }
}
console.log("Pinned monitoring model verified; local MediaPipe, Silero and ONNX assets prepared.");
