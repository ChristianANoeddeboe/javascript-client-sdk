import { ReactiveSet } from "@solid-primitives/set";

import type { Client } from "../Client.js";
import { File } from "../classes/File.js";
import { hydrateDjSettings } from "../lib/dj.js";
import type { DjInformation, DjSettings } from "../lib/dj.js";
import type { Merge } from "../lib/merge.js";
import type {
  Channel as APIChannel,
  ForumLayout,
  ForumSortOrder,
  ForumTag,
} from "../lib/threads.js";

import type { Hydrate } from "./index.js";

export type HydratedChannel = {
  id: string;
  channelType: APIChannel["channel_type"];

  name: string;
  description?: string;
  icon?: File;

  active: boolean;
  typingIds: ReactiveSet<string>;
  recipientIds: ReactiveSet<string>;

  userId?: string;
  ownerId?: string;
  serverId?: string;

  permissions?: bigint;
  defaultPermissions?: { a: bigint; d: bigint };
  rolePermissions?: Record<string, { a: bigint; d: bigint }>;
  nsfw: boolean;
  slowmode: number;

  lastMessageId?: string;

  voice?: { maxUsers?: number };

  /** DJ settings, present only on DJ-capable text channels */
  dj?: DjSettings;

  parentId?: string;
  private: boolean;
  invitable: boolean;
  appliedTags: string[];
  pinned: boolean;
  archived: boolean;
  locked: boolean;
  autoArchiveMinutes?: number;
  archivedAt?: Date;
  messageCount: number;
  memberCount: number;

  availableTags: ForumTag[];
  requireTag: boolean;
  defaultReactionEmoji?: string;
  defaultSortOrder: ForumSortOrder;
  defaultLayout: ForumLayout;
  defaultThreadSlowmode?: number;
  defaultAutoArchiveMinutes?: number;
};

export const channelHydration: Hydrate<Merge<APIChannel>, HydratedChannel> = {
  keyMapping: {
    _id: "id",
    channel_type: "channelType",
    recipients: "recipientIds",
    user: "userId",
    owner: "ownerId",
    server: "serverId",
    default_permissions: "defaultPermissions",
    role_permissions: "rolePermissions",
    last_message_id: "lastMessageId",
    slowmode: "slowmode",
    parent: "parentId",
    applied_tags: "appliedTags",
    auto_archive_minutes: "autoArchiveMinutes",
    archived_at: "archivedAt",
    message_count: "messageCount",
    member_count: "memberCount",
    available_tags: "availableTags",
    require_tag: "requireTag",
    default_reaction_emoji: "defaultReactionEmoji",
    default_sort_order: "defaultSortOrder",
    default_layout: "defaultLayout",
    default_thread_slowmode: "defaultThreadSlowmode",
    default_auto_archive_minutes: "defaultAutoArchiveMinutes",
  },
  functions: {
    id: (channel) => channel._id,
    channelType: (channel) => channel.channel_type,
    name: (channel) => channel.name,
    description: (channel) => channel.description!,
    icon: (channel, ctx) => new File(ctx as Client, channel.icon!),
    active: (channel) => channel.active || false,
    typingIds: () => new ReactiveSet(),
    recipientIds: (channel) => new ReactiveSet(channel.recipients),
    userId: (channel) => channel.user,
    ownerId: (channel) => channel.owner,
    serverId: (channel) => channel.server,
    permissions: (channel) => BigInt(channel.permissions!),
    defaultPermissions: (channel) => ({
      a: BigInt(channel.default_permissions?.a ?? 0),
      d: BigInt(channel.default_permissions?.d ?? 0),
    }),
    rolePermissions: (channel) =>
      Object.fromEntries(
        Object.entries(channel.role_permissions ?? {}).map(([k, v]) => [
          k,
          {
            a: BigInt(v.a),
            d: BigInt(v.d),
          },
        ]),
      ),
    nsfw: (channel) => channel.nsfw || false,
    lastMessageId: (channel) => channel.last_message_id!,
    slowmode: (channel) => channel.slowmode ?? 0,
    voice: (channel) =>
      !!channel.voice ||
      channel.channel_type === "DirectMessage" ||
      channel.channel_type === "Group"
        ? {
            maxUsers: channel.voice?.max_users || undefined,
          }
        : undefined,
    parentId: (channel) => channel.parent,
    dj: (channel) => {
      const dj = (channel as { dj?: DjInformation | null }).dj;
      return dj ? hydrateDjSettings(dj) : undefined;
    },
    private: (channel) => channel.private || false,
    invitable: (channel) => channel.invitable || false,
    appliedTags: (channel) => channel.applied_tags ?? [],
    pinned: (channel) => channel.pinned || false,
    archived: (channel) => channel.archived || false,
    locked: (channel) => channel.locked || false,
    autoArchiveMinutes: (channel) => channel.auto_archive_minutes,
    archivedAt: (channel) =>
      channel.archived_at ? new Date(channel.archived_at) : undefined,
    messageCount: (channel) => channel.message_count ?? 0,
    memberCount: (channel) => channel.member_count ?? 0,
    availableTags: (channel) => channel.available_tags ?? [],
    requireTag: (channel) => channel.require_tag || false,
    defaultReactionEmoji: (channel) =>
      channel.default_reaction_emoji ?? undefined,
    defaultSortOrder: (channel) =>
      channel.default_sort_order ?? "LatestActivity",
    defaultLayout: (channel) => channel.default_layout ?? "List",
    defaultThreadSlowmode: (channel) =>
      channel.default_thread_slowmode ?? undefined,
    defaultAutoArchiveMinutes: (channel) =>
      channel.default_auto_archive_minutes ?? undefined,
  },
  initialHydration: () => ({
    typingIds: new ReactiveSet(),
    recipientIds: new ReactiveSet(),
    private: false,
    invitable: false,
    appliedTags: [],
    pinned: false,
    archived: false,
    locked: false,
    messageCount: 0,
    memberCount: 0,
    availableTags: [],
    requireTag: false,
    defaultSortOrder: "LatestActivity",
    defaultLayout: "List",
  }),
};
