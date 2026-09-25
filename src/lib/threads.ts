import type {
  API,
  DataMessageSend,
  File,
  Message,
  OverrideField,
  Channel as UpstreamChannel,
  DataEditChannel as UpstreamDataEditChannel,
  User,
} from "stoat-api";

/**
 * Order of posts in a forum
 */
export type ForumSortOrder = "LatestActivity" | "CreationDate";

/**
 * Layout of posts in a forum
 */
export type ForumLayout = "List" | "Gallery";

/**
 * Tag that can be applied to forum posts
 */
export type ForumTag = {
  /**
   * Unique Id (left empty when creating a tag)
   */
  id: string;
  /**
   * Tag name
   */
  name: string;
  /**
   * Emoji (unicode or custom emoji id)
   */
  emoji?: string | null;
  /**
   * Whether only users with ManageThreads can apply this tag
   */
  moderated?: boolean;
};

/**
 * Text channel, with the thread defaults
 */
type TextChannel = Extract<UpstreamChannel, { channel_type: "TextChannel" }> & {
  default_auto_archive_minutes?: number | null;
};

/**
 * Forum channel, which holds posts (threads)
 */
export type ForumChannel = {
  channel_type: "ForumChannel";
  _id: string;
  server: string;
  name: string;
  description?: string | null;
  icon?: File | null;
  last_message_id?: string | null;
  default_permissions?: OverrideField | null;
  role_permissions?: Record<string, OverrideField>;
  nsfw?: boolean;
  slowmode?: number | null;
  available_tags?: ForumTag[];
  require_tag?: boolean;
  default_reaction_emoji?: string | null;
  default_sort_order?: ForumSortOrder;
  default_layout?: ForumLayout;
  default_thread_slowmode?: number | null;
  default_auto_archive_minutes?: number | null;
};

/**
 * Thread in a text channel, or a post in a forum channel
 */
export type Thread = {
  channel_type: "Thread";
  _id: string;
  server: string;
  parent: string;
  owner: string;
  name: string;
  private?: boolean;
  invitable?: boolean;
  applied_tags?: string[];
  pinned?: boolean;
  archived?: boolean;
  locked?: boolean;
  auto_archive_minutes: number;
  archived_at?: string | null;
  slowmode?: number | null;
  last_message_id?: string | null;
  message_count?: number;
  member_count?: number;
};

/**
 * Any channel
 */
export type Channel =
  | Exclude<UpstreamChannel, { channel_type: "TextChannel" }>
  | TextChannel
  | ForumChannel
  | Thread;

/**
 * Fields that can be removed from a channel
 */
export type FieldsChannel =
  | "Description"
  | "Icon"
  | "DefaultPermissions"
  | "Voice"
  | "Slowmode"
  | "DefaultReactionEmoji"
  | "DefaultThreadSlowmode"
  | "DefaultAutoArchiveMinutes";

/**
 * Channel changes
 */
export type DataEditChannel = Omit<UpstreamDataEditChannel, "remove"> & {
  remove?: FieldsChannel[] | null;
  locked?: boolean | null;
  pinned?: boolean | null;
  invitable?: boolean | null;
  auto_archive_minutes?: number | null;
  applied_tags?: string[] | null;
  available_tags?: ForumTag[] | null;
  require_tag?: boolean | null;
  default_reaction_emoji?: string | null;
  default_sort_order?: ForumSortOrder | null;
  default_layout?: ForumLayout | null;
  default_thread_slowmode?: number | null;
  default_auto_archive_minutes?: number | null;
};

/**
 * Notification setting for a thread
 */
export type ThreadNotify = "Default" | "All" | "Mentions" | "None";

/**
 * Membership of a thread
 */
export type ThreadMember = {
  _id: { thread: string; user: string };
  joined_at: string;
  notify?: ThreadNotify;
};

/**
 * Start a thread or create a forum post
 */
export type DataCreateThread = {
  name: string;
  private?: boolean;
  invitable?: boolean;
  auto_archive_minutes?: number;
  slowmode?: number;
  message?: DataMessageSend;
  applied_tags?: string[];
};

/**
 * List of threads, with our memberships
 */
export type ThreadList = {
  threads: Channel[];
  members: ThreadMember[];
  has_more: boolean;
  messages?: Message[];
  users?: User[];
};

/**
 * Minutes of inactivity after which a thread may be archived
 */
export const AUTO_ARCHIVE_MINUTES = [60, 1440, 4320, 10080] as const;

/**
 * Request options for routes stoat-api does not know about
 */
type UntypedRequestConfig = { headers?: Record<string, string> };

/**
 * API client for routes stoat-api does not know about
 *
 * stoat-api only serialises parameters of routes in its schema, so for
 * unknown routes it would silently drop query strings and bodies.
 */
export type UntypedAPI = {
  get(path: string, query?: object): Promise<unknown>;
  post(
    path: string,
    body?: unknown,
    config?: UntypedRequestConfig,
  ): Promise<unknown>;
  put(path: string, body?: unknown): Promise<unknown>;
  patch(path: string, body?: unknown): Promise<unknown>;
  delete(path: string, query?: object): Promise<unknown>;
};

/**
 * Create an API client for routes stoat-api does not know about
 * @param api Typed API client (provides base URL and authentication)
 * @returns Untyped API client
 */
export function createUntypedAPI(api: API): UntypedAPI {
  async function req(
    method: string,
    path: string,
    query?: object,
    body?: unknown,
    config?: UntypedRequestConfig,
  ) {
    const { baseURL, headers } = api.config;

    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query ?? {})) {
      if (typeof value === "undefined") continue;
      for (const entry of Array.isArray(value) ? value : [value]) {
        params.append(key, String(entry));
      }
    }

    const search = params.toString();
    const response = await fetch(
      baseURL + path + (search ? `?${search}` : ""),
      {
        method,
        headers: {
          ...(typeof body === "undefined"
            ? {}
            : { "Content-Type": "application/json" }),
          ...config?.headers,
          ...headers,
        },
        body: typeof body === "undefined" ? undefined : JSON.stringify(body),
      },
    );

    const data = response.status === 204 ? null : await response.text();
    if (!response.ok) throw data;
    return data ? JSON.parse(data) : null;
  }

  return {
    get: (path, query) => req("GET", path, query),
    post: (path, body, config) => req("POST", path, undefined, body, config),
    put: (path, body) => req("PUT", path, undefined, body),
    patch: (path, body) => req("PATCH", path, undefined, body),
    delete: (path, query) => req("DELETE", path, query),
  };
}
