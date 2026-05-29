export type DefaultEmotion = {
  slug: string;
  title: string;
  defaultColorHex: `#${string}`;
};

// Базовый набор — можно менять под ваш продукт.
export const DEFAULT_EMOTIONS: DefaultEmotion[] = [
  { slug: "joy", title: "Радость", defaultColorHex: "#FFD60A" },
  { slug: "happiness", title: "Счастье", defaultColorHex: "#FFB340" },
  { slug: "enthusiasm", title: "Воодушевление", defaultColorHex: "#5E5CE6" },
  { slug: "satisfaction", title: "Удовлетворение", defaultColorHex: "#66BB6A" },
  { slug: "calm", title: "Спокойствие", defaultColorHex: "#34C759" },
  { slug: "gratitude", title: "Благодарность", defaultColorHex: "#FF9F0A" },
  { slug: "love", title: "Любовь", defaultColorHex: "#FF2D55" },
  { slug: "pride", title: "Гордость", defaultColorHex: "#30B0FF" },
  { slug: "hope", title: "Надежда", defaultColorHex: "#64D2FF" },
  { slug: "sadness", title: "Грусть", defaultColorHex: "#0A84FF" },
  { slug: "anxiety", title: "Тревога", defaultColorHex: "#AF52DE" },
  { slug: "fear", title: "Страх", defaultColorHex: "#7D7AFF" },
  { slug: "irritation", title: "Раздражение", defaultColorHex: "#FF6B3D" },
  { slug: "anger", title: "Злость", defaultColorHex: "#FF3B30" },
  { slug: "resentment", title: "Обида", defaultColorHex: "#C9356A" },
  { slug: "guilt", title: "Вина", defaultColorHex: "#6E6E73" },
  { slug: "shame", title: "Стыд", defaultColorHex: "#3A3A3C" },
  { slug: "tiredness", title: "Усталость", defaultColorHex: "#8E8E93" },
  { slug: "loneliness", title: "Одиночество", defaultColorHex: "#1C7CFF" },
  { slug: "boredom", title: "Скука", defaultColorHex: "#9A9A9F" },
  { slug: "apathy", title: "Апатия", defaultColorHex: "#787880" },
  { slug: "confusion", title: "Растерянность", defaultColorHex: "#AC8E68" },
  { slug: "surprise", title: "Удивление", defaultColorHex: "#FFCC00" },
  { slug: "nostalgia", title: "Ностальгия", defaultColorHex: "#C4A574" },
  { slug: "indifference", title: "Безразличие", defaultColorHex: "#AEAEB2" },
];
