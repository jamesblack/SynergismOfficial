import i18next from 'i18next'
import { displayProperLoadoutCount } from './BlueberryUpgrades'
import { corruptionLoadoutTableCreate, updateCorruptionLoadoutNames } from './Corruptions'
import { format } from './Synergism'

export type PseudoCoinUpgradeNames =
  | 'INSTANT_UNLOCK_1'
  | 'INSTANT_UNLOCK_2'
  | 'CUBE_BUFF'
  | 'AMBROSIA_LUCK_BUFF'
  | 'AMBROSIA_GENERATION_BUFF'
  | 'GOLDEN_QUARK_BUFF'
  | 'FREE_UPGRADE_PROMOCODE_BUFF'
  | 'CORRUPTION_LOADOUT_SLOT_QOL'
  | 'AMBROSIA_LOADOUT_SLOT_QOL'
  | 'AUTO_POTION_FREE_POTIONS_QOL'
  | 'OFFLINE_TIMER_CAP_BUFF'
  | 'ADD_CODE_CAP_BUFF'
  | 'BASE_OFFERING_BUFF'
  | 'BASE_OBTAINIUM_BUFF'
  | 'RED_GENERATION_BUFF'
  | 'RED_LUCK_BUFF'

type PseudoCoinUpgrades = Record<PseudoCoinUpgradeNames, number>
type PseudoCoinUpgradeEffects = Record<PseudoCoinUpgradeNames, number>

/**
 * The maximum level of every PseudoCoin upgrade, mirroring the shop catalogue. Every
 * upgrade is permanently owned at its maximum level, so no level is ever fetched from
 * the shop backend or bought.
 */
const PCoinMaxLevels: PseudoCoinUpgrades = {
  'INSTANT_UNLOCK_1': 1,
  'INSTANT_UNLOCK_2': 1,
  'CUBE_BUFF': 5,
  'AMBROSIA_LUCK_BUFF': 5,
  'AMBROSIA_GENERATION_BUFF': 5,
  'GOLDEN_QUARK_BUFF': 5,
  'FREE_UPGRADE_PROMOCODE_BUFF': 5,
  'CORRUPTION_LOADOUT_SLOT_QOL': 8,
  'AMBROSIA_LOADOUT_SLOT_QOL': 8,
  'AUTO_POTION_FREE_POTIONS_QOL': 1,
  'OFFLINE_TIMER_CAP_BUFF': 2,
  'ADD_CODE_CAP_BUFF': 2,
  'BASE_OFFERING_BUFF': 5,
  'BASE_OBTAINIUM_BUFF': 5,
  'RED_GENERATION_BUFF': 5,
  'RED_LUCK_BUFF': 5
}

const upgradeNames = Object.keys(PCoinMaxLevels) as PseudoCoinUpgradeNames[]

const computePCoinEffect = (name: PseudoCoinUpgradeNames, level: number) => {
  switch (name) {
    case 'INSTANT_UNLOCK_1':
    case 'INSTANT_UNLOCK_2':
    case 'AUTO_POTION_FREE_POTIONS_QOL':
      return level > 0 ? 1 : 0
    case 'CUBE_BUFF':
      return 1 + level * 0.06
    case 'AMBROSIA_LUCK_BUFF':
    case 'RED_LUCK_BUFF':
      return level * 20
    case 'AMBROSIA_GENERATION_BUFF':
    case 'RED_GENERATION_BUFF':
      return 1 + level * 0.05
    case 'GOLDEN_QUARK_BUFF':
      return 1 + level * 0.04
    case 'FREE_UPGRADE_PROMOCODE_BUFF':
      return 1 + level * 0.02
    case 'CORRUPTION_LOADOUT_SLOT_QOL':
    case 'AMBROSIA_LOADOUT_SLOT_QOL':
      return level
    case 'OFFLINE_TIMER_CAP_BUFF':
    case 'ADD_CODE_CAP_BUFF':
      return 1 + level
    case 'BASE_OFFERING_BUFF':
      return 6 * level
    case 'BASE_OBTAINIUM_BUFF':
      return 3 * level
  }
}

const maxedEffects = () => {
  const effects = {} as PseudoCoinUpgradeEffects

  for (const name of upgradeNames) {
    effects[name] = computePCoinEffect(name, PCoinMaxLevels[name])
  }

  return effects
}

export const PCoinUpgrades: PseudoCoinUpgrades = { ...PCoinMaxLevels }

export const PCoinUpgradeEffects: PseudoCoinUpgradeEffects = maxedEffects()

/**
 * Applies every upgrade at its maximum level. The effects are already maxed at module
 * load; this exists because two of the QoL upgrades rebuild DOM that only exists once
 * the game has booted.
 */
export const initializePCoinCache = async () => {
  for (const name of upgradeNames) {
    updatePCoinCache(name, PCoinMaxLevels[name])
  }
}

export const updatePCoinCache = async (name: PseudoCoinUpgradeNames, level: number) => {
  PCoinUpgrades[name] = level
  updatePCoinEffects(name, level)
}

const updatePCoinEffects = (name: PseudoCoinUpgradeNames, level: number) => {
  PCoinUpgradeEffects[name] = computePCoinEffect(name, level)

  if (name === 'CORRUPTION_LOADOUT_SLOT_QOL') {
    corruptionLoadoutTableCreate()
    updateCorruptionLoadoutNames()
  } else if (name === 'AMBROSIA_LOADOUT_SLOT_QOL') {
    displayProperLoadoutCount()
  }
}

export const displayPCoinEffect = (name: PseudoCoinUpgradeNames, level: number) => {
  switch (name) {
    case 'INSTANT_UNLOCK_1':
      return String(
        i18next.t('pseudoCoins.upgradeEffects.INSTANT_UNLOCK_1', {
          descriptor: level > 0 ? '' : 'NOT',
          amount: 10 * level
        })
      )
    case 'INSTANT_UNLOCK_2':
      return String(
        i18next.t('pseudoCoins.upgradeEffects.INSTANT_UNLOCK_2', {
          descriptor: level > 0 ? '' : 'NOT',
          amount: 6 * level
        })
      )
    case 'CUBE_BUFF':
      return String(i18next.t('pseudoCoins.upgradeEffects.CUBE_BUFF', { amount: format(1 + 0.06 * level, 2, true) }))
    case 'AMBROSIA_LUCK_BUFF':
      return String(i18next.t('pseudoCoins.upgradeEffects.AMBROSIA_LUCK_BUFF', { amount: 20 * level }))
    case 'AMBROSIA_GENERATION_BUFF':
      return String(
        i18next.t('pseudoCoins.upgradeEffects.AMBROSIA_GENERATION_BUFF', { amount: format(1 + 0.05 * level, 2, true) })
      )
    case 'GOLDEN_QUARK_BUFF':
      return String(
        i18next.t('pseudoCoins.upgradeEffects.GOLDEN_QUARK_BUFF', { amount: format(1 + 0.04 * level, 2, true) })
      )
    case 'FREE_UPGRADE_PROMOCODE_BUFF':
      return String(
        i18next.t('pseudoCoins.upgradeEffects.FREE_UPGRADE_PROMOCODE_BUFF', {
          amount: format(1 + 0.02 * level, 2, true)
        })
      )
    case 'CORRUPTION_LOADOUT_SLOT_QOL':
      return String(i18next.t('pseudoCoins.upgradeEffects.CORRUPTION_LOADOUT_SLOT_QOL', { amount: level }))
    case 'AMBROSIA_LOADOUT_SLOT_QOL':
      return String(i18next.t('pseudoCoins.upgradeEffects.AMBROSIA_LOADOUT_SLOT_QOL', { amount: level }))
    case 'AUTO_POTION_FREE_POTIONS_QOL':
      return String(
        i18next.t('pseudoCoins.upgradeEffects.AUTO_POTION_FREE_POTIONS_QOL', { descriptor: level > 0 ? '' : 'NOT' })
      )
    case 'OFFLINE_TIMER_CAP_BUFF':
      return String(i18next.t('pseudoCoins.upgradeEffects.OFFLINE_TIMER_CAP_BUFF', { amount: level + 1 }))
    case 'ADD_CODE_CAP_BUFF':
      return String(i18next.t('pseudoCoins.upgradeEffects.ADD_CODE_CAP_BUFF', { amount: level + 1 }))
    case 'BASE_OFFERING_BUFF':
      return String(i18next.t('pseudoCoins.upgradeEffects.BASE_OFFERING_BUFF', { amount: 6 * level }))
    case 'BASE_OBTAINIUM_BUFF':
      return String(i18next.t('pseudoCoins.upgradeEffects.BASE_OBTAINIUM_BUFF', { amount: 3 * level }))
    case 'RED_GENERATION_BUFF':
      return String(
        i18next.t('pseudoCoins.upgradeEffects.RED_GENERATION_BUFF', { amount: format(1 + 0.05 * level, 2, true) })
      )
    case 'RED_LUCK_BUFF':
      return String(i18next.t('pseudoCoins.upgradeEffects.RED_LUCK_BUFF', { amount: 20 * level }))
  }
}

export const showCostAndEffect = (name: PseudoCoinUpgradeNames) => {
  switch (name) {
    case 'INSTANT_UNLOCK_1':
      return {
        cost: 'Cost: 400 PseudoCoins',
        effect: 'Effect: +10 Levels'
      }
    case 'INSTANT_UNLOCK_2':
      return {
        cost: 'Cost: 600 PseudoCoins',
        effect: 'Effect: +6 Levels'
      }
    case 'CUBE_BUFF':
      return {
        cost: 'Cost: 100/150/200/250/300 PseudoCoins',
        effect: 'Effect: 1.06/1.12/1.18/1.24/1.30x Cubes'
      }
    case 'AMBROSIA_LUCK_BUFF':
      return {
        cost: 'Cost: 100/150/200/250/300 PseudoCoins',
        effect: 'Effect: 20/40/60/80/100 Ambrosia Luck'
      }
    case 'AMBROSIA_GENERATION_BUFF':
      return {
        cost: 'Cost: 100/150/200/250/300 PseudoCoins',
        effect: 'Effect: 1.05/1.10/1.15/1.20/1.25x Ambrosia Generation'
      }
    case 'GOLDEN_QUARK_BUFF':
      return {
        cost: 'Cost: 100/150/200/250/300 PseudoCoins',
        effect: 'Effect: 1.04/1.08/1.12/1.16/1.20x Golden Quarks'
      }
    case 'FREE_UPGRADE_PROMOCODE_BUFF':
      return {
        cost: 'Cost: 100/150/200/250/300 PseudoCoins',
        effect: 'Effect: 1.02/1.04/1.06/1.08/1.10x Free Upgrade Promocodes'
      }
    case 'CORRUPTION_LOADOUT_SLOT_QOL':
      return {
        cost: 'Cost: 125/per PseudoCoins',
        effect: 'Effect: +1 Loadout Slot per level'
      }
    case 'AMBROSIA_LOADOUT_SLOT_QOL':
      return {
        cost: 'Cost: 125/per PseudoCoins',
        effect: 'Effect: +1 Loadout Slot per level'
      }
    case 'AUTO_POTION_FREE_POTIONS_QOL':
      return {
        cost: 'Cost: 500 PseudoCoins',
        effect: 'Effect: Auto Potion gives free potions'
      }
    case 'OFFLINE_TIMER_CAP_BUFF':
      return {
        cost: 'Cost: 400/600 PseudoCoins',
        effect: 'Effect: 2x/3x Offline Time Cap'
      }
    case 'ADD_CODE_CAP_BUFF':
      return {
        cost: 'Cost: 400/600 PseudoCoins',
        effect: 'Effect: 2x/3x Add Code Cap'
      }
    case 'BASE_OFFERING_BUFF':
      return {
        cost: 'Cost: 100/150/200/250/300 PseudoCoins',
        effect: 'Effect: +6/+12/+18/+24/+30 Base Offering'
      }
    case 'BASE_OBTAINIUM_BUFF':
      return {
        cost: 'Cost: 100/150/200/250/300 PseudoCoins',
        effect: 'Effect: +3/+6/+9/+12/+15 Base Obtainium'
      }
    case 'RED_GENERATION_BUFF':
      return {
        cost: 'Cost: 100/150/200/250/300 PseudoCoins',
        effect: 'Effect: 1.05/1.10/1.15/1.20/1.25x Red Generation'
      }
    case 'RED_LUCK_BUFF':
      return {
        cost: 'Cost: 100/150/200/250/300 PseudoCoins',
        effect: 'Effect: 20/40/60/80/100 Red Luck'
      }
  }
}
