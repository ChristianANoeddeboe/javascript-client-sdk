/**
 * DJ channel types
 *
 * The full API schema for the DJ routes is not in `stoat-api` yet (the
 * generated package predates the channel DJ capability), so the wire types are
 * declared here and hydrated into camelCase for the rest of the SDK.
 */

/**
 * A track in the queue, or the one currently playing
 */
export interface DjTrack {
  /** Unique id of this track (`<seq>-<ulid>`) */
  id: string;

  /**
   * Route of the streaming endpoint for this track
   *
   * Informational only: the audio itself requires the signed token which is
   * delivered in `DjNowPlaying` / `DjTrackStarted`.
   */
  file: string;

  /** Display title of the track */
  title: string;

  /** Duration of the track in milliseconds */
  durationMs: number;

  /** Id of the user who uploaded the track */
  uploader: string;
}

/**
 * The track currently playing in a DJ channel
 */
export interface DjNowPlaying {
  /** Track which is currently playing */
  track: DjTrack;

  /** Unix timestamp (milliseconds) at which the track started */
  startedAt: number;
}

/**
 * Settings of a DJ channel
 */
export interface DjSettings {
  /** Fraction of present members required to skip the current track (0 - 1) */
  skipThreshold: number;

  /** Maximum size of a single upload, in megabytes */
  maxFileMb: number;

  /** Maximum duration of a single track, in seconds */
  maxTrackSeconds: number;

  /** Maximum amount of tracks queued at once */
  maxTracks: number;

  /** Maximum total amount of bytes stored for this channel */
  maxTotalBytes: number;

  /** Maximum amount of users which may join at once */
  maxUsers?: number;

  /** Whether the DJ is currently enabled */
  enabled: boolean;
}

/**
 * State of a DJ channel
 */
export interface DjState {
  /** Id of the channel this state belongs to */
  channelId: string;

  /** Track which is currently playing, if any */
  current?: DjNowPlaying;

  /** Playback position of the current track, in milliseconds */
  positionMs: number;

  /** Server time at which this state was generated (unix milliseconds) */
  serverTime: number;

  /** Tracks which are queued up, in playback order */
  queue: DjTrack[];

  /** Number of (valid) votes to skip the current track */
  votes: number;

  /** Users who have voted to skip the current track */
  voters: string[];

  /** Users which have joined the channel */
  members: string[];

  /** Settings of this DJ channel */
  settings: DjSettings;

  /**
   * Signed, short-lived URL to stream the current track
   *
   * Only delivered in `DjTrackStarted` / `DjNowPlaying` (and the private event
   * sent on join), never in a plain state fetch.
   */
  signedUrl?: string;

  /** Local time (unix milliseconds) at which `signedUrl` was received */
  signedUrlReceivedAt?: number;
}

/**
 * Partial update to the settings of a DJ channel
 */
export interface DataEditDjSettings {
  skipThreshold?: number;
  maxFileMb?: number;
  maxTrackSeconds?: number;
  maxTracks?: number;
  maxTotalBytes?: number;

  /** `0` removes the limit */
  maxUsers?: number;
  enabled?: boolean;
}

/**
 * DJ information as it appears on a channel and in settings events
 */
export interface DjInformation {
  skip_threshold: number;
  max_file_mb: number;
  max_track_seconds: number;
  max_tracks: number;
  max_total_bytes: number;
  max_users?: number | null;
  enabled: boolean;
}

/**
 * A track as it appears on the wire
 */
export interface ApiDjTrack {
  id: string;
  file: string;
  title: string;
  duration_ms: number;
  uploader: string;
}

/**
 * State of a DJ channel as it appears on the wire
 */
export interface ApiDjChannelState {
  _id: string;
  current?: {
    track: ApiDjTrack;
    started_at: number;
  };
  position_ms: number;
  server_time: number;
  queue: ApiDjTrack[];
  votes: number;
  voters: string[];
  members: string[];
  settings: DjInformation;
}

/**
 * Membership of the current user in a DJ channel, as sent in `Ready`
 */
export interface ApiDjChannelMembers {
  _id: string;
  members: string[];
}

/**
 * Default settings of a DJ channel (mirrors the server defaults)
 */
export const DJ_DEFAULT_SETTINGS: DjSettings = {
  skipThreshold: 0.5,
  maxFileMb: 50,
  maxTrackSeconds: 900,
  maxTracks: 100,
  maxTotalBytes: 20 * 1024 * 1024 * 1024,
  maxUsers: undefined,
  enabled: true,
};

/**
 * Empty DJ state, used when an event arrives before a state snapshot
 */
export function emptyDjState(
  channelId: string,
  settings: DjSettings = DJ_DEFAULT_SETTINGS,
): DjState {
  return {
    channelId,
    positionMs: 0,
    serverTime: 0,
    queue: [],
    votes: 0,
    voters: [],
    members: [],
    settings,
  };
}

/**
 * Hydrate a track
 */
export function hydrateDjTrack(track: ApiDjTrack): DjTrack {
  return {
    id: track.id,
    file: track.file,
    title: track.title ?? "",
    durationMs: track.duration_ms ?? 0,
    uploader: track.uploader,
  };
}

/**
 * Hydrate DJ settings
 */
export function hydrateDjSettings(settings: DjInformation): DjSettings {
  return {
    skipThreshold: settings.skip_threshold,
    maxFileMb: settings.max_file_mb,
    maxTrackSeconds: settings.max_track_seconds,
    maxTracks: settings.max_tracks,
    maxTotalBytes: settings.max_total_bytes,
    maxUsers: settings.max_users ?? undefined,
    enabled: settings.enabled,
  };
}

/**
 * Hydrate the state of a DJ channel
 */
export function hydrateDjState(
  state: ApiDjChannelState,
  previous?: DjState,
): DjState {
  return {
    channelId: state._id,
    current: state.current
      ? {
          track: hydrateDjTrack(state.current.track),
          startedAt: state.current.started_at,
        }
      : undefined,
    positionMs: state.position_ms ?? 0,
    serverTime: state.server_time ?? 0,
    queue: (state.queue ?? []).map(hydrateDjTrack),
    votes: state.votes ?? 0,
    voters: state.voters ?? [],
    members: state.members ?? [],
    settings: hydrateDjSettings(state.settings),
    // A state snapshot carries no signed URL: keep the one we already have for
    // the same track so a re-fetch does not interrupt playback.
    signedUrl:
      previous?.current?.track.id === state.current?.track.id
        ? previous?.signedUrl
        : undefined,
    signedUrlReceivedAt:
      previous?.current?.track.id === state.current?.track.id
        ? previous?.signedUrlReceivedAt
        : undefined,
  };
}

/**
 * Amount of votes needed to skip the current track
 *
 * Mirrors the server's `skip_needed`: `max(1, ceil(present * threshold))`, with
 * `0` meaning a single vote skips and `1` meaning unanimous.
 */
export function djVotesNeeded(members: number, threshold: number): number {
  if (!(threshold > 0)) return 1;

  return Math.max(1, Math.ceil(members * Math.min(threshold, 1)));
}

/**
 * Serialise a settings update
 */
export function encodeDjSettings(data: DataEditDjSettings) {
  return {
    skip_threshold: data.skipThreshold,
    max_file_mb: data.maxFileMb,
    max_track_seconds: data.maxTrackSeconds,
    max_tracks: data.maxTracks,
    max_total_bytes: data.maxTotalBytes,
    max_users: data.maxUsers,
    enabled: data.enabled,
  };
}
