import { motion } from 'framer-motion';
import jokerImg from '../assets/jokerdomixi.jpg';

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
  small = false,
  style = {},
  layoutId,
}) {
  const isJokerCard = isJoker || value === 'JOKER';
  const sizeClass = small ? 'card-sm' : '';

  if (faceDown) {
    return (
      <motion.div
        className={`card card-back ${sizeClass} ${hoverable ? 'card-hoverable' : ''} ${selected ? 'card-selected' : ''}`}
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
        className={`card card-front card-joker ${sizeClass} ${hoverable ? 'card-hoverable' : ''} ${selected ? 'card-selected' : ''} ${dragging ? 'card-dragging' : ''}`}
        onClick={onClick}
        onHoverStart={onHoverStart}
        onHoverEnd={onHoverEnd}
        style={style}
        layoutId={layoutId}
      >
        <img src={jokerImg} alt="Joker" className="card-joker-img" />
        <div className="card-corner">
          <span className="card-value" style={{ color: '#d4af37', fontSize: small ? '12px' : '14px', fontWeight: 900 }}>🃏</span>
        </div>
      </motion.div>
    );
  }

  const suitSymbol = SUIT_SYMBOLS[suit] || '';
  const suitColor = SUIT_COLORS[suit] || 'suit-black';

  return (
    <motion.div
      className={`card card-front ${suitColor} ${sizeClass} ${hoverable ? 'card-hoverable' : ''} ${selected ? 'card-selected' : ''} ${dragging ? 'card-dragging' : ''}`}
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
    </motion.div>
  );
}
