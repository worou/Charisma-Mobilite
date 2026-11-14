import React, { useCallback, useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';
import {
  Bus, ScanLine, CheckCircle2, AlertTriangle, XCircle, Loader2, Users, Keyboard, Camera, MapPin, ArrowRight,
} from 'lucide-react';
import { useApp } from './context.jsx';

const formatDate = (iso) =>
  new Date(`${iso}T12:00`).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

// validated_at est un horodatage UTC « AAAA-MM-JJ HH:MM:SS »
const formatTime = (ts) =>
  new Date(`${ts.replace(' ', 'T')}Z`).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

const fullName = (t) => [t.user_first_name, t.user_name].filter(Boolean).join(' ');

const cameraError = (err) => {
  if (!navigator.mediaDevices?.getUserMedia) return 'La caméra nécessite une connexion sécurisée (https).';
  if (err?.name === 'NotAllowedError') return "Autorisez l'accès à la caméra dans votre navigateur pour scanner les billets.";
  if (err?.name === 'NotFoundError') return 'Aucune caméra détectée sur cet appareil.';
  return "Impossible d'ouvrir la caméra.";
};

// Lit les QR codes avec la caméra arrière ; s'arrête dès qu'un code est lu (onScan)
function QrScanner({ onScan }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;
  const [error, setError] = useState(null);
  const [starting, setStarting] = useState(true);

  useEffect(() => {
    let stream;
    let frame;
    let stopped = false;

    (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error('insecure');
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
        if (stopped) return;
        const video = videoRef.current;
        video.srcObject = stream;
        await video.play();
        setStarting(false);
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        const tick = () => {
          if (stopped) return;
          if (video.readyState >= 2 && video.videoWidth) {
            // Image réduite : le décodage reste fluide sur les téléphones modestes
            const scale = Math.min(1, 640 / video.videoWidth);
            canvas.width = Math.round(video.videoWidth * scale);
            canvas.height = Math.round(video.videoHeight * scale);
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const code = jsQR(data, width, height, { inversionAttempts: 'dontInvert' });
            if (code?.data) {
              onScanRef.current(code.data);
              return;
            }
          }
          frame = requestAnimationFrame(tick);
        };
        tick();
      } catch (err) {
        if (!stopped) {
          setError(cameraError(err));
          setStarting(false);
        }
      }
    })();

    return () => {
      stopped = true;
      cancelAnimationFrame(frame);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  if (error) {
    return (
      <div className="aspect-square max-w-sm mx-auto rounded-2xl bg-gray-100 flex flex-col items-center justify-center gap-3 p-6 text-center">
        <Camera className="w-10 h-10 text-gray-400" />
        <p className="text-sm text-gray-600">{error}</p>
        <p className="text-xs text-gray-400">Vous pouvez aussi saisir le code du billet ci-dessous.</p>
      </div>
    );
  }

  return (
    <div className="relative aspect-square max-w-sm mx-auto rounded-2xl overflow-hidden bg-black">
      <video ref={videoRef} playsInline muted className="w-full h-full object-cover" />
      <canvas ref={canvasRef} className="hidden" />
      {/* Cadre de visée */}
      <div className="absolute inset-[15%] rounded-2xl border-4 border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
      {starting && (
        <div className="absolute inset-0 flex items-center justify-center text-white">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      )}
    </div>
  );
}

// Résultat d'un scan : vert (validé), orange (déjà validé), rouge (refusé)
function ScanResult({ result, onNext }) {
  const { status, data } = result;
  const t = data.ticket;
  const style =
    status === 'valid' ? { box: 'bg-green-50 border-green-300 text-green-900', Icon: CheckCircle2, icon: 'text-green-600', title: 'Billet validé' }
    : status === 'already' ? { box: 'bg-amber-50 border-amber-300 text-amber-900', Icon: AlertTriangle, icon: 'text-amber-600', title: 'Billet déjà validé' }
    : { box: 'bg-red-50 border-red-300 text-red-900', Icon: XCircle, icon: 'text-red-600', title: 'Billet refusé' };

  return (
    <div role="status" className={`max-w-sm mx-auto rounded-2xl border-2 p-6 text-center ${style.box}`}>
      <style.Icon className={`w-16 h-16 mx-auto mb-3 ${style.icon}`} />
      <p className="text-2xl font-bold">{style.title}</p>
      {t && (
        <div className="mt-3 space-y-1">
          <p className="text-lg font-semibold">{fullName(t)}</p>
          <p className="text-3xl font-extrabold">{t.seats} place{t.seats > 1 ? 's' : ''}</p>
          <p className="text-sm opacity-80">Ligne « {t.line_name} » · {formatDate(t.service_date)}</p>
          {status === 'already' && t.validated_at && (
            <p className="text-sm font-medium">Déjà scanné à {formatTime(t.validated_at)}</p>
          )}
        </div>
      )}
      {status === 'error' && <p className="mt-3 text-sm font-medium">{data.error}</p>}
      <button
        type="button"
        onClick={onNext}
        autoFocus
        className="mt-5 w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
      >
        <ScanLine className="w-5 h-5" /> Scanner le billet suivant
      </button>
    </div>
  );
}

export default function DriverPage() {
  const { token, user, isAuthenticated, setCurrentPage } = useApp();
  const [lines, setLines] = useState(null);
  const [date, setDate] = useState(null);
  const [lineId, setLineId] = useState(null);
  const [passengers, setPassengers] = useState([]);
  const [result, setResult] = useState(null); // { status: 'valid' | 'already' | 'error', data }
  const [checking, setChecking] = useState(false);
  const [manualCode, setManualCode] = useState('');

  const headers = { Authorization: `Bearer ${token}` };

  const loadLines = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/driver/lines', { headers: { Authorization: `Bearer ${token}` } });
      const data = res.ok ? await res.json() : { lines: [] };
      setLines(data.lines);
      setDate(data.date);
      setLineId((current) => current ?? data.lines[0]?.id ?? null);
    } catch {
      setLines([]);
    }
  }, [token]);

  const loadPassengers = useCallback(async () => {
    if (!token || !lineId) return;
    const res = await fetch(`/api/driver/lines/${lineId}/passengers`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => null);
    if (res?.ok) setPassengers(await res.json());
  }, [token, lineId]);

  useEffect(() => { loadLines(); }, [loadLines]);
  useEffect(() => { loadPassengers(); }, [loadPassengers]);

  const validate = async (code) => {
    if (checking) return;
    setChecking(true);
    try {
      const res = await fetch('/api/driver/validate', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      const data = await res.json().catch(() => ({ error: 'Réponse invalide du serveur' }));
      setResult({ status: res.ok ? 'valid' : data.already_validated ? 'already' : 'error', data });
      navigator.vibrate?.(res.ok ? 150 : [80, 60, 80]);
      if (res.ok) {
        loadLines();
        loadPassengers();
      }
    } catch {
      setResult({ status: 'error', data: { error: 'Impossible de contacter le serveur' } });
    } finally {
      setChecking(false);
    }
  };

  const submitManual = (e) => {
    e.preventDefault();
    if (manualCode.trim()) validate(manualCode.trim());
    setManualCode('');
  };

  if (!isAuthenticated) {
    return (
      <div className="p-8 text-center">
        <h1 className="text-2xl font-bold mb-4">Connectez-vous pour accéder à l'espace chauffeur</h1>
        <button onClick={() => setCurrentPage('login')} className="text-purple-600 font-semibold">Se connecter</button>
      </div>
    );
  }

  if (lines === null) return <div className="p-8 text-center text-gray-500">Chargement…</div>;

  if (lines.length === 0) {
    return (
      <div className="max-w-lg mx-auto p-8 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-purple-50 flex items-center justify-center">
          <Bus className="w-8 h-8 text-purple-600" />
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">Aucune ligne attribuée</h1>
        <p className="text-gray-600">L'administration ne vous a pas encore attribué de ligne de bus.</p>
      </div>
    );
  }

  const selected = lines.find((l) => l.id === lineId) ?? lines[0];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Espace chauffeur</h1>
          <p className="text-gray-600 mt-1">
            Bonjour {user?.first_name || user?.name}, scannez les billets des voyageurs à la montée · {date && formatDate(date)}
          </p>
        </div>

        {/* Scanner */}
        <section className="bg-white rounded-2xl border border-purple-100 shadow-sm p-5 space-y-4">
          <h2 className="flex items-center gap-2 text-lg font-bold text-gray-900">
            <ScanLine className="w-5 h-5 text-purple-600" /> Scanner un billet
          </h2>
          {checking ? (
            <div className="aspect-square max-w-sm mx-auto rounded-2xl bg-gray-100 flex items-center justify-center">
              <Loader2 className="w-10 h-10 text-purple-600 animate-spin" />
            </div>
          ) : result ? (
            <ScanResult result={result} onNext={() => setResult(null)} />
          ) : (
            <QrScanner onScan={validate} />
          )}
          <form onSubmit={submitManual} className="max-w-sm mx-auto flex gap-2">
            <div className="relative flex-1">
              <Keyboard className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="Ou saisir le code du billet"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
              />
            </div>
            <button type="submit" disabled={checking} className="px-4 py-2.5 rounded-xl bg-purple-600 text-white text-sm font-semibold hover:bg-purple-700 disabled:opacity-60">
              Valider
            </button>
          </form>
        </section>

        {/* Lignes et voyageurs du jour */}
        <section className="space-y-3">
          {lines.length > 1 && (
            <div className="flex flex-wrap gap-2">
              {lines.map((l) => (
                <button
                  key={l.id}
                  onClick={() => setLineId(l.id)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium ${l.id === selected.id ? 'bg-purple-600 text-white' : 'bg-white border text-gray-700 hover:border-purple-300'}`}
                >
                  {l.name}
                </button>
              ))}
            </div>
          )}

          <div className="bg-white rounded-2xl border border-purple-100 shadow-sm p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="flex items-center gap-2 font-bold text-gray-900">
                  <Bus className="w-5 h-5 text-purple-600" /> Ligne « {selected.name} »
                  {!selected.active && <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 text-xs font-medium">Inactive</span>}
                </p>
                {selected.stops.length > 0 && (
                  <p className="flex flex-wrap items-center gap-1 text-sm text-gray-500 mt-1">
                    <MapPin className="w-4 h-4 text-purple-400" />
                    {selected.stops.map((s, i) => (
                      <span key={i} className="flex items-center gap-1">
                        {i > 0 && <ArrowRight className="w-3 h-3 text-gray-300" />}
                        {s}
                      </span>
                    ))}
                  </p>
                )}
              </div>
              <div className="text-right">
                <p className="text-2xl font-extrabold text-gray-900">{selected.boarded}/{selected.reserved}</p>
                <p className="text-xs text-gray-500">places montées / réservées</p>
              </div>
            </div>

            <ul className="mt-4 divide-y divide-gray-100">
              {passengers.map((p) => (
                <li key={p.id} className="flex items-center justify-between py-2.5">
                  <span className="flex items-center gap-2 text-sm text-gray-900">
                    <Users className="w-4 h-4 text-gray-400" /> {fullName(p)} · {p.seats} place{p.seats > 1 ? 's' : ''}
                  </span>
                  {p.validated_at ? (
                    <span className="flex items-center gap-1 text-xs font-medium text-green-700">
                      <CheckCircle2 className="w-4 h-4" /> Monté à {formatTime(p.validated_at)}
                    </span>
                  ) : (
                    <span className="text-xs font-medium text-gray-400">En attente</span>
                  )}
                </li>
              ))}
              {passengers.length === 0 && (
                <li className="py-6 text-center text-sm text-gray-400">Aucune réservation aujourd'hui sur cette ligne</li>
              )}
            </ul>
          </div>
        </section>
      </div>
    </div>
  );
}
