import { createTheme, rem } from '@mantine/core'

/**
 * HSMS design system — clean & minimal, blue accent.
 * A strong theme drives consistency across every screen: one accent color,
 * a single radius scale, a soft elevation scale, and a clear type hierarchy.
 */
export const theme = createTheme({
  primaryColor: 'blue',
  primaryShade: { light: 6, dark: 8 },
  autoContrast: true,
  defaultRadius: 'md',
  focusRing: 'auto',
  cursorType: 'pointer',

  fontFamily:
    '"Inter Variable", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  fontFamilyMonospace: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',

  headings: {
    fontWeight: '600',
    sizes: {
      h1: { fontSize: rem(30), lineHeight: '1.3' },
      h2: { fontSize: rem(23), lineHeight: '1.35' },
      h3: { fontSize: rem(19), lineHeight: '1.4' },
      h4: { fontSize: rem(16), lineHeight: '1.45' }
    }
  },

  // Soft, layered shadows (slate-tinted) for a refined depth scale.
  shadows: {
    xs: '0 1px 2px rgba(15, 23, 42, 0.04)',
    sm: '0 1px 3px rgba(15, 23, 42, 0.06), 0 1px 2px rgba(15, 23, 42, 0.04)',
    md: '0 4px 12px rgba(15, 23, 42, 0.06)',
    lg: '0 10px 24px rgba(15, 23, 42, 0.08)',
    xl: '0 20px 40px rgba(15, 23, 42, 0.10)'
  },

  components: {
    Card: { defaultProps: { radius: 'lg', withBorder: true, shadow: 'xs' } },
    Paper: { defaultProps: { radius: 'lg' } },
    Modal: { defaultProps: { radius: 'lg' } },
    TextInput: { defaultProps: { radius: 'md' } },
    PasswordInput: { defaultProps: { radius: 'md' } },
    NumberInput: { defaultProps: { radius: 'md' } },
    Select: { defaultProps: { radius: 'md' } },
    Textarea: { defaultProps: { radius: 'md' } },
    Tooltip: { defaultProps: { radius: 'md' } },
    Badge: { defaultProps: { radius: 'sm' } }
  }
})
