import { batch } from "solid-js";

import { ReactiveMap } from "@solid-primitives/map";

import type { Client } from "../Client.js";
import type { ThreadMember, ThreadNotify } from "../lib/threads.js";

/**
 * Our membership of a thread
 */
export type ThreadMembership = {
  joinedAt: Date;
  notify: ThreadNotify;
};

/**
 * Collection of our own thread memberships, keyed by thread id
 */
export class ThreadMemberCollection {
  readonly client: Client;
  readonly #memberships = new ReactiveMap<string, ThreadMembership>();

  /**
   * Construct collection
   * @param client Client
   */
  constructor(client: Client) {
    this.client = client;
  }

  /**
   * Get our membership of a thread
   * @param threadId Thread Id
   */
  get(threadId: string): ThreadMembership | undefined {
    return this.#memberships.get(threadId);
  }

  /**
   * Whether we are a member of a thread
   * @param threadId Thread Id
   */
  has(threadId: string): boolean {
    return this.#memberships.has(threadId);
  }

  /**
   * Ids of all threads we are a member of
   */
  keys(): string[] {
    return [...this.#memberships.keys()];
  }

  /**
   * Store memberships of threads
   * @param members Memberships (only our own are kept)
   */
  set(...members: ThreadMember[]): void {
    batch(() => {
      for (const member of members) {
        if (member._id.user !== this.client.user?.id) continue;

        this.#memberships.set(member._id.thread, {
          joinedAt: new Date(member.joined_at),
          notify: member.notify ?? "Default",
        });
      }
    });
  }

  /**
   * Forget our membership of a thread
   * @param threadId Thread Id
   */
  delete(threadId: string): void {
    this.#memberships.delete(threadId);
  }

  /**
   * Forget all memberships
   */
  reset(): void {
    this.#memberships.clear();
  }
}
