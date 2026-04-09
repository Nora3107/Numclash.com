/**
 * lobbyCards.js — Extensible Game Mode Data
 *
 * Thêm game mới: chỉ cần append vào mảng LOBBY_CARDS.
 * Carousel tự detect và render thêm card.
 *
 * Mỗi entry gồm:
 *   key        — unique ID, dùng cho routing + i18n (mode_<key>, modeDesc_<key>)
 *   rank       — rank hiện góc (A, K, J, 10, 8, ...)
 *   suit       — suit icon (♠ ♦ ♥ ♣)
 *   symbol     — symbol lớn ở giữa card front
 *   players    — range số người chơi
 *   glow       — CSS color cho neon glow
 *   enabled    — false = placeholder card (mờ, ko click được)
 *   useImage   — nếu true, dùng ảnh thay vì emoji symbol
 *   imageSrc   — path tới ảnh (dùng khi useImage = true)
 */

import jokerImg from '../assets/Joker_card.png';

const LOBBY_CARDS = [
  {
    key: 'classic',
    rank: 'A',
    suit: '♠',
    symbol: '♠',
    players: '4-8',
    glow: '#00deff',
    enabled: true,
  },
  {
    key: 'average',
    rank: 'K',
    suit: '♦',
    symbol: '♦',
    players: '4-8',
    glow: '#ff6a3d',
    enabled: true,
  },
  {
    key: 'oldmaid',
    rank: 'Q',
    suit: '♠',
    symbol: '♠',
    players: '2-6',
    glow: '#c77dff',
    enabled: true,
  },
  {
    key: 'liardeck',
    rank: 'J',
    suit: '♥',
    symbol: '♥',
    players: '2-6',
    glow: '#ff3b5c',
    enabled: true,
  },
  {
    key: 'poker',
    rank: 'K',
    suit: '♣',
    symbol: '♣',
    players: '2-6',
    glow: '#ffd700',
    enabled: true,
  },

  // ── Placeholder games (extensibility demo) ──
  {
    key: 'blackjack',
    rank: 'A',
    suit: '♥',
    symbol: '♥',
    players: '2-6',
    glow: '#44ddaa',
    enabled: true,
  },
  {
    key: 'go',
    rank: '9',
    suit: '●',
    symbol: '●',
    players: '1-2',
    glow: '#dcb35c',
    enabled: true,
  },
];

export default LOBBY_CARDS;
