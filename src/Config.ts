export const version = '4.2.7 August 12, 2026: "Add"itional QoL - Patch 1'

export const isSynergismCC = location.hostname === 'synergism.cc'

/**
 * If true, the version is marked as a testing version.
 */
export const testing = false

/**
 * Dev-only cheat: when true, every consumable-shop purchase is faked locally instead of
 * being sent to the consumables server. Consumables become free, unlimited and usable
 * while signed out. Deliberately separate from `testing`, which also unlocks shop tiers,
 * changes hepteract behaviour and marks savefiles as untransferable to live.
 */
export const infiniteConsumables = true
export const lastUpdated = new Date('##LAST_UPDATED##')

export const ticksPerSecond = PLATFORM === 'mobile' ? 40 : 200

/**
 * Multiplier applied to all simulated game time. 1 is normal speed.
 */
export const gameSpeed = 1
export const gameSpeed2 = 1000
