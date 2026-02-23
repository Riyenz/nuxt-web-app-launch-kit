export default defineAppConfig({
  ui: {
    colors: {
      primary: 'emerald',
      secondary: 'lime',
      neutral: 'slate'
    },
    button: {
      slots: {
        base: 'rounded-lg font-semibold transition-all'
      },
      variants: {
        solid: {
          base: 'shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/35'
        },
        outline: {
          base: 'border-default/60 bg-white/5 backdrop-blur-sm hover:bg-white/10'
        },
        soft: {
          base: 'bg-primary/15 text-primary ring-1 ring-primary/20 hover:bg-primary/20'
        }
      }
    },
    badge: {
      slots: {
        base: 'rounded-lg px-3 py-1 font-medium'
      }
    },
    card: {
      slots: {
        root: 'rounded-lg border border-default/60 bg-default shadow-md shadow-black/5',
        header: 'p-5 sm:px-6',
        body: 'p-5 sm:px-6',
        footer: 'p-5 sm:px-6'
      }
    },
    input: {
      slots: {
        base: 'rounded-lg border-default/60 bg-default/90 shadow-sm'
      }
    }
  }
})
