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

/**
 * A snapshot of `https://synergism.cc/consumables/list`.
 *
 * The live endpoint sends no `Access-Control-Allow-Origin` header, so the browser blocks the
 * fetch whenever the game is served from anywhere other than synergism.cc itself — which is
 * exactly where you use this cheat. Without a catalog the shop renders an empty grid and there
 * is nothing to click, so the cheat ships its own copy.
 *
 * `length` is minutes for a timeskip and a count of loti for a Lotus package. Happy Hour Bell
 * has no length (the live endpoint sends null); it is '0' here because nothing reads it.
 */
const LOCAL_CATALOG: ConsumableCatalogEntry[] = [
  {
    name: 'Happy Hour Bell',
    description:
      'When you activate a consumable, trigger an event for 60 minutes, giving all players:\\n- Quark bonus: 25% + 2.5% * (active - 1)\\n- Cube, Obtainium, Offering bonuses: 50% + 5% * (active - 1)\\n- Ambrosia Luck Multiplier: 10% + 1% * (active - 1)\\n- Blueberry Generation Speed: 10% + 1% * (active - 1)\\n\\nIf you activate this consumable, you will receive 12 hours of Offline Time, in the form of tips. Each tip can be redeemed in the Events tab for 1 minute of Offline Time!',
    internalName: 'HAPPY_HOUR_BELL',
    length: '0',
    cost: 500
  },
  {
    name: 'Small Global Timeskip',
    description:
      'Adds 6 hours of REAL-LIFE time to your Prestige, Transcension, Reincarnation and Ant Sacrifice timers. Applies immediately!',
    internalName: 'SMALL_GLOBAL_TIMESKIP',
    length: '360',
    cost: 100
  },
  {
    name: 'Large Global Timeskip',
    description:
      'Adds 12 hours of REAL-LIFE time to your Prestige, Transcension, Reincarnation and Ant Sacrifice timers! Applies immediately!',
    internalName: 'LARGE_GLOBAL_TIMESKIP',
    length: '720',
    cost: 200
  },
  {
    name: 'Jumbo Global Timeskip',
    description:
      'Adds 24 hours of REAL LIFE time to your Prestige, Transcension, Reincarnation and Ant Sacrifice timers. Applies Immediately!',
    internalName: 'JUMBO_GLOBAL_TIMESKIP',
    length: '1440',
    cost: 300
  },
  {
    name: 'Small Ascension Timeskip',
    description: 'Adds 6 hours of REAL LIFE time to your Ascension Timer. Applies immediately!',
    internalName: 'SMALL_ASCENSION_TIMESKIP',
    length: '360',
    cost: 100
  },
  {
    name: 'Large Ascension Timeskip',
    description: 'Adds 12 hours of REAL LIFE time to your Ascension Timers. Applies immediately!',
    internalName: 'LARGE_ASCENSION_TIMESKIP',
    length: '720',
    cost: 200
  },
  {
    name: 'Jumbo Ascension Timeskip',
    description: 'Adds 24 hours of REAL LIFE time to your Ascension Timers. Applies Immediately!',
    internalName: 'JUMBO_ASCENSION_TIMESKIP',
    length: '1440',
    cost: 300
  },
  {
    name: 'Small Ambrosia Timeskip',
    description: 'Gain six hours worth of Ambrosia and Red Ambrosia Bar Points! Applies immediately!',
    internalName: 'SMALL_AMBROSIA_TIMESKIP',
    length: '360',
    cost: 150
  },
  {
    name: 'Large Ambrosia Timeskip',
    description: 'Gain 12 hours worth of Ambrosia and Red Ambrosia Bar Points! Applies immediately!	',
    internalName: 'LARGE_AMBROSIA_TIMESKIP',
    length: '720',
    cost: 300
  },
  {
    name: 'Jumbo Ambrosia Timeskip',
    description: 'Gain 24 hours worth of Ambrosia and Red Ambrosia Bar Points! Applies immediately!	',
    internalName: 'JUMBO_AMBROSIA_TIMESKIP',
    length: '1440',
    cost: 400
  },
  {
    name: 'Lotus of Rejuvenation',
    description:
      'Grants +1 Lotus, which you can use in the Anthill to instantly gain Reborn ELO for the next five Ant Sacrifices.',
    internalName: 'LOTUS_SINGLE',
    length: '1',
    cost: 20
  },
  {
    name: 'dozen Loti of Rejuvenation',
    description: 'Grants +12 Loti, for the price of 11.',
    internalName: 'LOTUS_DOZEN',
    length: '12',
    cost: 220
  },
  {
    name: 'Loti of Rejuvenation bouquet (50)',
    description: 'Grants +50 Loti, for the price of 40. What a steal!',
    internalName: 'LOTUS_BUNDLE',
    length: '50',
    cost: 800
  }
]

/** The catalog to render when {@link fakeServerResponse} is doing the buying. */
export const getLocalCatalog = () => LOCAL_CATALOG

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
    // `length` is already minutes (360/720/1440 = the 6/12/24 hours the shop advertises),
    // and the time-skip message wants minutes, so it passes straight through.
    return timeSkip(key, lengthOf(key))
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
