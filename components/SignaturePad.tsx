"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { putPhoto } from "@/lib/db";
import type { LocalPhoto } from "@/lib/images";

type Props = {
  onSign: (photo: LocalPhoto | null) => void;
};

const STROKE_WIDTH = 3;
const STROKE_COLOR = "#1A1A1A";
const BG_COLOR = "#FFFFFF";

export default function SignaturePad({ onSign }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const hasStrokes = useRef(false);
  const [inked, setInked] = useState(false);
  const [signed, setSigned] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  // Resize canvas to container, preserving content.
  const resize = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const data = canvas.toDataURL();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(0, 0, rect.width, rect.height);
    // Redraw existing strokes if any.
    if (hasStrokes.current) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, rect.width, rect.height);
      };
      img.src = data;
    }
  }, []);

  useEffect(() => {
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [resize]);

  function getPos(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }

  function startStroke(e: React.PointerEvent<HTMLCanvasElement>) {
    drawing.current = true;
    setInked(true);
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const pos = getPos(e);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.lineWidth = STROKE_WIDTH;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = STROKE_COLOR;
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }

  function continueStroke(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const pos = getPos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    hasStrokes.current = true;
  }

  function endStroke() {
    drawing.current = false;
  }

  function clearPad() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const rect = canvas.getBoundingClientRect();
    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(0, 0, rect.width, rect.height);
    hasStrokes.current = false;
    setInked(false);
    setSigned(false);
    setPreview(null);
    onSign(null);
  }

  async function saveSig() {
    const canvas = canvasRef.current;
    if (!canvas || !hasStrokes.current) return;
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), "image/png"),
    );
    if (!blob) return;
    const id = await putPhoto(blob);
    const photo: LocalPhoto = { id, blob, url: URL.createObjectURL(blob) };
    setPreview(photo.url);
    setSigned(true);
    onSign(photo);
  }

  return (
    <div className="sig-pad-wrap">
      <div className="sig-pad-border">
        <canvas
          ref={canvasRef}
          className="sig-pad-canvas"
          onPointerDown={startStroke}
          onPointerMove={continueStroke}
          onPointerUp={endStroke}
          onPointerLeave={endStroke}
        />
        {!signed && !inked && (
          <span className="sig-pad-placeholder">Draw your signature above</span>
        )}
        {preview && (
          <div className="sig-pad-preview">
            <img src={preview} alt="Signature preview" />
          </div>
        )}
      </div>
      <div className="sig-pad-actions">
        <button type="button" className="btn btn-ghost btn-small" onClick={clearPad}>
          ✕ Clear
        </button>
        {!signed && (
          <button type="button" className="btn btn-ghost btn-small" onClick={saveSig}>
            ✓ Save signature
          </button>
        )}
        {signed && (
          <span className="sig-status">Signed ✓</span>
        )}
      </div>
    </div>
  );
}
