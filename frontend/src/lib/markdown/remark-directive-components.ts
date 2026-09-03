import { visit } from 'unist-util-visit'
import type { Root } from 'mdast'

/**
 * Directive names authors may use in `.md` content. Anything else is left
 * untouched so a typo renders as visible text instead of silently vanishing.
 *
 *   ::cta[Run a free verdict]{href="/discovery"}
 *   :::callout{type="tip"}
 *   Body markdown…
 *   :::
 */
export const DIRECTIVE_NAMES = ['cta', 'callout'] as const
export type DirectiveName = (typeof DIRECTIVE_NAMES)[number]

export const CALLOUT_TYPES = ['tip', 'warning', 'example', 'note'] as const
export type CalloutType = (typeof CALLOUT_TYPES)[number]

export function isCalloutType(value: string | undefined): value is CalloutType {
  return value !== undefined && (CALLOUT_TYPES as readonly string[]).includes(value)
}

type DirectiveNode = {
  type: 'containerDirective' | 'leafDirective' | 'textDirective'
  name: string
  attributes?: Record<string, string | null | undefined>
  data?: { hName?: string; hProperties?: Record<string, unknown> }
  children: unknown[]
}

function isDirective(node: unknown): node is DirectiveNode {
  const t = (node as { type?: string }).type
  return t === 'containerDirective' || t === 'leafDirective' || t === 'textDirective'
}

/**
 * Turns `remark-directive` nodes into `<div data-directive="…">` elements so
 * react-markdown can render them through its `div` component without needing
 * custom element names in the components map.
 */
export function remarkDirectiveComponents() {
  return (tree: Root) => {
    visit(tree, (node) => {
      if (!isDirective(node)) return
      if (!(DIRECTIVE_NAMES as readonly string[]).includes(node.name)) return
      const attrs = node.attributes ?? {}
      const data = node.data ?? (node.data = {})
      data.hName = 'div'
      data.hProperties = {
        dataDirective: node.name,
        dataHref: attrs.href ?? undefined,
        dataType: attrs.type ?? undefined,
        dataTitle: attrs.title ?? undefined,
      }
    })
  }
}
