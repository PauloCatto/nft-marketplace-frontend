import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

const noCommentsRule = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Proíbe comentários desnecessários no código',
    },
    fixable: 'code',
    schema: [],
  },
  create(context) {
    const sourceCode = context.sourceCode ?? context.getSourceCode()
    return {
      Program() {
        for (const comment of sourceCode.getAllComments()) {
          const trimmed = comment.value.trim()
          if (trimmed.startsWith('eslint-') || trimmed.startsWith('@ts-')) {
            continue
          }
          context.report({
            loc: comment.loc,
            message: 'Remova comentários desnecessários para manter o padrão limpo do projeto.',
            fix(fixer) {
              const tokenBefore = sourceCode.getTokenBefore(comment, { includeComments: true })
              const tokenAfter = sourceCode.getTokenAfter(comment, { includeComments: true })
              if (
                tokenBefore &&
                tokenAfter &&
                tokenBefore.value === '{' &&
                tokenAfter.value === '}' &&
                tokenBefore.range[1] === comment.range[0] &&
                comment.range[1] === tokenAfter.range[0]
              ) {
                return fixer.removeRange([tokenBefore.range[0], tokenAfter.range[1]])
              }
              return fixer.remove(comment)
            },
          })
        }
      },
    }
  },
}

export default defineConfig([
  globalIgnores(['dist', 'src/routeTree.gen.ts', 'public/mockServiceWorker.js', 'tests/**']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    plugins: {
      'clean-code': {
        rules: {
          'no-comments': noCommentsRule,
        },
      },
    },
    rules: {
      'no-inline-comments': 'error',
      'no-warning-comments': 'error',
      'clean-code/no-comments': 'error',
      'no-multiple-empty-lines': ['error', { max: 1, maxEOF: 0, maxBOF: 0 }],
      'no-empty': ['error', { allowEmptyCatch: true }],
      'react-refresh/only-export-components': 'off',
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/refs': 'off',
    },
    languageOptions: {
      globals: globals.browser,
    },
  },
])
