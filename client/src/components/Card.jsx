import { motion } from 'framer-motion';

const SUIT_SYMBOLS = { spades: '♠', hearts: '♥', diamonds: '♦', clubs: '♣' };
const SUIT_COLORS = { spades: 'suit-black', hearts: 'suit-red', diamonds: 'suit-red', clubs: 'suit-black' };

export default function Card({
  value,
  suit,
  faceDown = false,
  isJoker = false,
  onClick,
  onHoverStart,
  onHoverEnd,
  hoverable = false,
  selected = false,
  dragging = false,
  style = {},
  layoutId,
}) {
  const isJokerCard = isJoker || value === 'JOKER';

  if (faceDown) {
    return (
      <motion.div
        className={`card card-back ${hoverable ? 'card-hoverable' : ''} ${selected ? 'card-selected' : ''}`}
        onClick={onClick}
        onHoverStart={onHoverStart}
        onHoverEnd={onHoverEnd}
        style={style}
        layoutId={layoutId}
        whileTap={onClick ? { scale: 0.95 } : undefined}
      />
    );
  }

  if (isJokerCard) {
    return (
      <motion.div
        className={`card card-front card-joker ${hoverable ? 'card-hoverable' : ''} ${selected ? 'card-selected' : ''} ${dragging ? 'card-dragging' : ''}`}
        onClick={onClick}
        onHoverStart={onHoverStart}
        onHoverEnd={onHoverEnd}
        style={style}
        layoutId={layoutId}
      >
        <div className="card-corner">
          <span className="card-value" style={{ color: '#fff' }}>🃏</span>
        </div>
        <div className="card-center-suit" style={{ opacity: 0.3, fontSize: '32px' }}>🃏</div>
        <div className="card-corner card-corner-bottom">
          <span className="card-value" style={{ color: '#fff' }}>🃏</span>
        </div>
      </motion.div>
    );
  }

  const suitSymbol = SUIT_SYMBOLS[suit] || '';
  const suitColor = SUIT_COLORS[suit] || 'suit-black';

  return (
    <motion.div
      className={`card card-front ${suitColor} ${hoverable ? 'card-hoverable' : ''} ${selected ? 'card-selected' : ''} ${dragging ? 'card-dragging' : ''}`}
      onClick={onClick}
      onHoverStart={onHoverStart}
      onHoverEnd={onHoverEnd}
      style={style}
      layoutId={layoutId}
    >
      <div className="card-corner">
        <span className="card-value">{value}</span>
        <span className="card-suit">{suitSymbol}</span>
      </div>
      <div className="card-center-suit">{suitSymbol}</div>
      <div className="card-corner card-corner-bottom">
        <span className="card-value">{value}</span>
        <span className="card-suit">{suitSymbol}</span>
      </div>
    </motion.div>
  );
}
