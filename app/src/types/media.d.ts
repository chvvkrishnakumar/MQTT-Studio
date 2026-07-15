interface HTMLVideoElement {
  captureStream?(frameRate?: number): MediaStream;
  mozCaptureStream?(frameRate?: number): MediaStream;
}

interface HTMLCanvasElement {
  captureStream?(frameRate?: number): MediaStream;
}