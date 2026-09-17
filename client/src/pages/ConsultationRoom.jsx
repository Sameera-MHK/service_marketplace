import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { LiveKitRoom, GridLayout, ParticipantTile, RoomAudioRenderer, ControlBar, useTracks } from '@livekit/components-react';
import { Track } from 'livekit-client';
import '@livekit/components-styles';
import api from '../lib/axios';

export default function ConsultationRoom() {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const [token, setToken] = useState(null);
  const [url, setUrl]     = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.post(`/consultations/bookings/${bookingId}/livekit-token`, {});
        if (cancelled) return;
        setToken(res.data.data.token);
        setUrl(res.data.data.url);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to join');
      }
    })();
    return () => { cancelled = true; };
  }, [bookingId]);

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-stone-900 text-white p-6">
        <p className="text-xl font-bold mb-2">Cannot join call</p>
        <p className="text-stone-400 text-sm mb-6">{error}</p>
        <Link to="/dashboard/bookings" className="text-violet-400 underline">Back to bookings</Link>
      </div>
    );
  }

  if (!token || !url) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-900 text-white">
        <p>Connecting…</p>
      </div>
    );
  }

  return (
    <div className="h-screen bg-black" data-lk-theme="default">
      <LiveKitRoom
        token={token}
        serverUrl={url}
        connect
        video
        audio
        onDisconnected={() => navigate('/dashboard/bookings')}
      >
        <RoomLayout />
        <RoomAudioRenderer />
        <ControlBar />
      </LiveKitRoom>
    </div>
  );
}

function RoomLayout() {
  const tracks = useTracks([
    { source: Track.Source.Camera,      withPlaceholder: true },
    { source: Track.Source.ScreenShare, withPlaceholder: false },
  ]);
  return (
    <GridLayout tracks={tracks} style={{ height: 'calc(100vh - 80px)' }}>
      <ParticipantTile />
    </GridLayout>
  );
}
