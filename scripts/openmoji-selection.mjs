/**
 * Which OpenMoji glyphs get vendored into this repo.
 *
 * OpenMoji is ~4,150 glyphs. Shipping all of them would be roughly 10 MB of SVG
 * for a picker nobody scrolls to the bottom of, so the set is curated in two
 * parts and grown from real use rather than up front.
 */

/**
 * Taken whole, every glyph in the group. Expressions are the reason a language
 * card wants a picture at all — "annoyed" and "furious" are a vocabulary
 * distinction, and a set that stopped at eight faces could not draw it. Taking
 * the entire Unicode group also means the boundary is somebody else's decision
 * rather than a line we drew and would have to keep re-drawing.
 */
export const WHOLE_GROUPS = ['smileys-emotion'];

/**
 * Everything else, hand-picked: the glyphs that actually get used, roughly in
 * frequency order within each block. Concrete nouns earn their place here —
 * they are what a beginner deck is made of, and a picture of a thing is worth
 * more than a picture of an abstraction.
 *
 * Variation selectors are normalised by the build script, so ✏️ and ✏ both
 * resolve. Skin-tone variants are excluded wholesale: they multiply the set
 * six-fold and say nothing about the word on the card.
 */
export const EXTRA = [
  // Gestures and body — the most-used part of people-body by a wide margin.
  '👍', '👎', '👏', '🙏', '🙌', '👌', '✌️', '🤞', '🤝', '👋', '🤙', '💪',
  '👉', '👈', '👆', '👇', '✋', '🤚', '🤛', '🤜', '✍️', '🤳',
  '👀', '👁️', '👂', '👃', '👄', '🦷', '🧠', '🦴', '🦶', '🦵',

  // Animals — high-frequency beginner vocabulary, and unambiguous as pictures.
  '🐶', '🐕', '🐱', '🐈', '🐭', '🐹', '🐰', '🐇', '🦊', '🐻', '🐼', '🐨',
  '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🐒', '🐔', '🐓', '🐣', '🐦', '🐧',
  '🦆', '🦉', '🦅', '🐺', '🐴', '🦄', '🐝', '🦋', '🐌', '🐛', '🐜', '🕷️',
  '🐢', '🐍', '🦎', '🐙', '🦑', '🦐', '🦀', '🐠', '🐟', '🐬', '🐳', '🦈',
  '🐘', '🦒', '🦓', '🐪', '🐄', '🐑', '🐐', '🐖', '🦌', '🦔',

  // Plants and weather.
  '🌳', '🌲', '🌴', '🌵', '🌱', '🌿', '☘️', '🍀', '🍁', '🍂', '🍃', '🌾',
  '🌷', '🌹', '🌻', '🌼', '🌸', '💐', '🍄', '🌰',
  '☀️', '🌙', '⭐', '🌟', '✨', '⚡', '🔥', '💧', '🌊', '☁️', '⛅', '🌧️',
  '⛈️', '🌈', '❄️', '⛄', '💨', '🌍', '🌛', '🌞',

  // Food and drink — the other half of a beginner deck.
  '🍎', '🍏', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🍒', '🍑', '🥭',
  '🍍', '🥥', '🥝', '🍅', '🥑', '🍆', '🥔', '🥕', '🌽', '🌶️', '🥒', '🥬',
  '🥦', '🧄', '🧅', '🥜', '🍞', '🥐', '🥖', '🥨', '🧀', '🥚', '🍳', '🥞',
  '🥓', '🍔', '🍟', '🍕', '🌭', '🥪', '🌮', '🌯', '🥗', '🍝', '🍜', '🍲',
  '🍣', '🍱', '🍚', '🍛', '🍤', '🍦', '🍩', '🍪', '🎂', '🍰', '🧁', '🍫',
  '🍬', '🍭', '🍯', '🥛', '☕', '🍵', '🍺', '🍷', '🥂', '🍾', '🥤', '🧃',

  // Travel and places.
  '🚗', '🚕', '🚌', '🚑', '🚒', '🚓', '🚚', '🚜', '🚲', '🛴', '🏍️', '✈️',
  '🚀', '🚁', '⛵', '🚢', '🚂', '🚆', '🚊', '🗺️', '🧭',
  '🏠', '🏡', '🏢', '🏥', '🏦', '🏨', '🏫', '🏪', '⛪', '🕌', '🏰', '🗼',
  '⛲', '⛺', '🏖️', '🏔️', '🌋', '🏝️', '🌃', '🌉',

  // Objects — the household and desk vocabulary every course starts with.
  '⌚', '📱', '💻', '⌨️', '🖥️', '🖨️', '📷', '🎥', '📺', '📻', '☎️', '⏰',
  '💡', '🔦', '🔋', '🔌', '📖', '📚', '📓', '📝', '✏️', '🖊️', '📌', '📎',
  '✂️', '📏', '🔑', '🔒', '🔓', '🔨', '🔧', '🪛', '🧲', '🔬', '🔭', '⚖️',
  '💰', '💳', '💎', '🧳', '☂️', '🎁', '🎈', '🧸', '🪑', '🛏️', '🚪', '🪟',
  '🧹', '🧺', '🧼', '🚿', '🛁', '🧻', '👕', '👖', '👗', '👔', '🧥', '🧦',
  '👟', '👞', '🧢', '🎩', '👓', '💍', '👜', '🎒',

  // Activities.
  '⚽', '🏀', '🏈', '⚾', '🎾', '🏐', '🎱', '🏓', '🏸', '🥊', '⛳', '🎣',
  '🎿', '⛸️', '🏂', '🏊', '🚴', '🏃', '🚶', '🧘', '🎯', '🎮', '🎲', '🧩',
  '🎨', '🎭', '🎬', '🎤', '🎧', '🎵', '🎶', '🎹', '🥁', '🎸', '🎺', '🎻',
  '🏆', '🥇', '🥈', '🥉', '🎉', '🎊',

  // Symbols that read as pictures rather than as UI chrome.
  '💯', '❗', '❓', '✅', '❌', '⚠️', '🚫', '♻️', '🔔', '💤', '💬', '💭',
];
