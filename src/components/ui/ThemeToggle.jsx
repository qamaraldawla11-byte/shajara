import { Monitor, Moon, Sun } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../contexts/ThemeContext';

export default function ThemeToggle({ className = '' }) {
  const { t } = useTranslation();
  const { theme, resolvedTheme, cycleTheme } = useTheme();
  const ThemeIcon = theme === 'system' ? Monitor : resolvedTheme === 'light' ? Sun : Moon;
  const themeLabel = t(`theme.${theme}`);
  const themeShortLabel = theme === 'system' ? 'SYS' : resolvedTheme === 'light' ? 'L' : 'D';

  return (
    <button
      type="button"
      className={`btn btn-ghost btn-icon theme-toggle ${className}`.trim()}
      onClick={cycleTheme}
      title={themeLabel}
      aria-label={t('theme.change')}
    >
      <ThemeIcon size={18} />
      <span>{themeShortLabel}</span>
    </button>
  );
}
