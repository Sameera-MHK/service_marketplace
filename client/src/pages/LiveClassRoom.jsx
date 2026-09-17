import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  LiveKitRoom,
  GridLayout,
  ParticipantTile,
  RoomAudioRenderer,
  ControlBar,
  useTracks,
} from '@livekit/components-react';
import { Track } from 'livekit-client';
import '@livekit/components-styles';
import api from '../lib/axios';
import { useAuthStore } from '../store/authStore';

// ── RoomLayout ─────────────────────────────────────────────────────────────────

function RoomLayout() {
  const tracks = useTracks([
    { source: Track.Source.Camera,      withPlaceholder: true  },
    { source: Track.Source.ScreenShare, withPlaceholder: false },
  ]);
  return (
    <GridLayout tracks={tracks} style={{ height: 'calc(100vh - 56px)' }}>
      <ParticipantTile />
    </GridLayout>
  );
}

// ── LiveClassRoom (page) ───────────────────────────────────────────────────────

export default function LiveClassRoom() {
  const { id }   = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [token,     setToken]     = useState(null);
  const [serverUrl, setServerUrl] = useState(null);
  const [title,     setTitle]     = useState('Live Class');
  const [isHost,    setIsHost]    = useState(false);
  const [error,     setError]     = useState('');
  const [ending,    setEnding]    = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const detail = await api.get(`/live-classes/${id}`).then((r) => r.data.data ?? r.data);
        if (cancelled) return;

        if (detail.title) setTitle(detail.title);

        const hostId  = detail.hostId?._id ?? detail.hostId;
        const hosting = user && String(hostId) === String(user._id);
        setIsHost(hosting);

        const endpoint = hosting && detail.status === 'open'
          ? `/live-classes/${id}/start`
          : `/live-classes/${id}/join`;

        const res = await api.post(endpoint, {});
        if (cancelled) return;

        const data = res.data.data ?? res.data;
        setToken(data.token);
        setServerUrl(data.url ?? data.serverUrl);
      } catch (err) {
        if (!cancelled) {
          setError(err.response?.data?.message || 'Failed to join the class');
        }
      }
    })();

    return () => { cancelled = true; };
  }, [id, user]);

  async function handleEndClass() {
    if (!window.confirm('End this class for everyone? This will disconnect all participants and calculate payouts.')) return;
    setEnding(true);
    try {
      await api.post(`/live-classes/${id}/end`);
      // Navigate away — LiveKit will fire onDisconnected for all participants
      navigate(`/dashboard/worker/live-classes`);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to end class');
      setEnding(false);
    }
  }

  // ── error state ──
  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-stone-900 text-white p-6 gap-4">
        <p className="text-xl font-bold">Cannot join class</p>
        <p className="text-stone-400 text-sm text-center max-w-sm">{error}</p>
        <Link
          to={`/live-classes/${id}`}
          className="text-violet-400 underline text-sm hover:text-violet-300 transition-colors"
        >
          Back to class page
        </Link>
      </div>
    );
  }

  // ── loading state ──
  if (!token || !serverUrl) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-stone-900 text-white gap-3">
        <div className="w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-stone-400 text-sm">Connecting to class…</p>
      </div>
    );
  }

  // ── room ──
  return (
    <div className="h-screen bg-black flex flex-col" data-lk-theme="default">

      {/* Header bar */}
      <header className="flex items-center justify-between px-4 py-2 bg-stone-950 border-b border-stone-800 shrink-0 gap-3">
        <span className="text-white font-semibold text-sm truncate flex-1">{title}</span>

        <div className="flex items-center gap-2 shrink-0">
          {/* Leave — student only leaves, class stays live */}
          {!isHost && (
            <Link
              to={`/live-classes/${id}`}
              className="text-xs text-stone-400 hover:text-white transition-colors border border-stone-700 hover:border-stone-500 px-3 py-1.5 rounded-lg"
            >
              Leave Class
            </Link>
          )}

          {/* Host: leave without ending */}
          {isHost && (
            <Link
              to={`/live-classes/${id}`}
              className="text-xs text-stone-400 hover:text-white transition-colors border border-stone-700 hover:border-stone-500 px-3 py-1.5 rounded-lg"
            >
              Leave (keep live)
            </Link>
          )}

          {/* Host only: end class for everyone */}
          {isHost && (
            <button
              onClick={handleEndClass}
              disabled={ending}
              className="text-xs font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 px-3 py-1.5 rounded-lg transition-colors"
            >
              {ending ? 'Ending…' : 'End Class'}
            </button>
          )}
        </div>
      </header>

      {/* LiveKit room */}
      <div className="flex-1 overflow-hidden">
        <LiveKitRoom
          token={token}
          serverUrl={serverUrl}
          connect
          video
          audio
          onDisconnected={() => navigate(`/live-classes/${id}`)}
        >
          <RoomLayout />
          <RoomAudioRenderer />
          <ControlBar />
        </LiveKitRoom>
      </div>
    </div>
  );
}
