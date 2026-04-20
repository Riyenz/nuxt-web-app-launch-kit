export default defineAppConfig({
  ui: {
    colors: {
      primary: 'blue',
      secondary: 'indigo',
      neutral: 'slate'
    },
    button: {
      slots: {
        base: 'rounded-lg font-medium transition-all'
      },
      variants: {
        solid: {
          base: 'shadow-sm'
        },
        outline: {
          base: 'border-default/60 bg-transparent hover:bg-elevated/60'
        },
        ghost: {
          base: 'hover:bg-elevated/80'
        },
        soft: {
          base: 'bg-primary/10 text-primary ring-1 ring-primary/20 hover:bg-primary/15'
        }
      }
    },
    badge: {
      slots: {
        base: 'rounded-full px-2 py-0.5 font-medium'
      }
    },
    card: {
      slots: {
        root: 'rounded-xl overflow-hidden',
        header: 'px-5 py-4 sm:px-6',
        body: 'px-5 py-4 sm:px-6',
        footer: 'px-5 py-4 sm:px-6'
      }
    },
    input: {
      slots: {
        base: 'rounded-xl border-default/40 bg-elevated/50'
      }
    },
    table: {
      slots: {
        th: 'px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wide text-left',
        td: 'px-4 py-3 text-sm text-default whitespace-nowrap'
      }
    }
  }
})
