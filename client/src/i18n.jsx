import { createContext, useContext, useState, useCallback } from 'react';

const translations = {
  vi: {
    // Home
    tagline: 'Đấu trí chọn số — Chiến lược đỉnh cao',
    nickname: 'Nickname',
    nicknamePlaceholder: 'Nhập tên của bạn...',
    createRoom: 'Tạo Phòng',
    joinRoom: 'Vào Phòng',
    or: 'HOẶC',
    roomCode: 'Mã Phòng',
    join: 'Tham gia',
    back: 'Quay lại',
    players: '4-8 Người chơi',
    realtime: 'Real-time',
    manyRounds: 'Nhiều vòng đấu',
    enterNickname: 'Vui lòng nhập nickname!',
    enterCode: 'Vui lòng nhập mã phòng!',
    // Server errors
    ROOM_NOT_FOUND: 'Phòng không tồn tại!',
    GAME_ALREADY_STARTED: 'Trận đấu đã bắt đầu!',
    ROOM_FULL: 'Phòng đã đầy! (Tối đa 8 người)',
    NICKNAME_TAKEN: 'Nickname đã được sử dụng!',
    HOST_ONLY: 'Chỉ Host mới được bắt đầu!',
    NEED_MORE_PLAYERS: 'Cần tối thiểu 4 người chơi!',
    CANNOT_PICK_NOW: 'Không thể chọn số lúc này!',
    NOT_IN_ROOM: 'Bạn không trong phòng này!',
    INVALID_NUMBER: 'Số không hợp lệ!',
    NOT_ALL_READY: 'Chưa tất cả sẵn sàng!',
    howToPlay: 'Luật Chơi',
    rulesTitle: 'CÁCH CHƠI',
    rulesClose: 'Đã hiểu!',
    rule1Title: 'Chọn số bí mật',
    rule1Desc: 'Mỗi vòng có 1 số Mục Tiêu. Bạn có 36 giây để chọn 1 con số.',
    rule2Title: 'An toàn hay Quá tải?',
    rule2Safe: 'Tổng ≤ Mục tiêu → AN TOÀN',
    rule2SafeDesc: 'Số LỚN nhất thắng',
    rule2Over: 'Tổng > Mục tiêu → QUÁ TẢI',
    rule2OverDesc: 'Số NHỎ nhất thắng',
    rule3Title: 'Bảng điểm',
    rule3Desc: 'Chỉ Top 3 ghi điểm mỗi vòng',
    rule4Title: 'Chiến thắng',
    rule4Desc: 'Tổng điểm cao nhất sau tất cả vòng = Vô địch! 🏆',

    // Lobby
    lobby: 'Sảnh Chờ',
    waitingPlayers: 'Đợi mọi người tham gia...',
    roomCodeLabel: 'Mã Phòng',
    copied: '✓ Đã sao chép!',
    shareCode: 'Chia sẻ mã này cho bạn bè',
    roundCount: 'Số vòng chơi',
    playerList: 'Người chơi',
    waiting: 'Đang đợi...',
    startGame: 'Bắt Đầu Trận Đấu!',
    needMore: (n) => `Cần thêm ${n} người...`,
    waitingHost: 'Đang đợi Host bắt đầu...',

    // Game - Picking
    round: 'Vòng',
    target: 'Mục tiêu',
    safeHint: (t) => `Tổng các số ≤ ${t} = An toàn`,
    lockNumber: 'Chốt Số!',
    locked: 'Đã chốt!',
    waitingOthers: 'Đang đợi người chơi khác...',

    // Game - Reveal
    revealTitle: 'Công bố số',
    safe: 'AN TOÀN!',
    overloaded: 'QUÁ TẢI!',
    safeRule: 'Số LỚN thắng — Sắp xếp từ Cao → Thấp',
    overloadedRule: 'Số NHỎ thắng — Sắp xếp từ Thấp → Cao',
    viewLeaderboard: 'Xem Bảng Xếp Hạng',

    // Scoreboard
    leaderboard: 'TỔNG ĐIỂM',
    afterRound: (r) => `Sau vòng ${r}`,
    roundPoints: 'Điểm vòng này',
    nextRound: 'Vòng Tiếp Theo',
    viewFinal: 'Xem Kết Quả Chung Cuộc',
    waitingHostShort: 'Đang đợi Host...',
    you: 'BẠN',

    // Results
    finalResults: 'KẾT QUẢ CHUNG KẾT',
    congrats: '🎉 Chúc mừng! Bạn là NHẤT!',
    playAgain: 'Chơi Lại',
    leaveRoom: 'Rời Phòng',
    // Ready
    ready: 'Sẵn sàng!',
    notReady: 'Sẵn sàng?',
    waitAllReady: 'Đợi tất cả sẵn sàng...',
    readyHint: 'Bấm sẵn sàng để Host bắt đầu',
  },
  en: {
    // Home
    tagline: 'Number Strategy — Ultimate Mind Game',
    nickname: 'Nickname',
    nicknamePlaceholder: 'Enter your name...',
    createRoom: 'Create Room',
    joinRoom: 'Join Room',
    or: 'OR',
    roomCode: 'Room Code',
    join: 'Join',
    back: 'Back',
    players: '4-8 Players',
    realtime: 'Real-time',
    manyRounds: 'Multiple rounds',
    enterNickname: 'Please enter a nickname!',
    enterCode: 'Please enter a room code!',
    // Server errors
    ROOM_NOT_FOUND: 'Room not found!',
    GAME_ALREADY_STARTED: 'Game already started!',
    ROOM_FULL: 'Room is full! (Max 8 players)',
    NICKNAME_TAKEN: 'Nickname already taken!',
    HOST_ONLY: 'Only the Host can start!',
    NEED_MORE_PLAYERS: 'Need at least 4 players!',
    CANNOT_PICK_NOW: 'Cannot pick a number now!',
    NOT_IN_ROOM: 'You are not in this room!',
    INVALID_NUMBER: 'Invalid number!',
    NOT_ALL_READY: 'Not everyone is ready!',
    howToPlay: 'How to Play',
    rulesTitle: 'HOW TO PLAY',
    rulesClose: 'Got it!',
    rule1Title: 'Pick a secret number',
    rule1Desc: 'Each round has a Target number. You have 36 seconds to pick a number.',
    rule2Title: 'Safe or Overloaded?',
    rule2Safe: 'Sum ≤ Target → SAFE',
    rule2SafeDesc: 'Highest number wins',
    rule2Over: 'Sum > Target → OVERLOADED',
    rule2OverDesc: 'Lowest number wins',
    rule3Title: 'Scoring',
    rule3Desc: 'Only Top 3 score each round',
    rule4Title: 'How to win',
    rule4Desc: 'Highest total score after all rounds = Champion! 🏆',

    // Lobby
    lobby: 'Lobby',
    waitingPlayers: 'Waiting for players to join...',
    roomCodeLabel: 'Room Code',
    copied: '✓ Copied!',
    shareCode: 'Share this code with friends',
    roundCount: 'Number of rounds',
    playerList: 'Players',
    waiting: 'Waiting...',
    startGame: 'Start Game!',
    needMore: (n) => `Need ${n} more player${n > 1 ? 's' : ''}...`,
    waitingHost: 'Waiting for Host to start...',

    // Game - Picking
    round: 'Round',
    target: 'Target',
    safeHint: (t) => `Sum of numbers ≤ ${t} = Safe`,
    lockNumber: 'Lock In!',
    locked: 'Locked!',
    waitingOthers: 'Waiting for other players...',

    // Game - Reveal
    revealTitle: 'Revealing numbers',
    safe: 'SAFE!',
    overloaded: 'OVERLOADED!',
    safeRule: 'HIGHEST wins — Sorted High → Low',
    overloadedRule: 'LOWEST wins — Sorted Low → High',
    viewLeaderboard: 'View Leaderboard',

    // Scoreboard
    leaderboard: 'LEADERBOARD',
    afterRound: (r) => `After round ${r}`,
    roundPoints: 'Round points',
    nextRound: 'Next Round',
    viewFinal: 'View Final Results',
    waitingHostShort: 'Waiting for Host...',
    you: 'YOU',

    // Results
    finalResults: 'FINAL RESULTS',
    congrats: '🎉 Congratulations! You are #1!',
    playAgain: 'Play Again',
    leaveRoom: 'Leave Room',
    // Ready
    ready: 'Ready!',
    notReady: 'Ready?',
    waitAllReady: 'Waiting for everyone...',
    readyHint: 'Press ready so Host can start',
  },
};

const LangContext = createContext();

export function LangProvider({ children }) {
  const [lang, setLang] = useState('vi');
  const t = useCallback((key, ...args) => {
    const val = translations[lang]?.[key] || translations.vi[key] || key;
    return typeof val === 'function' ? val(...args) : val;
  }, [lang]);
  const toggleLang = useCallback(() => setLang(l => l === 'vi' ? 'en' : 'vi'), []);
  return (
    <LangContext.Provider value={{ lang, setLang, toggleLang, t }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang() {
  return useContext(LangContext);
}
