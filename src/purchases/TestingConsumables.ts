/**
 * Dev-only local faking of the consumables server.
 *
 * The consumable shop is entirely server-authoritative: the client sends
 * `{ type: 'consume', ... }` over the websocket and the server broadcasts back the message
 * that actually applies the effect. When `infiniteConsumables` is set in Config.ts,
 * `sendToWebsocket` routes outgoing messages through {@link fakeServerResponse} instead, which
 * synthesises the reply the server *would* have sent. Effects are therefore never
 * reimplemented here — they still run through Login's real message handler.
 *
 * This module intentionally imports nothing from Login.ts or ConsumablesTab.ts so the
 * dependency stays one-way (both of those import *this*) and `npm run check-circular` stays clean.
 */

/** Shape of an entry from `https://synergism.cc/consumables/list`. */
export interface ConsumableCatalogEntry {
  name: string
  description: string
  internalName: string
  /** Seconds for a timeskip; number of loti for a Lotus package. */
  length: string
  cost: number
}

/**
 * A message shaped like one the consumables server broadcasts. Left as `Record<string, unknown>`
 * because Login validates it with the same zod schema it uses for real traffic, so a
 * malformed fake fails loudly instead of corrupting state.
 */
export interface FakedMessage {
  message: Record<string, unknown>
  /** Deliver this many ms from now instead of immediately. Used to fake expiry. */
  delayMs?: number
}

/** How long a Happy Hour Bell lasts. Must match the `+ 3600 * 1000` in Login's `consumed` handler. */
const BELL_DURATION_MS = 3600 * 1000

/** How long one applied Lotus lasts. The server owns this value; the client is never told it. */
const LOTUS_DURATION_MS = 3600 * 1000

const catalog = new Map<string, ConsumableCatalogEntry>()

/**
 * Records the fetched shop catalog so fakes can look up durations. An outgoing `consume`
 * message carries only the internal name, but faking a timeskip reply needs its length.
 */
export const recordConsumableCatalog = (items: ConsumableCatalogEntry[]) => {
  for (const item of items) {
    catalog.set(item.internalName, item)
  }
}

const displayNameOf = (key: string) => catalog.get(key)?.name ?? key

/** `length` for a timeskip is in seconds; the `time-skip` message wants whole minutes. */
const lengthOf = (key: string) => Number(catalog.get(key)?.length ?? 0)

/** Activates a durable consumable now, and ends it after `durationMs`. */
const durable = (key: string, durationMs: number): FakedMessage[] => [
  {
    message: {
      type: 'consumed',
      consumable: key,
      displayName: displayNameOf(key),
      startedAt: Date.now()
    }
  },
  {
    message: { type: 'consumable-ended', consumable: key, name: displayNameOf(key) },
    delayMs: durationMs
  }
]

const timeSkip = (key: string, minutes: number): FakedMessage[] => [
  {
    message: {
      type: 'time-skip',
      consumableName: key,
      // The schema requires a real uuid, and the id is only echoed back in the `confirm`
      // that we swallow below, so a random one is fine.
      id: crypto.randomUUID(),
      amount: Math.floor(minutes)
    }
  }
]

/** Grants Lotus *inventory* — the shop sells packages, it does not apply them. */
const lotusPackage = (key: string, amount: number): FakedMessage[] => [
  { message: { type: 'lotus', consumableName: key, amount: Math.floor(amount) } }
]

/** Consumes one owned Lotus, starting its buff. */
const applyLotus = (usedLotus: number, durationMs: number): FakedMessage[] => [
  { message: { type: 'applied-lotus', remaining: durationMs, lifetimePurchased: usedLotus + 1 } }
]

/** State Login owns that a fake needs. Passed in to avoid importing from Login. */
export interface FakeContext {
  usedLotus: number
}

/**
 * Decides what the server would have replied to an outgoing websocket message.
 *
 * @returns `null` to let the message go to the real websocket, or an array of messages to
 * deliver locally. An empty array means "intercepted, deliver nothing".
 */
export const fakeServerResponse = (rawMessage: string, ctx: FakeContext): FakedMessage[] | null => {
  let outgoing: { type?: string; consumable?: string; amount?: number }

  try {
    outgoing = JSON.parse(rawMessage)
  } catch {
    return null
  }

  // The `time-skip` handler acknowledges the server once it has applied the skip. There is no
  // server here, and letting it through would send a bogus confirm to synergism.cc.
  if (outgoing.type === 'confirm') return []

  if (outgoing.type === 'applied-lotus') {
    return applyLotus(ctx.usedLotus, LOTUS_DURATION_MS)
  }

  if (outgoing.type !== 'consume' || outgoing.consumable === undefined) return null

  const key = outgoing.consumable

  // Same substring convention ConsumablesTab.ts filters the catalog on.
  if (key.includes('TIMESKIP')) {
    // `length` is seconds on the catalog, but the time-skip message wants minutes.
    return timeSkip(key, lengthOf(key) / 60)
  }

  if (key.includes('LOTUS')) {
    // Buying a package grants inventory; the `use-lotus` button applies one, handled above.
    return lotusPackage(key, lengthOf(key))
  }

  if (key.includes('BELL')) {
    // Must return both messages: without the delayed `consumable-ended`, `amount` climbs
    // forever, `ends[]` never drains and the buff keeps scaling.
    return durable(key, BELL_DURATION_MS)
  }

  return null
}
