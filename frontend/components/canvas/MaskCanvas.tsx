"use client";

import { useRef, useEffect, useState, useCallback, forwardRef, useImperativeHandle } from "react";

interface MaskCanvasProps {
  imageSrc: string;
  onMaskChange?: (hasMask: boolean) => void;
}

export interface MaskCanvasHandle {
  generateMaskData: () => string | null;
  clearMask: () => void;
}

const MASK_BLUE_THRESHOLD = 100;

export const MaskCanvas = forwardRef<MaskCanvasHandle, MaskCanvasProps>(
  ({ imageSrc, onMaskChange }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const maskCanvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const imageRef = useRef<HTMLImageElement | null>(null);
    const lastPosRef = useRef<{ x: number; y: number } | null>(null);

    const [isDrawing, setIsDrawing] = useState(false);
    const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
    const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
    const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);
    const [hasMask, setHasMask] = useState(false);
    const [brushSize, setBrushSize] = useState(30);

    // Load image and set canvas size
    useEffect(() => {
      const img = new Image();
      img.onload = () => {
        imageRef.current = img;
        setImageSize({ width: img.naturalWidth, height: img.naturalHeight });

        if (containerRef.current) {
          const containerWidth = containerRef.current.clientWidth;
          const containerHeight = containerRef.current.clientHeight;
          const imgAspect = img.naturalWidth / img.naturalHeight;
          const containerAspect = containerWidth / containerHeight;

          let displayWidth: number;
          let displayHeight: number;

          if (imgAspect > containerAspect) {
            displayWidth = containerWidth;
            displayHeight = containerWidth / imgAspect;
          } else {
            displayHeight = containerHeight;
            displayWidth = containerHeight * imgAspect;
          }

          setCanvasSize({ width: displayWidth, height: displayHeight });
        }
      };
      img.src = imageSrc;
    }, [imageSrc]);

    // Initialize mask canvas
    useEffect(() => {
      const maskCanvas = maskCanvasRef.current;
      if (!maskCanvas || canvasSize.width === 0) return;

      maskCanvas.width = canvasSize.width;
      maskCanvas.height = canvasSize.height;

      const ctx = maskCanvas.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
      }
      setHasMask(false);
      onMaskChange?.(false);
    }, [canvasSize, imageSrc]);

    // Draw the main canvas
    const draw = useCallback(() => {
      const canvas = canvasRef.current;
      const maskCanvas = maskCanvasRef.current;
      const ctx = canvas?.getContext("2d");
      const img = imageRef.current;

      if (!canvas || !ctx || !img) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      // Mask overlay
      if (maskCanvas && hasMask) {
        ctx.save();
        ctx.globalAlpha = 0.5;
        ctx.drawImage(maskCanvas, 0, 0);
        ctx.restore();
      }

      // Brush cursor
      if (cursorPos) {
        ctx.strokeStyle = "#3b82f6";
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.arc(cursorPos.x, cursorPos.y, brushSize / 2, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }, [hasMask, cursorPos, brushSize]);

    useEffect(() => {
      draw();
    }, [draw, canvasSize]);

    const getMousePos = (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };

    const drawOnMask = (x: number, y: number) => {
      const ctx = maskCanvasRef.current?.getContext("2d");
      if (!ctx) return;
      ctx.fillStyle = "rgba(59, 130, 246, 1)";
      ctx.beginPath();
      ctx.arc(x, y, brushSize / 2, 0, Math.PI * 2);
      ctx.fill();
      setHasMask(true);
      onMaskChange?.(true);
    };

    const drawLineOnMask = (x1: number, y1: number, x2: number, y2: number) => {
      const ctx = maskCanvasRef.current?.getContext("2d");
      if (!ctx) return;
      ctx.strokeStyle = "rgba(59, 130, 246, 1)";
      ctx.lineWidth = brushSize;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
      setHasMask(true);
      onMaskChange?.(true);
    };

    const generateMaskData = useCallback(() => {
      const maskCanvas = maskCanvasRef.current;
      if (!maskCanvas || !hasMask) return null;

      const outputCanvas = document.createElement("canvas");
      outputCanvas.width = imageSize.width;
      outputCanvas.height = imageSize.height;
      const ctx = outputCanvas.getContext("2d");
      if (!ctx) return null;

      ctx.fillStyle = "black";
      ctx.fillRect(0, 0, outputCanvas.width, outputCanvas.height);

      const maskCtx = maskCanvas.getContext("2d");
      if (maskCtx) {
        const maskData = maskCtx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);
        const tempCanvas = document.createElement("canvas");
        tempCanvas.width = maskCanvas.width;
        tempCanvas.height = maskCanvas.height;
        const tempCtx = tempCanvas.getContext("2d");
        if (tempCtx) {
          const newImageData = tempCtx.createImageData(maskCanvas.width, maskCanvas.height);
          for (let i = 0; i < maskData.data.length; i += 4) {
            if (maskData.data[i + 2] > MASK_BLUE_THRESHOLD) {
              newImageData.data[i] = 255;
              newImageData.data[i + 1] = 255;
              newImageData.data[i + 2] = 255;
              newImageData.data[i + 3] = 255;
            } else {
              newImageData.data[i] = 0;
              newImageData.data[i + 1] = 0;
              newImageData.data[i + 2] = 0;
              newImageData.data[i + 3] = 255;
            }
          }
          tempCtx.putImageData(newImageData, 0, 0);
          ctx.drawImage(
            tempCanvas,
            0, 0, tempCanvas.width, tempCanvas.height,
            0, 0, imageSize.width, imageSize.height,
          );
        }
      }

      return outputCanvas.toDataURL("image/png");
    }, [hasMask, imageSize]);

    const clearMask = useCallback(() => {
      const maskCanvas = maskCanvasRef.current;
      if (maskCanvas) {
        const ctx = maskCanvas.getContext("2d");
        if (ctx) ctx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
      }
      setHasMask(false);
      onMaskChange?.(false);
      draw();
    }, [draw, onMaskChange]);

    useImperativeHandle(ref, () => ({ generateMaskData, clearMask }), [generateMaskData, clearMask]);

    // Mouse handlers
    const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
      const pos = getMousePos(e);
      setIsDrawing(true);
      lastPosRef.current = pos;
      drawOnMask(pos.x, pos.y);
      draw();
    };

    const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
      const pos = getMousePos(e);
      setCursorPos(pos);
      if (!isDrawing) { draw(); return; }
      if (lastPosRef.current) {
        drawLineOnMask(lastPosRef.current.x, lastPosRef.current.y, pos.x, pos.y);
      }
      lastPosRef.current = pos;
      draw();
    };

    const handleMouseUp = () => {
      setIsDrawing(false);
      lastPosRef.current = null;
    };

    const handleMouseLeave = () => {
      setCursorPos(null);
      if (isDrawing) handleMouseUp();
      draw();
    };

    // Touch handlers
    const getTouchPos = (e: React.TouchEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      const touch = e.touches[0];
      return { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
    };

    const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
      e.preventDefault();
      const pos = getTouchPos(e);
      setIsDrawing(true);
      lastPosRef.current = pos;
      drawOnMask(pos.x, pos.y);
      draw();
    };

    const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
      if (!isDrawing) return;
      e.preventDefault();
      const pos = getTouchPos(e);
      if (lastPosRef.current) {
        drawLineOnMask(lastPosRef.current.x, lastPosRef.current.y, pos.x, pos.y);
      }
      lastPosRef.current = pos;
      draw();
    };

    const handleTouchEnd = (e: React.TouchEvent<HTMLCanvasElement>) => {
      e.preventDefault();
      handleMouseUp();
    };

    const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -5 : 5;
      setBrushSize((s) => Math.max(5, Math.min(100, s + delta)));
    };

    return (
      <div className="space-y-3">
        {/* Brush size control */}
        <div className="flex items-center gap-3 px-1">
          <span className="text-xs text-zinc-500">브러쉬</span>
          <input
            type="range"
            min={5}
            max={100}
            value={brushSize}
            onChange={(e) => setBrushSize(Number(e.target.value))}
            className="flex-1 h-1 accent-cyan-500"
          />
          <span className="text-xs text-zinc-400 w-8 text-right">{brushSize}px</span>
          <button
            onClick={clearMask}
            disabled={!hasMask}
            className="text-xs px-2 py-1 bg-zinc-800 text-zinc-400 rounded hover:bg-zinc-700 disabled:opacity-30"
          >
            초기화
          </button>
        </div>

        {/* Canvas */}
        <div
          ref={containerRef}
          className="relative w-full aspect-[9/16] max-h-[550px] flex items-center justify-center overflow-hidden bg-zinc-950 rounded-xl"
        >
          <canvas ref={maskCanvasRef} className="hidden" />
          <canvas
            ref={canvasRef}
            width={canvasSize.width}
            height={canvasSize.height}
            className="cursor-none rounded-lg"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseLeave}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onWheel={handleWheel}
          />
        </div>

        {/* Instructions */}
        <p className="text-xs text-zinc-600 text-center">
          편집할 영역을 브러쉬로 칠하세요 &middot; 마우스 휠로 브러쉬 크기 조절
        </p>
      </div>
    );
  }
);

MaskCanvas.displayName = "MaskCanvas";
