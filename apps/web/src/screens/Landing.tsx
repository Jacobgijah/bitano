// src/screens/Landing.tsx — hero + value cards + primary CTA.
import { motion } from 'framer-motion';
import { useT } from '../i18n/LanguageProvider.js';
import { Button } from '../components/ui/Button.js';

const item = {
  hidden: { opacity: 0, y: 16 },
  show: (i: number) => ({ opacity: 1, y: 0, transition: { delay: 0.05 * i } }),
};

export function Landing({ onStart }: { onStart: () => void }) {
  const t = useT();
  const features = [
    { icon: '⚡', title: t('feat_fast_t'), desc: t('feat_fast_d') },
    { icon: '🔒', title: t('feat_safe_t'), desc: t('feat_safe_d') },
    { icon: '✨', title: t('feat_simple_t'), desc: t('feat_simple_d') },
  ];

  return (
    <div className="flex flex-col gap-7">
      <motion.div variants={item} custom={0} initial="hidden" animate="show" className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-bitcoin/10 text-3xl font-extrabold text-bitcoin">
          ₿
        </div>
        <h1 className="whitespace-pre-line text-4xl font-extrabold leading-tight tracking-tight text-ink">
          {t('landing_title')}
        </h1>
        <p className="mx-auto mt-3 max-w-xs text-sm leading-relaxed text-ink-soft">{t('landing_sub')}</p>
      </motion.div>

      <div className="flex flex-col gap-3">
        {features.map((f, i) => (
          <motion.div
            key={f.title}
            variants={item}
            custom={i + 1}
            initial="hidden"
            animate="show"
            className="flex items-start gap-3 rounded-[var(--radius-field)] border border-hairline bg-surface p-4"
          >
            <span className="text-xl" aria-hidden>
              {f.icon}
            </span>
            <div>
              <div className="text-sm font-bold text-ink">{f.title}</div>
              <div className="text-xs leading-relaxed text-ink-soft">{f.desc}</div>
            </div>
          </motion.div>
        ))}
      </div>

      <motion.div variants={item} custom={4} initial="hidden" animate="show">
        <Button full onClick={onStart}>
          {t('landing_cta')} →
        </Button>
      </motion.div>
    </div>
  );
}
