---
name: framer-motion-orchestration
description: Domínio de física de molas (spring physics), transições com AnimatePresence, layouts compartilhados com layoutId e animações escalonadas (staggered children).
---

# Framer Motion Orchestration & Fluid Physics

Domínio de física de molas (spring physics), transições com AnimatePresence, layouts compartilhados com layoutId e animações escalonadas (staggered children).

## Overview
Criação de microinterações de alto nível, transições fluidas e físicas de mola harmônicas no React utilizando o ecossistema Framer Motion.

## Guidelines & Principles
1. **Spring Physics**: Utilizar molas realistas (`type: 'spring', stiffness: 380, damping: 30`) para tabs e pills de seleção.
2. **Layout Projection**: Empregar `layoutId` em indicadores de abas compartilhadas para transições deslizantes contínuas sem saltos visuais.
3. **Staggered Orchestration**: Animar listas de console ou cartões com escalonamento temporal (`staggerChildren: 0.05`).
4. **Non-Blocking Mounting**: Evitar `mode="wait"` rígido em hierarquias com sub-animações complexas para prevenir telas cinzas ou desmontagens travadas.
