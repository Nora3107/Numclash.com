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
    chooseMode: 'Chọn chế độ chơi',
    // Game mode names
    mode_classic: 'NumClash Classic',
    mode_average: 'Average ×0.8',
    mode_oldmaid: 'Old Maid',
    mode_liardeck: "Liar's Deck",
    mode_poker: "Texas Hold'em",
    // Game mode descriptions
    modeDesc_classic: 'Đấu trí chọn số — Tổng vượt mục tiêu? Số nhỏ thắng!',
    modeDesc_average: 'Đoán số gần nhất với trung bình × 0.8',
    modeDesc_oldmaid: 'Rút bài ghép đôi — Ai giữ Joker cuối cùng thua!',
    modeDesc_liardeck: 'Đánh bài lừa nhau — Bắt bài nói dối!',
    modeDesc_poker: 'Poker cổ điển — All-in hay Fold?',
    mode_buckshot: 'Buckshot Roulette',
    modeDesc_buckshot: 'Sắp ra mắt...',
    mode_blackjack: 'Blackjack 21',
    modeDesc_blackjack: 'Sắp ra mắt...',
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
    rule1Title: 'Cách chơi',
    rule1Desc: 'Mỗi vòng, hệ thống đưa ra một số Mục Tiêu ngẫu nhiên (ví dụ: 10). Mỗi người chơi bí mật chọn một con số. Nếu tổng các số của mọi người nhỏ hơn hoặc bằng Mục Tiêu → ai chọn số lớn nhất sẽ thắng. Ngược lại, nếu tổng vượt quá Mục Tiêu → ai chọn số nhỏ nhất sẽ thắng!',
    rule2Title: 'An toàn hay Quá tải?',
    rule2Safe: 'Tổng ≤ Mục tiêu → AN TOÀN',
    rule2SafeDesc: 'Số LỚN nhất thắng',
    rule2Over: 'Tổng > Mục tiêu → QUÁ TẢI',
    rule2OverDesc: 'Số NHỎ nhất thắng',
    rule2Example: 'Ví dụ: Mục tiêu là 10. Nếu tổng các số ≤ 10 → ai chọn số lớn nhất sẽ thắng. Nếu tổng vượt quá 10 → ai chọn số nhỏ nhất sẽ thắng!',
    rule3Title: 'Bảng điểm',
    rule3Desc: 'Chỉ Top 3 ghi điểm mỗi vòng',
    rule4Title: 'Chiến thắng',
    rule4Desc: 'Tổng điểm cao nhất sau tất cả các vòng = Vô địch! 🏆',

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
    gameMode: 'Chế độ chơi',
    modeClassic: 'Classic',
    modeAverage: 'Average ×0.8',

    // Game - Picking
    round: 'Vòng',
    target: 'Mục tiêu',
    safeHint: (t) => `Tổng các số ≤ ${t} = An toàn`,
    pickRange: 'Chọn số từ 0 đến 100',
    averageResult: (avg, magic) => `Trung bình: ${avg} × 0.8 = ${magic}`,
    closestWins: 'Người gần nhất thắng!',
    lockNumber: 'Chốt Số!',
    locked: 'Đã chốt!',
    waitingOthers: 'Đang đợi người chơi khác...',

    // Game - Reveal
    revealTitle: 'Công bố số',
    safe: 'AN TOÀN!',
    overloaded: 'QUÁ TẢI!',
    safeRule: 'Số LỚN thắng — Sắp xếp từ Cao → Thấp',
    overloadedRule: 'Số NHỎ thắng — Sắp xếp từ Thấp → Cao',
    total: 'Tổng',
    highestWins: 'Số CAO NHẤT thắng!',
    lowestWins: 'Số THẤP NHẤT thắng!',
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
    // Room Browser
    publicRooms: 'Phòng đang mở',
    noRooms: 'Chưa có phòng nào',
    roomPublic: 'Public',
    roomPrivate: 'Private',
    roomNameLabel: 'Tên phòng',
    roomNamePlaceholder: 'Đặt tên phòng...',
    // Chat
    chat: 'Chat',
    chatPlaceholder: 'Nhắn tin...',
    send: 'Gửi',
    // Tutorial
    tutorialTitle: 'CÁCH CHƠI',
    tutorialLine1: '🎯 Mục tiêu: Chọn số sao cho tổng của tất cả ≤ Target',
    tutorialLine2: '🏆 Nếu tổng ≤ Target → Người chọn số CAO NHẤT thắng',
    tutorialLine3: '💥 Nếu tổng > Target → Người chọn số THẤP NHẤT thắng',
    tutorialDismiss: 'Chạm để bắt đầu',
    // Tutorial Average
    tutorialAvgTitle: 'CÁCH CHƠI - Average ×0.8',
    tutorialAvgLine1: '🎲 Chọn một số từ 0 đến 100',
    tutorialAvgLine2: '📊 Tính trung bình tất cả các số × 0.8',
    tutorialAvgLine3: '🏆 Ai chọn số GẦN NHẤT với kết quả đó thắng!',
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
    chooseMode: 'Choose Game Mode',
    // Game mode names
    mode_classic: 'NumClash Classic',
    mode_average: 'Average ×0.8',
    mode_oldmaid: 'Old Maid',
    mode_liardeck: "Liar's Deck",
    mode_poker: "Texas Hold'em",
    // Game mode descriptions
    modeDesc_classic: 'Number strategy — Beat the target or go low!',
    modeDesc_average: 'Guess closest to the average × 0.8',
    modeDesc_oldmaid: 'Match cards — Last one with Joker loses!',
    modeDesc_liardeck: 'Bluff your cards — Call the liar!',
    modeDesc_poker: 'Classic poker — All-in or Fold?',
    mode_buckshot: 'Buckshot Roulette',
    modeDesc_buckshot: 'Coming soon...',
    mode_blackjack: 'Blackjack 21',
    modeDesc_blackjack: 'Coming soon...',
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
    rule1Title: 'How it works',
    rule1Desc: 'Each round, the system picks a random Target number (e.g. 10). Every player secretly chooses a number. If the total of all numbers is less than or equal to the Target → the highest number wins. But if the total exceeds the Target → the lowest number wins!',
    rule2Title: 'Safe or Overloaded?',
    rule2Safe: 'Sum ≤ Target → SAFE',
    rule2SafeDesc: 'Highest number wins',
    rule2Over: 'Sum > Target → OVERLOADED',
    rule2OverDesc: 'Lowest number wins',
    rule2Example: 'Example: Target is 10. If the total of all numbers ≤ 10 → the highest number wins. If the total exceeds 10 → the lowest number wins!',
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
    gameMode: 'Game Mode',
    modeClassic: 'Classic',
    modeAverage: 'Average ×0.8',

    // Game - Picking
    round: 'Round',
    target: 'Target',
    safeHint: (t) => `Sum of numbers ≤ ${t} = Safe`,
    pickRange: 'Pick a number from 0 to 100',
    averageResult: (avg, magic) => `Average: ${avg} × 0.8 = ${magic}`,
    closestWins: 'Closest number wins!',
    lockNumber: 'Lock In!',
    locked: 'Locked!',
    waitingOthers: 'Waiting for other players...',

    // Game - Reveal
    revealTitle: 'Revealing numbers',
    safe: 'SAFE!',
    overloaded: 'OVERLOADED!',
    safeRule: 'HIGHEST wins — Sorted High → Low',
    overloadedRule: 'LOWEST wins — Sorted Low → High',
    total: 'Total',
    highestWins: 'HIGHEST number wins!',
    lowestWins: 'LOWEST number wins!',
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
    // Room Browser
    publicRooms: 'Open Rooms',
    noRooms: 'No rooms available',
    roomPublic: 'Public',
    roomPrivate: 'Private',
    roomNameLabel: 'Room name',
    roomNamePlaceholder: 'Set room name...',
    // Chat
    chat: 'Chat',
    chatPlaceholder: 'Type a message...',
    send: 'Send',
    // Tutorial
    tutorialTitle: 'HOW TO PLAY',
    tutorialLine1: '🎯 Goal: Pick a number so the total of all ≤ Target',
    tutorialLine2: '🏆 If total ≤ Target → HIGHEST number wins',
    tutorialLine3: '💥 If total > Target → LOWEST number wins',
    tutorialDismiss: 'Tap to start',
    // Tutorial Average
    tutorialAvgTitle: 'HOW TO PLAY - Average ×0.8',
    tutorialAvgLine1: '🎲 Pick a number from 0 to 100',
    tutorialAvgLine2: '📊 Calculate the average of all numbers × 0.8',
    tutorialAvgLine3: '🏆 Whoever picks the CLOSEST number to that result wins!',
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
