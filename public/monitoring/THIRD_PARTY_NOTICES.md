# Monitoring asset attribution

Face detection uses Google MediaPipe Tasks Vision 1.1.1 and the version-1 float16 BlazeFace short-range model. Google MediaPipe is Apache-2.0 licensed. The model is downloaded from the official Google model distribution:

https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite

Speech activity uses the Silero v5 ONNX model distributed in `@ricky0123/vad-web@0.0.31`. Silero VAD is MIT licensed (Silero Team); the browser wrapper is ISC licensed (ricky0123). ONNX Runtime Web 1.30.0 is MIT licensed (Microsoft Corporation).

Full upstream notices are in `licenses/Apache-2.0.txt`, `licenses/Silero-MIT.txt`, `licenses/VAD-ISC.txt` and `licenses/ONNX-MIT.txt`. These notices apply to third-party artifacts only and do not select a license for InterviewIQ's original code. The upstream licenses were retrieved from official repositories on 2026-10-25.

Generated vendor assets are copied from the npm versions locked in `package-lock.json`, not fetched at runtime from a CDN. See `specs/003-monitoring/ASSETS.md` for hashes and reproduction instructions. No camera frames or microphone recordings are uploaded to these projects.
