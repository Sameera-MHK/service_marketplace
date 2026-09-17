import { AccessToken, RoomServiceClient } from 'livekit-server-sdk';

function getRoomService() {
  const url    = process.env.LIVEKIT_URL;
  const key    = process.env.LIVEKIT_API_KEY;
  const secret = process.env.LIVEKIT_API_SECRET;
  if (!url || !key || !secret) throw new Error('LiveKit not configured');
  return new RoomServiceClient(url, key, secret);
}

export async function issueAccessToken({ roomName, identity, name, isModerator = false, ttlSeconds = 60 * 60 }) {
  if (!process.env.LIVEKIT_API_KEY || !process.env.LIVEKIT_API_SECRET) {
    throw new Error('LiveKit not configured');
  }
  const at = new AccessToken(process.env.LIVEKIT_API_KEY, process.env.LIVEKIT_API_SECRET, {
    identity,
    name,
    ttl: ttlSeconds,
  });
  at.addGrant({
    roomJoin:       true,
    room:           roomName,
    canPublish:     true,
    canSubscribe:   true,
    canPublishData: true,
    roomAdmin:      isModerator,
    roomRecord:     isModerator,
  });
  return at.toJwt();
}

/**
 * Forcefully close a LiveKit room and disconnect all participants.
 * Safe to call even if the room doesn't exist (catches the 404).
 */
export async function deleteRoom(roomName) {
  if (!roomName) return;
  try {
    const svc = getRoomService();
    await svc.deleteRoom(roomName);
  } catch (err) {
    // Room may already be empty/deleted — not a fatal error
    if (!err.message?.includes('not found') && !err.message?.includes('404')) {
      throw err;
    }
  }
}
