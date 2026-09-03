---
name: keyboard-navigation-a11y
description: Suporte universal a navegação por teclado (atalhos globais como Ctrl+K, Tab traversal acessível, foco nítido e escape handling).
---

# Keyboard Navigation & Global Shortcuts (A11y)

Suporte universal a navegação por teclado (atalhos globais como Ctrl+K, Tab traversal acessível, foco nítido e escape handling).

## Overview
Implementação de acessibilidade de primeira classe e navegação intuitiva via teclado, voltada para workstations e ferramentas de engenharia de alta produtividade.

## Guidelines & Principles
1. **Command Palette & Global Triggers**: Registrar atalhos universais (`Ctrl+K` / `⌘K` para busca, `Enter` na barra de URL para envio, `⌘R` para rodar coleções).
2. **Focus Management**: Manter anéis de foco visíveis (`focus-visible:ring-2`) e direcionar foco com refs após abertura de modais.
3. **Escape Key Handling**: Pressionar `Escape` deve fechar dropdowns, modais e limpar buscas imediatamente.
4. **Tab Traversal**: Garantir ordem lógica de foco e navegação completa por botões e inputs sem armadilhas de teclado.
