import { useEffect, useRef, useState } from 'react';
import { Camera, X, AlertTriangle, Disc, Volume2, Sparkles } from 'lucide-react';
import { Product } from '../types';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (barcode: string) => void;
  products: Product[];
}

export default function BarcodeScannerModal({
  isOpen,
  onClose,
  onScanSuccess,
  products
}: BarcodeScannerModalProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const streamRef = useRef<MediaStream | null>(null);

  // Synthesize checkout beep
  const playBeep = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(1400, audioCtx.currentTime); // high-pitched barcode scanner beep
      gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.12);

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.12);
    } catch (e) {
      console.error('Audio beep failed', e);
    }
  };

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      return;
    }
    startCamera();
    return () => stopCamera();
  }, [isOpen]);

  const startCamera = async () => {
    setErrorMsg('');
    setHasPermission(null);
    try {
      let stream: MediaStream;
      try {
        // Try back/environment-facing camera first
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' }
        });
      } catch (firstErr) {
        console.warn('Environment camera not available, falling back to default camera:', firstErr);
        // Fall back to any default available camera
        stream = await navigator.mediaDevices.getUserMedia({
          video: true
        });
      }
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setHasPermission(true);
      setCameraActive(true);
    } catch (err: any) {
      console.error('Camera access error:', err);
      setHasPermission(false);
      
      let customError = 'Could not access camera. Ensure no other apps are using it, or select a sample product below.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        customError = 'Camera permission denied. Please enable camera access in your browser settings.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        customError = 'No camera device found on this system. You can use the instant hardware scanner simulation options below.';
      } else if (err.name === 'OverconstrainedError') {
        customError = 'The requested camera constraints could not be satisfied by this device.';
      }
      setErrorMsg(customError);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const handleSimulateScan = (barcode: string) => {
    playBeep();
    onScanSuccess(barcode);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="relative w-full max-w-lg overflow-hidden bg-white border border-slate-100 rounded-2xl shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center space-x-2">
            <div className="p-2 text-indigo-600 bg-indigo-50 rounded-lg">
              <Camera className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-950">Active Barcode Scanner</h3>
              <p className="text-xs text-slate-500">Scan physical barcodes or simulate tags</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Camera Viewport */}
        <div className="relative bg-slate-950 flex flex-col items-center justify-center aspect-video sm:aspect-[4/3] overflow-hidden">
          {hasPermission === true && cameraActive ? (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="absolute inset-0 object-cover w-full h-full opacity-80"
              />
              {/* Laser scanning indicator line */}
              <div className="absolute left-0 right-0 h-0.5 bg-red-500 opacity-85 shadow-[0_0_12px_rgba(239,68,68,1)] top-1/2 -translate-y-1/2 animate-[bounce_2s_infinite]" />
              
              {/* Corner brackets overlay */}
              <div className="absolute w-48 h-48 border-2 border-dashed border-indigo-400 rounded-lg opacity-80 flex items-center justify-center">
                <p className="text-xs text-slate-300 font-mono bg-slate-950/70 px-2 py-0.5 rounded backdrop-blur-sm">
                  Align Barcode Inside Box
                </p>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center p-6 text-center text-slate-400">
              <Disc className="w-12 h-12 text-slate-600 animate-spin mb-4" />
              {errorMsg ? (
                <div className="max-w-xs p-3 bg-red-50/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                  <AlertTriangle className="w-5 h-5 mx-auto mb-2 text-red-500" />
                  <p>{errorMsg}</p>
                </div>
              ) : (
                <p className="text-sm">Initializing camera feed...</p>
              )}
            </div>
          )}
        </div>

        {/* Demo simulator box */}
        <div className="p-5 border-t border-slate-100 bg-slate-50 max-h-64 overflow-y-auto">
          <div className="flex items-center space-x-1.5 mb-3">
            <Sparkles className="w-4 h-4 text-indigo-500" />
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Simulate Hardware Scan (Instant Tester)
            </h4>
          </div>
          <p className="text-xs text-slate-500 mb-3">
            Don't have a barcode handy? Click any product item below to trigger a simulated laser-scan beep and add it instantly to your POS basket.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {products.map((p) => (
              <button
                key={p.id}
                onClick={() => handleSimulateScan(p.barcode)}
                className="flex items-center justify-between p-2.5 bg-white border border-slate-200 rounded-xl hover:border-indigo-400 hover:bg-indigo-50 text-left transition group"
              >
                <div className="truncate pr-2">
                  <div className="text-xs font-medium text-slate-800 group-hover:text-indigo-900 truncate">
                    {p.name}
                  </div>
                  <div className="text-[10px] font-mono text-slate-400 group-hover:text-indigo-600">
                    {p.barcode}
                  </div>
                </div>
                <div className="text-xs font-semibold text-slate-700 font-mono group-hover:text-indigo-800 shrink-0">
                  ৳{p.price.toFixed(2)}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
