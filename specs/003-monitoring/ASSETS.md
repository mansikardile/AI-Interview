# Reproducible browser models

Run `npm ci` with Node 24. The postinstall hook verifies model checksums and copies package assets to `public/monitoring/vendor/`. `npm run dev` and `npm run build` also prepare these assets, so `npm ci --ignore-scripts` can be followed by `npm run prepare:monitoring`.

No CDN connection is made during face or speech analysis. The first npm installation still needs registry access. Third-party notices and full license texts are under `public/monitoring/`.

| Artifact                      | Source/version                                      | SHA-256                                                            |
| ----------------------------- | --------------------------------------------------- | ------------------------------------------------------------------ |
| BlazeFace short-range float16 | Official Google model, path version `1`             | `b4578f35940bf5a1a655214a1cce5cab13eba73c1297cd78e1a04c2380b0152f` |
| Silero v5 ONNX                | `@ricky0123/vad-web@0.0.31/dist/silero_vad_v5.onnx` | `2623a2953f6ff3d2c1e61740c6cdb7168133479b267dfef114a4a3cc5bdd788f` |

BlazeFace is committed in `public/monitoring/models/` (about 224 KB). The larger runtimes and speech weights come from locked npm packages and are generated/ignored by Git. MediaPipe is pinned to 1.1.1, VAD wrapper to 0.0.31, ONNX Runtime Web to 1.30.0.

The script rejects unexpected model hashes instead of downloading replacement weights. Review upstream changes, provenance, licenses and model diagnostics before intentionally updating pins/checksums.

References:

- [MediaPipe face detection](https://developers.google.com/edge/mediapipe/solutions/vision/face_detector/web_js)
- [VAD browser asset setup](https://docs.vad.ricky0123.com/user-guide/browser/)
- [Silero VAD](https://github.com/snakers4/silero-vad)
- [ONNX Runtime](https://github.com/microsoft/onnxruntime)
