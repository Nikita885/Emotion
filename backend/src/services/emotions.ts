import { prisma } from "../prisma";
import { DEFAULT_EMOTIONS } from "../data/defaultEmotions";

export async function ensureDefaultEmotions() {
  // Важно: добавляем новые эмоции со временем (не только при пустой таблице).
  // Поэтому делаем upsert по slug.
  const allowedSlugs = DEFAULT_EMOTIONS.map((e) => e.slug);
  await prisma.$transaction(async (tx) => {
    for (const e of DEFAULT_EMOTIONS) {
      await tx.emotion.upsert({
        where: { slug: e.slug },
        update: { title: e.title, defaultColorHex: e.defaultColorHex },
        create: { slug: e.slug, title: e.title, defaultColorHex: e.defaultColorHex },
      });
    }
    await tx.emotion.deleteMany({ where: { slug: { notIn: allowedSlugs } } });
  });
}

