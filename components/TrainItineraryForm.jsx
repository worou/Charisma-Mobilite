import React, { useEffect, useRef, useState } from 'react';
import {
  MapPin, Calendar, Clock, Church, Navigation, Footprints, Repeat, Loader2, AlertCircle, Train, ChevronDown,
} from 'lucide-react';

const pad = (n) => String(n).padStart(2, '0');
const toISODate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const HOURS = Array.from({ length: 24 }, (_, i) => pad(i));
const MINUTES = Array.from({ length: 12 }, (_, i) => pad(i * 5));

const nextSunday = () => {
  const d = new Date();
  d.setDate(d.getDate() + ((7 - d.getDay()) % 7));
  return toISODate(d);
};

// Les dates Navitia sont déjà en heure de Paris : on lit HH:MM directement dans la chaîne
const hhmm = (iso) => (iso ? iso.slice(11, 16) : '');
const minutes = (seconds) => {
  const m = Math.round(seconds / 60);
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${pad(m % 60)}`;
};

const inputClass =
  'w-full pl-11 pr-4 py-3.5 rounded-xl border-2 border-gray-100 bg-gray-50 text-gray-900 placeholder-gray-400 ' +
  'focus:border-purple-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-purple-100 transition';

const Label = ({ htmlFor, children }) => (
  <label htmlFor={htmlFor} className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2 ml-1">
    {children}
  </label>
);

const LineBadge = ({ section }) => (
  <span
    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold whitespace-nowrap"
    style={{ backgroundColor: section.color || '#6b21a8', color: section.text_color || '#fff' }}
  >
    {section.mode} {section.line}
  </span>
);

function JourneyCard({ journey, open, onToggle }) {
  const transit = journey.sections.filter((s) => s.type === 'public_transport');
  return (
    <div className={`rounded-2xl border bg-white transition ${open ? 'border-purple-300 shadow-lg shadow-purple-100' : 'border-gray-100 hover:border-purple-200'}`}>
      <button type="button" onClick={onToggle} className="w-full text-left p-4 flex flex-wrap items-center gap-x-6 gap-y-3">
        <div className="text-lg font-bold text-gray-900 whitespace-nowrap">
          {hhmm(journey.departure)} <span className="text-gray-300 mx-1">→</span> {hhmm(journey.arrival)}
        </div>
        <div className="flex flex-wrap items-center gap-1.5 flex-1 min-w-0">
          {transit.length === 0 ? (
            <span className="flex items-center gap-1 text-sm text-gray-500"><Footprints className="w-4 h-4" /> À pied</span>
          ) : (
            transit.map((s, i) => <LineBadge key={i} section={s} />)
          )}
        </div>
        <div className="flex items-center gap-4 text-sm text-gray-500">
          <span className="font-semibold text-gray-900">{minutes(journey.duration)}</span>
          <span className="flex items-center gap-1"><Repeat className="w-4 h-4" /> {journey.transfers}</span>
          <span className="flex items-center gap-1"><Footprints className="w-4 h-4" /> {minutes(journey.walking)}</span>
          <ChevronDown className={`w-5 h-5 transition-transform ${open ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {open && (
        <ol className="px-4 pb-4 space-y-0">
          {journey.sections.map((s, i) => (
            <li key={i} className="relative flex gap-3 pl-1">
              <div className="flex flex-col items-center w-12 shrink-0 text-xs text-gray-500 pt-0.5">
                {hhmm(s.departure)}
              </div>
              <div className="relative flex flex-col items-center">
                <span className="w-3 h-3 rounded-full border-2 bg-white mt-1" style={{ borderColor: s.color || '#a855f7' }} />
                <span
                  className={`w-1 flex-1 ${s.type === 'public_transport' ? '' : 'border-l-2 border-dotted border-gray-300 w-0'}`}
                  style={s.type === 'public_transport' ? { backgroundColor: s.color || '#a855f7' } : undefined}
                />
              </div>
              <div className="pb-4 min-w-0 flex-1">
                {s.type === 'public_transport' ? (
                  <>
                    <p className="font-semibold text-gray-900 text-sm">{s.from}</p>
                    <p className="flex flex-wrap items-center gap-2 mt-1 text-sm text-gray-600">
                      <LineBadge section={s} /> direction {s.direction}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {s.stops} arrêt{s.stops > 1 ? 's' : ''} · {minutes(s.duration)} · descendre à <span className="font-medium text-gray-600">{s.to}</span>
                    </p>
                  </>
                ) : s.type === 'transfer' ? (
                  <p className="text-sm text-gray-500 flex items-center gap-1.5"><Repeat className="w-4 h-4" /> Correspondance · {minutes(s.duration)}</p>
                ) : s.type === 'waiting' ? (
                  <p className="text-sm text-gray-500 flex items-center gap-1.5"><Clock className="w-4 h-4" /> Attente · {minutes(s.duration)}</p>
                ) : (
                  <p className="text-sm text-gray-500 flex items-center gap-1.5">
                    <Footprints className="w-4 h-4" /> Marche {minutes(s.duration)}{s.to ? ` jusqu'à ${s.to}` : ''}
                  </p>
                )}
              </div>
            </li>
          ))}
          <li className="flex gap-3 pl-1">
            <div className="w-12 shrink-0 text-xs font-semibold text-purple-700 pt-0.5">{hhmm(journey.arrival)}</div>
            <Church className="w-4 h-4 text-purple-600 mt-0.5" />
            <p className="text-sm font-semibold text-purple-700">Arrivée à l'Église</p>
          </li>
        </ol>
      )}
    </div>
  );
}

export default function TrainItineraryForm() {
  const [config, setConfig] = useState(null);
  const [query, setQuery] = useState('');
  const [place, setPlace] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [date, setDate] = useState(nextSunday);
  const [hour, setHour] = useState('10');
  const [minute, setMinute] = useState('00');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [journeys, setJourneys] = useState(null);
  const [openIndex, setOpenIndex] = useState(0);
  const boxRef = useRef(null);

  useEffect(() => {
    fetch('/api/transit/config').then((r) => r.json()).then(setConfig).catch(() => setConfig({ enabled: false }));
  }, []);

  // Autocomplétion de l'adresse, avec un petit délai pour ne pas interroger à chaque frappe
  useEffect(() => {
    if (place && query === place.label) return;
    if (query.trim().length < 3) { setSuggestions([]); return; }
    const timer = setTimeout(() => {
      fetch(`/api/transit/address?q=${encodeURIComponent(query)}`)
        .then((r) => (r.ok ? r.json() : []))
        .then((list) => { setSuggestions(list); setShowSuggestions(true); })
        .catch(() => setSuggestions([]));
    }, 250);
    return () => clearTimeout(timer);
  }, [query, place]);

  useEffect(() => {
    const close = (e) => boxRef.current && !boxRef.current.contains(e.target) && setShowSuggestions(false);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const choose = (p) => {
    setPlace(p);
    setQuery(p.label);
    setShowSuggestions(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setJourneys(null);
    if (!place) {
      setError('Choisissez votre adresse de départ dans la liste proposée');
      return;
    }
    setLoading(true);
    try {
      const params = new URLSearchParams({ lon: place.lon, lat: place.lat, date, time: `${hour}:${minute}` });
      const res = await fetch(`/api/transit/journey?${params}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Calcul impossible');
      setJourneys(data.journeys);
      setOpenIndex(0);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (config && !config.enabled) {
    return (
      <div className="text-center py-6">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-purple-50 flex items-center justify-center">
          <Train className="w-8 h-8 text-purple-600" />
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">Itinéraires bientôt disponibles</h3>
        <p className="text-gray-600">Le calcul d'itinéraire en transports en commun vers l'Église est en cours de mise en place.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <p className="flex items-center gap-2 text-sm text-gray-600 mb-4 ml-1">
        <Church className="w-4 h-4 text-purple-600 shrink-0" />
        Itinéraire en transports en commun jusqu'à {config?.church ? <strong className="font-semibold">{config.church.name} — {config.church.label}</strong> : "l'Église"}.
      </p>

      <div className="grid gap-3 lg:grid-cols-12 lg:items-end">
        <div ref={boxRef} className="relative lg:col-span-5">
          <Label htmlFor="train-from">Adresse de départ</Label>
          <div className="relative">
            <MapPin className="w-5 h-5 text-purple-500 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              id="train-from"
              type="text"
              autoComplete="off"
              placeholder="Ex. 12 rue de Rivoli, Paris"
              value={query}
              onChange={(e) => { setQuery(e.target.value); setPlace(null); }}
              onFocus={() => suggestions.length && setShowSuggestions(true)}
              className={inputClass}
              role="combobox"
              aria-expanded={showSuggestions}
              aria-controls="train-suggestions"
            />
          </div>
          {showSuggestions && suggestions.length > 0 && (
            <ul id="train-suggestions" role="listbox" className="absolute z-20 mt-2 w-full bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden">
              {suggestions.map((s) => (
                <li key={`${s.lon},${s.lat}`}>
                  <button
                    type="button"
                    role="option"
                    aria-selected="false"
                    onClick={() => choose(s)}
                    className="w-full text-left flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-purple-50"
                  >
                    <MapPin className="w-4 h-4 text-gray-400 shrink-0" /> {s.label}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="lg:col-span-2">
          <Label htmlFor="train-date">Date</Label>
          <div className="relative">
            <Calendar className="w-5 h-5 text-purple-500 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input id="train-date" type="date" min={toISODate(new Date())} value={date} onChange={(e) => setDate(e.target.value)} className={`${inputClass} pr-2`} required />
          </div>
        </div>

        <div className="lg:col-span-2">
          <Label htmlFor="train-hour">Arrivée à</Label>
          <div className="flex items-center gap-1">
            <select id="train-hour" aria-label="Heure" value={hour} onChange={(e) => setHour(e.target.value)}
              className="flex-1 px-3 py-3.5 rounded-xl border-2 border-gray-100 bg-gray-50 focus:border-purple-500 focus:outline-none appearance-none text-center cursor-pointer">
              {HOURS.map((h) => <option key={h} value={h}>{h} h</option>)}
            </select>
            <select aria-label="Minutes" value={minute} onChange={(e) => setMinute(e.target.value)}
              className="flex-1 px-3 py-3.5 rounded-xl border-2 border-gray-100 bg-gray-50 focus:border-purple-500 focus:outline-none appearance-none text-center cursor-pointer">
              {MINUTES.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="lg:col-span-3 flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-lg shadow-purple-300/50 hover:-translate-y-0.5 transition disabled:opacity-60 disabled:hover:translate-y-0"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Navigation className="w-5 h-5" />}
          Calculer l'itinéraire
        </button>
      </div>

      {error && (
        <div role="alert" className="mt-4 flex items-start gap-3 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700">
          <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />
          <span className="text-sm font-medium">{error}</span>
        </div>
      )}

      {journeys && (
        <div className="mt-6 space-y-3">
          <p className="text-sm text-gray-500 ml-1">
            {journeys.length} itinéraire{journeys.length > 1 ? 's' : ''} pour arriver avant {hour}:{minute}
          </p>
          {journeys.map((j, i) => (
            <JourneyCard key={i} journey={j} open={openIndex === i} onToggle={() => setOpenIndex(openIndex === i ? -1 : i)} />
          ))}
          <p className="text-xs text-gray-400 ml-1">Données : Île-de-France Mobilités (PRIM). Horaires théoriques susceptibles d'évoluer.</p>
        </div>
      )}
    </form>
  );
}
