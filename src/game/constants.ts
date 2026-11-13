export const LANE_WIDTH = 2.4
export const LANE_INDEXES = [-1, 0, 1] as const
export const laneX = (lane: number) => lane * LANE_WIDTH

export const SPAWN_Z = 125
export const DESPAWN_Z = 14

export const GRAVITY = 40
export const JUMP_VELOCITY = 13.5
export const FAST_FALL_VELOCITY = -26
export const SLIDE_TIME = 0.78

export const BASE_SPEED = 16
export const MAX_SPEED = 40
export const MENU_SPEED = 9

export const PLAYER_HALF_W = 0.34
export const PLAYER_HALF_D = 0.3
export const PLAYER_HEIGHT = 1.7
export const PLAYER_SLIDE_HEIGHT = 0.7

export const SEGMENT_LENGTH = 40
export const SEGMENT_COUNT = 9

export const COIN_SCORE = 25
export const HIGH_SCORE_KEY = 'arc-runner:high-score'
export const STATS_KEY = 'arc-runner:lifetime-coins'

export type ObstacleKind = 'train' | 'barrier' | 'gate' | 'crate'

export type GameState = 'menu' | 'countdown' | 'playing' | 'paused' | 'dying' | 'over'

export interface HudSnapshot {
  score: number
  distance: number
  coins: number
  speed: number
}

export interface RunResult extends HudSnapshot {
  seconds: number
}

export const PALETTE = {
  arcBlue: 0x2a73ff,
  usdcBlue: 0x2775ca,
  deepNavy: 0x0b1d3a,
  white: 0xf7faff,
  ice: 0xdbe9ff,
  cyan: 0x59e6ff,
  amber: 0xffb020,
  haze: 0xdfeeff,
} as const
