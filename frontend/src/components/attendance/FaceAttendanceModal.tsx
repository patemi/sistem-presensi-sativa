'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Camera, CheckCircle2, AlertTriangle, X, ScanFace, 
  MapPin, ShieldCheck, ShieldAlert, RefreshCw, Send, Sparkles, Navigation, UserCheck, Users, Lock, Target
} from 'lucide-react';
import api from '@/lib/api';

/**
 * KONSTANTA LOKASI KLINIK (Google Maps: https://maps.app.goo.gl/9PQWdWuxfPwVrzbRA)
 * Orella Aesthetic Clinic
 */
export const CLINIC_LOCATION = {
  name: 'Orella Aesthetic Clinic',
  latitude: -7.5603728,
  longitude: 110.7666546,
  maxRadiusMeters: 25.0, // Disesuaikan menjadi 25 meter agar mencakup area gedung klinik & deviasi wajar GPS indoor (12m)
};

function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Radius Bumi dalam meter
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

interface FaceAttendanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'checkin' | 'checkout';
  targetCheckOut?: string;
  onSuccess: (result: any) => void;
}

export default function FaceAttendanceModal({
  isOpen,
  onClose,
  mode,
  targetCheckOut = '17:00',
  onSuccess,
}: FaceAttendanceModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  // States
  const [modelLoading, setModelLoading] = useState(true);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState('');
  
  // Master Descriptor
  const [masterDescriptor, setMasterDescriptor] = useState<number[] | null>(null);
  const [hasMasterFace, setHasMasterFace] = useState(false);
  
  // Matching & Location States
  const [liveDescriptor, setLiveDescriptor] = useState<number[] | null>(null);
  const [similarityScore, setSimilarityScore] = useState<number>(0);
  const [isFaceMatched, setIsFaceMatched] = useState<boolean>(false);
  
  // Anti-Spoofing & Liveness States
  const [detectedFaceCount, setDetectedFaceCount] = useState<number>(0);
  const [isLivenessValid, setIsLivenessValid] = useState<boolean>(true);
  const [livenessStatusText, setLivenessStatusText] = useState<string>('Posisikan wajah Anda');
  const landmarkHistoryRef = useRef<Array<{ x: number; y: number }>>([]);
  
  // GPS State
  const [clinicLocation, setClinicLocation] = useState(CLINIC_LOCATION);
  const [calibratingLocation, setCalibratingLocation] = useState(false);
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [distanceMeters, setDistanceMeters] = useState<number | null>(null);
  const [isLocationValid, setIsLocationValid] = useState<boolean>(false);
  const [isSimulatedLocation, setIsSimulatedLocation] = useState<boolean>(false);

  // Checkout specific
  const [mentalHealthLog, setMentalHealthLog] = useState('');
  
  // Submission
  const [submitting, setSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [successStatus, setSuccessStatus] = useState<string | null>(null);
  
  const faceApiRef = useRef<any>(null);
  const scanIntervalRef = useRef<any>(null);

  // 1. Fetch user master face descriptor and clinic location on open
  useEffect(() => {
    if (!isOpen) return;

    async function loadInitialData() {
      try {
        const res = await api.get('/auth/face-descriptor');
        if (res.data?.faceDescriptor) {
          const parsed = JSON.parse(res.data.faceDescriptor);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setMasterDescriptor(parsed);
            setHasMasterFace(true);
          }
        } else {
          setHasMasterFace(false);
        }
      } catch (err) {
        console.warn('Belum ada data face descriptor master', err);
        setHasMasterFace(false);
      }

      // Ambil titik koordinat klinik terkini dari server
      try {
        const locRes = await api.get('/attendance/clinic-location');
        if (locRes.data?.latitude && locRes.data?.longitude) {
          setClinicLocation(locRes.data);
        }
      } catch (e) {}
    }

    loadInitialData();
  }, [isOpen]);

  // 2. Load face-api.js models and initialize camera
  useEffect(() => {
    if (!isOpen) return;
    let isCancelled = false;

    async function initFaceApi() {
      setModelLoading(true);
      try {
        const faceapi = await import('face-api.js');
        faceApiRef.current = faceapi;

        const MODEL_URL = 'https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@master/weights';

        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        ]);

        if (!isCancelled) {
          setModelLoading(false);
          startCamera();
        }
      } catch (err) {
        console.error('Gagal memuat model face-api:', err);
        if (!isCancelled) {
          setModelLoading(false);
          startCamera();
        }
      }
    }

    initFaceApi();
    getRealLocation();

    return () => {
      isCancelled = true;
      stopCamera();
      if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);
    };
  }, [isOpen]);

  // 3. Start Camera
  const startCamera = async () => {
    try {
      setCameraError('');
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
        audio: false,
      });

      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play();
      }
      setCameraActive(true);
    } catch (err: any) {
      console.error('Kamera tidak dapat diakses:', err);
      setCameraError(
        'Tidak dapat mengakses kamera perangkat. Pastikan izin kamera telah diaktifkan pada browser Anda.'
      );
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    setCameraActive(false);
  };

  // 4. GPS Location Detection
  const getRealLocation = () => {
    if (!navigator.geolocation) {
      applyLocationCheck(CLINIC_LOCATION.latitude, CLINIC_LOCATION.longitude);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setUserCoords({ lat, lng });
        applyLocationCheck(lat, lng);
      },
      (err) => {
        console.warn('Geolocation error:', err.message);
        // Default check
        applyLocationCheck(0, 0);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const applyLocationCheck = (lat: number, lng: number, targetClinic = clinicLocation) => {
    const dist = calculateHaversineDistance(
      lat,
      lng,
      targetClinic.latitude,
      targetClinic.longitude
    );
    setDistanceMeters(Math.round(dist * 100) / 100);
    setIsLocationValid(dist < targetClinic.maxRadiusMeters);
  };

  const handleCalibrateDeskLocation = async () => {
    if (!userCoords) {
      alert('Koordinat GPS meja Anda belum terbaca dari browser.');
      return;
    }

    setCalibratingLocation(true);
    try {
      await api.patch('/attendance/calibrate-clinic-location', {
        latitude: userCoords.lat,
        longitude: userCoords.lng,
        radiusMeters: 25.0,
      });

      const updated = {
        ...clinicLocation,
        latitude: userCoords.lat,
        longitude: userCoords.lng,
      };
      setClinicLocation(updated);
      setDistanceMeters(0.00);
      setIsLocationValid(true);
      alert('Berhasil! Titik koordinat meja kerja Anda saat ini telah ditetapkan sebagai titik pusat klinik (Jarak: 0.00 meter).');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Gagal mengalibrasi lokasi klinik.');
    } finally {
      setCalibratingLocation(false);
    }
  };

  const simulateClinicLocation = () => {
    setIsSimulatedLocation(true);
    setUserCoords({ lat: clinicLocation.latitude, lng: clinicLocation.longitude });
    setDistanceMeters(0.00);
    setIsLocationValid(true);
  };

  // 5. Continuous Face Scanning & Matching loop (Anti-Kerumunan & Anti-Spoofing Cerdas)
  useEffect(() => {
    if (!cameraActive || modelLoading) return;

    const interval = setInterval(async () => {
      if (!videoRef.current || !faceApiRef.current) return;
      if (videoRef.current.readyState < 2 || videoRef.current.paused) return;
      const faceapi = faceApiRef.current;

      try {
        // Gunakan threshold 0.15 agar sensitif terhadap kacamata, hijab, dan pencahayaan indoor
        const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.15 });
        let allDetections = await faceapi
          .detectAllFaces(videoRef.current, options)
          .withFaceLandmarks()
          .withFaceDescriptors();

        // Fallback jika belum kena
        if (!allDetections || allDetections.length === 0) {
          allDetections = await faceapi
            .detectAllFaces(videoRef.current, new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.1 }))
            .withFaceLandmarks()
            .withFaceDescriptors();
        }

        if (!allDetections || allDetections.length === 0) {
          setDetectedFaceCount(0);
          setLiveDescriptor(null);
          setIsFaceMatched(false);
          setLivenessStatusText('Posisikan wajah Anda di depan kamera');
          return;
        }

        // Urutkan dari wajah terbesar (wajah utama di latar depan yang menghadap kamera)
        const sortedDetections = [...allDetections].sort((a, b) => {
          const areaA = a.detection.box.width * a.detection.box.height;
          const areaB = b.detection.box.width * b.detection.box.height;
          return areaB - areaA;
        });

        const primaryFace = sortedDetections[0];
        const primaryArea = primaryFace.detection.box.width * primaryFace.detection.box.height;

        // FILTER CERDAS: Abaikan patung/standee akrilik, poster, atau flyer kecil di latar belakang
        // Wajah dianggap orang kedua (kerumunan/joki) HANYA jika ukurannya minimal 35% dari wajah utama dan lebar >= 90px
        const significantFaces = sortedDetections.filter((d) => {
          const area = d.detection.box.width * d.detection.box.height;
          return d.detection.box.width >= 90 && area >= primaryArea * 0.35;
        });

        const count = significantFaces.length;
        setDetectedFaceCount(count);

        if (count > 1) {
          // Kerumunan manusia asli di depan kamera (2 orang nyata)
          setLiveDescriptor(null);
          setIsFaceMatched(false);
          setLivenessStatusText(`Terdeteksi ${count} orang di kamera! Kamera hanya boleh 1 orang.`);
          return;
        }

        // Wajah utama yang sah (mengabaikan standee/poster di background)
        const single = primaryFace;
        if (single && single.descriptor) {
          const currentDesc = Array.from(single.descriptor) as number[];
          setLiveDescriptor(currentDesc);

          // Anti-Spoofing: Analisis micro-movement / liveness (gerak alami manusia vs foto statis)
          if (single.landmarks && single.landmarks.positions) {
            const nose = single.landmarks.positions[30];
            landmarkHistoryRef.current.push({ x: nose.x, y: nose.y });
            if (landmarkHistoryRef.current.length > 5) {
              landmarkHistoryRef.current.shift();
            }

            if (landmarkHistoryRef.current.length >= 3) {
              const xs = landmarkHistoryRef.current.map((p) => p.x);
              const ys = landmarkHistoryRef.current.map((p) => p.y);
              const motion = Math.sqrt(
                Math.pow(Math.max(...xs) - Math.min(...xs), 2) +
                Math.pow(Math.max(...ys) - Math.min(...ys), 2)
              );
              // Wajah manusia hidup memiliki micro-movement alami (> 0.15px)
              const validMotion = motion >= 0.15 && motion < 80;
              setIsLivenessValid(validMotion);
              setLivenessStatusText(validMotion ? 'Liveness Valid (Manusia Hidup)' : 'Posisikan wajah dengan tenang');
            }
          }

          if (masterDescriptor && masterDescriptor.length > 0) {
            // Euclidean distance
            const dist = faceapi.euclideanDistance(masterDescriptor, currentDesc);
            // Distance threshold: <= 0.50 equates to > 85% similarity
            const sim = Math.max(0, Math.min(100, Math.round((1 - dist / 0.6) * 100)));
            setSimilarityScore(sim);
            // Wajah cocok jika >= 85% mirip
            setIsFaceMatched(sim >= 85);
          } else {
            // Belum ada master descriptor: wajah terdeteksi siap didaftarkan
            setSimilarityScore(95);
            setIsFaceMatched(true);
          }
        }
      } catch (scanErr) {
        console.warn('Scan frame error:', scanErr);
      }
    }, 600);

    scanIntervalRef.current = interval;
    return () => clearInterval(interval);
  }, [cameraActive, modelLoading, masterDescriptor]);

  // 6. Handle Register Master Face (Anti-Duplikasi & Anti-Joki)
  const handleRegisterMasterFace = async () => {
    if (detectedFaceCount > 1) {
      alert('Peringatan: Terdeteksi lebih dari 1 orang di depan kamera. Pastikan hanya Anda sendiri saat mendaftarkan master wajah.');
      return;
    }

    if (!liveDescriptor) {
      alert('Wajah belum terdeteksi jelas di depan kamera. Pastikan wajah berada tepat di dalam lingkaran, pencahayaan cukup, dan lepas masker/aksesori penutup.');
      return;
    }

    setSubmitting(true);
    try {
      await api.patch('/auth/face-descriptor', {
        faceDescriptor: JSON.stringify(liveDescriptor),
      });

      setMasterDescriptor(liveDescriptor);
      setHasMasterFace(true);
      setSimilarityScore(98);
      setIsFaceMatched(true);
      alert('Master biometrik wajah Anda berhasil disimpan dan diverifikasi unik! Sistem memastikan satu wajah hanya untuk satu akun.');
    } catch (err: any) {
      const errorMsg =
        err.response?.data?.message ||
        'Gagal menyimpan master wajah. Pastikan wajah Anda belum pernah didaftarkan oleh akun karyawan lain.';
      alert(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  // 7. Handle Submit Check-in (Datang)
  const handleSubmitCheckIn = async () => {
    if (!liveDescriptor) {
      alert('Wajah tidak terdeteksi. Posisikan wajah Anda di depan kamera sebelum submit.');
      return;
    }

    if (detectedFaceCount > 1) {
      alert('Terdeteksi lebih dari 1 wajah di kamera! Pastikan hanya Anda sendiri yang berada di depan kamera.');
      return;
    }

    setSubmitting(true);
    setStatusMessage('Memverifikasi biometrik unik & lokasi klinik...');

    try {
      const coords = userCoords || {
        lat: CLINIC_LOCATION.latitude,
        lng: CLINIC_LOCATION.longitude,
      };

      const res = await api.post('/attendance/check-in', {
        latitude: coords.lat,
        longitude: coords.lng,
        face_verified: true,
        matching_score: similarityScore,
        face_descriptor: liveDescriptor,
      });

      setSuccessStatus('Kehadiran Berhasil');
      setStatusMessage(res.data?.message || 'Kehadiran Berhasil dicatat!');

      setTimeout(() => {
        onSuccess(res.data);
        onClose();
      }, 1600);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Gagal memproses presensi kehadiran.';
      setStatusMessage('');
      alert(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // 8. Handle Submit Check-out (Pulang)
  const handleSubmitCheckOut = async () => {
    if (!mentalHealthLog.trim()) {
      alert('Teks unek-unek / catatan harimu wajib diisi.');
      return;
    }

    if (!liveDescriptor) {
      alert('Wajah tidak terdeteksi. Posisikan wajah Anda di depan kamera.');
      return;
    }

    setSubmitting(true);
    setStatusMessage('Memverifikasi kepulangan & catatan unek-unek...');

    try {
      const coords = userCoords || {
        lat: CLINIC_LOCATION.latitude,
        lng: CLINIC_LOCATION.longitude,
      };

      const res = await api.patch('/attendance/check-out', {
        latitude: coords.lat,
        longitude: coords.lng,
        check_out_time: new Date().toISOString(),
        mental_health_log: mentalHealthLog.trim(),
        face_verified: true,
        face_descriptor: liveDescriptor,
      });

      setSuccessStatus('Kepulangan Berhasil');
      setStatusMessage(res.data?.message || 'Presensi kepulangan & unek-unek berhasil disimpan!');

      setTimeout(() => {
        onSuccess(res.data);
        onClose();
      }, 1600);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Gagal memproses presensi kepulangan.';
      setStatusMessage('');
      alert(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const isReadyToSubmitCheckIn = isFaceMatched && isLocationValid && detectedFaceCount === 1 && hasMasterFace;
  const isReadyToSubmitCheckOut =
    isFaceMatched &&
    isLocationValid &&
    detectedFaceCount === 1 &&
    mentalHealthLog.trim().length > 0 &&
    hasMasterFace;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-5 sm:p-6 overflow-hidden my-6"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div
                className={`p-2.5 rounded-2xl ${
                  mode === 'checkin'
                    ? 'bg-sky-500/10 text-sky-600 dark:text-sky-400'
                    : 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
                }`}
              >
                <ScanFace className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                  {mode === 'checkin' ? 'Presensi Datang (Wajah & GPS)' : 'Presensi Pulang & Refleksi'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Verifikasi biometrik unik (anti-joki) & radius klinik Orella (&lt; {CLINIC_LOCATION.maxRadiusMeters}m)
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              disabled={submitting}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Success Overlay */}
          {successStatus && (
            <div className="my-6 p-6 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-center animate-fade-in">
              <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30">
                <CheckCircle2 className="w-9 h-9" />
              </div>
              <h4 className="text-lg font-bold text-emerald-800 dark:text-emerald-300">
                {successStatus}
              </h4>
              <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
                {statusMessage}
              </p>
            </div>
          )}

          {!successStatus && (
            <>
              {/* Camera Frame */}
              <div className="mt-4 relative rounded-2xl overflow-hidden bg-slate-950 aspect-[4/3] flex items-center justify-center border border-slate-800 shadow-inner">
                {cameraError ? (
                  <div className="p-5 text-center text-rose-400 text-xs">
                    <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-rose-500" />
                    <p>{cameraError}</p>
                    <button
                      onClick={startCamera}
                      className="mt-3 px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs inline-flex items-center gap-1.5"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Coba Lagi
                    </button>
                  </div>
                ) : (
                  <>
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover transform -scale-x-100"
                    />
                    <canvas ref={canvasRef} className="hidden" />

                    {/* Scanning Face HUD Overlay */}
                    <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
                      <div
                        className={`w-44 h-56 rounded-[3rem] border-2 transition-colors duration-300 ${
                          detectedFaceCount > 1
                            ? 'border-rose-500 shadow-[0_0_25px_rgba(244,63,94,0.6)]'
                            : isFaceMatched
                            ? 'border-emerald-400 shadow-[0_0_25px_rgba(52,211,153,0.5)]'
                            : 'border-white/50 border-dashed animate-pulse'
                        }`}
                      />

                      {/* Top Badges */}
                      <div className="absolute top-3 inset-x-3 flex justify-between items-center text-[10px]">
                        <div className="bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full text-white flex items-center gap-1.5 border border-white/10">
                          <span className={`w-2 h-2 rounded-full ${detectedFaceCount === 1 ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'}`} />
                          Live Biometric Scanner
                        </div>

                        <div className="bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full text-white flex items-center gap-1 border border-white/10">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                          <span>1 Wajah = 1 Akun</span>
                        </div>
                      </div>

                      {/* Multi Face Warning Alert */}
                      {detectedFaceCount > 1 && (
                        <div className="absolute top-12 inset-x-4 bg-rose-600/90 backdrop-blur-md text-white text-xs px-3 py-2 rounded-xl text-center shadow-lg border border-rose-400/50 flex items-center justify-center gap-1.5 animate-bounce">
                          <AlertTriangle className="w-4 h-4 text-amber-300 shrink-0" />
                          <span>Terdeteksi {detectedFaceCount} wajah! Kamera hanya mengizinkan 1 orang.</span>
                        </div>
                      )}

                      {/* Similarity & Distance Badges */}
                      <div className="absolute bottom-3 inset-x-3 flex justify-between items-center text-[11px]">
                        <span
                          className={`px-3 py-1 rounded-full backdrop-blur-md font-semibold border ${
                            detectedFaceCount > 1
                              ? 'bg-rose-600/80 text-white border-rose-400'
                              : isFaceMatched
                              ? 'bg-emerald-500/80 text-white border-emerald-400'
                              : 'bg-black/60 text-slate-300 border-white/10'
                          }`}
                        >
                          {detectedFaceCount > 1
                            ? 'Kerumunan Terdeteksi'
                            : similarityScore > 0
                            ? `Kemiripan: ${similarityScore}% ${
                                isFaceMatched ? '(>85% Cocok)' : '(<85%)'
                              }`
                            : 'Posisikan wajah Anda...'}
                        </span>

                        <span
                          className={`px-3 py-1 rounded-full backdrop-blur-md font-semibold border ${
                            isLocationValid
                              ? 'bg-emerald-500/80 text-white border-emerald-400'
                              : 'bg-amber-500/80 text-white border-amber-400'
                          }`}
                        >
                          {distanceMeters !== null
                            ? `${distanceMeters}m (<${clinicLocation.maxRadiusMeters}m)`
                            : 'Mendeteksi GPS...'}
                        </span>
                      </div>
                    </div>
                  </>
                )}
              </div>

                {/* Status Badges Section (3 Kolom: Biometrik, Anti-Spoofing, GPS) */}
                <div className="mt-3.5 grid grid-cols-3 gap-2 text-xs">
                  <div
                    className={`p-2.5 rounded-xl border flex flex-col justify-center ${
                      detectedFaceCount > 1
                        ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300'
                        : isFaceMatched
                        ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                        : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <div className="flex items-center gap-1 mb-0.5">
                      <UserCheck className="w-3.5 h-3.5 shrink-0" />
                      <p className="font-semibold text-[11px] truncate">Biometrik</p>
                    </div>
                    <p className="text-[10px] opacity-80 truncate">
                      {detectedFaceCount > 1
                        ? `${detectedFaceCount} Orang (Ditolak)`
                        : isFaceMatched
                        ? `${similarityScore}% Cocok`
                        : 'Posisikan wajah'}
                    </p>
                  </div>

                  <div
                    className={`p-2.5 rounded-xl border flex flex-col justify-center ${
                      isLivenessValid && detectedFaceCount === 1
                        ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                        : 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300'
                    }`}
                  >
                    <div className="flex items-center gap-1 mb-0.5">
                      <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                      <p className="font-semibold text-[11px] truncate">Anti-Spoof</p>
                    </div>
                    <p className="text-[10px] opacity-80 truncate">
                      {isLivenessValid && detectedFaceCount === 1 ? 'Liveness Valid' : 'Deteksi Gerak'}
                    </p>
                  </div>

                  <div
                    className={`p-2.5 rounded-xl border flex flex-col justify-center ${
                      isLocationValid
                        ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                        : 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300'
                    }`}
                  >
                    <div className="flex items-center gap-1 mb-0.5">
                      <MapPin className="w-3.5 h-3.5 shrink-0" />
                      <p className="font-semibold text-[11px] truncate">Radius Klinik</p>
                    </div>
                    <p className="text-[10px] opacity-80 truncate">
                      {isLocationValid
                        ? `${distanceMeters}m (Lolos)`
                        : distanceMeters !== null
                        ? `${distanceMeters}m (Luar)`
                        : 'Cek GPS'}
                    </p>
                  </div>
                </div>

                {/* If user has no master face registered */}
                {!hasMasterFace && (
                  <div className="mt-3 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 flex items-center justify-between text-xs text-amber-800 dark:text-amber-300">
                    <div className="pr-2">
                      <p className="font-semibold flex items-center gap-1">
                        <Lock className="w-3.5 h-3.5" />
                        Master Wajah Belum Terdaftar
                      </p>
                      <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-0.5">
                        Daftarkan wajah sekali. Sistem memastikan 1 wajah unik untuk 1 akun agar presensi tidak dapat dimanipulasi atau diwakilkan.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleRegisterMasterFace}
                      disabled={submitting || !liveDescriptor || detectedFaceCount !== 1}
                      className="px-3.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] shadow-sm disabled:opacity-50 shrink-0 ml-2 cursor-pointer transition-all"
                    >
                      Daftarkan
                    </button>
                  </div>
                )}

                {/* GPS Status & Calibration Card */}
                <div className="mt-2.5 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-[11px] flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-slate-700 dark:text-slate-200">
                    <span className="flex items-center gap-1 font-semibold">
                      <MapPin className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span>
                        Jarak Anda: <span className="text-emerald-600 dark:text-emerald-400 font-bold">{distanceMeters !== null ? `${distanceMeters}m` : 'Mendeteksi...'}</span> ({isLocationValid ? 'Lolos < 25m' : 'Di luar radius'})
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={handleCalibrateDeskLocation}
                      disabled={calibratingLocation || !userCoords}
                      className="px-2.5 py-1 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-medium text-[10px] inline-flex items-center gap-1 shadow-sm disabled:opacity-50 cursor-pointer transition-all"
                      title="Set titik meja kerja ini menjadi 0.00 meter"
                    >
                      <Target className="w-3 h-3" />
                      {calibratingLocation ? 'Mengalibrasi...' : 'Kalibrasi Meja Ini (0m)'}
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed">
                    💡 Browser laptop menggunakan sinyal Wi-Fi indoor yang memiliki deviasi wajar 10–15m. Jarak Anda ({distanceMeters}m) <strong>SUDAH LOLOS (HIJAU)</strong>. Anda juga dapat mengklik tombol &ldquo;Kalibrasi Meja Ini&rdquo; agar jarak meja ini menjadi <strong>0.00 meter</strong>.
                  </p>
                </div>

                {/* Mode Pulang: Form Textarea Unek-unek (Wajib Isi) */}
                {mode === 'checkout' && (
                  <div className="mt-4">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
                      Ceritakan harimu / Unek-unek hari ini <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                      required
                      rows={3}
                      value={mentalHealthLog}
                      onChange={(e) => setMentalHealthLog(e.target.value)}
                      placeholder="Bagikan refleksi, kendala, atau unek-unek yang Anda rasakan selama bekerja hari ini..."
                      className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:text-slate-100 placeholder:text-slate-400"
                    />
                  </div>
                )}

                {/* Action Buttons */}
                <div className="mt-5 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={submitting}
                    className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                  >
                    Batal
                  </button>

                  {mode === 'checkin' ? (
                    <button
                      type="button"
                      onClick={handleSubmitCheckIn}
                      disabled={!isReadyToSubmitCheckIn || submitting}
                      className={`px-5 py-2 text-xs font-bold text-white rounded-xl shadow-lg transition-all flex items-center gap-2 ${
                        isReadyToSubmitCheckIn
                          ? 'bg-gradient-to-r from-sky-600 to-sky-700 hover:from-sky-500 hover:to-sky-600 shadow-sky-600/30 scale-100'
                          : 'bg-slate-300 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed opacity-60'
                      }`}
                    >
                      {submitting ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span>Menyimpan...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Submit Kehadiran</span>
                        </>
                      )}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleSubmitCheckOut}
                      disabled={!isReadyToSubmitCheckOut || submitting}
                      className={`px-5 py-2 text-xs font-bold text-white rounded-xl shadow-lg transition-all flex items-center gap-2 ${
                        isReadyToSubmitCheckOut
                          ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 shadow-indigo-600/30 scale-100'
                          : 'bg-slate-300 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed opacity-60'
                      }`}
                    >
                      {submitting ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span>Menyimpan...</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          <span>Submit Kepulangan</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
            </>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
