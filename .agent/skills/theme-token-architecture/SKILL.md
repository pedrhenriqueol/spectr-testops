---
name: theme-token-architecture
description: Gestão avançada de temas Claro/Escuro através de variáveis CSS semânticas e tokens Tailwind, com contraste acessível (WCAG AA) e zero vazamento visual (FOUC).
---

# Theme Token Architecture & Dark/Light System

Gestão avançada de temas Claro/Escuro através de variáveis CSS semânticas e tokens Tailwind, com contraste acessível (WCAG AA) e zero vazamento visual (FOUC).

## Overview
Estruturação de design systems com suporte pleno a temas Claro/Escuro, contrastes ergonômicos e persistência resiliente.

## Guidelines & Principles
1. **Semantic Color Tokens**: Mapear tokens contextuais (`pm-dark-bg`, `pm-light-bg`, `pm-orange`) evitando hexadecimais soltos no JSX.
2. **Zero FOUC**: Inicializar tema no head ou script síncrono lendo `localStorage` e `prefers-color-scheme`.
3. **Contrast Compliance**: Respeitar taxa de contraste mínima WCAG 2.1 AA (4.5:1 para texto padrão e 3:1 para elementos de UI).
4. **Method Signatures**: Padronizar cores semânticas oficiais de métodos HTTP (`GET` verde, `POST` laranja, `PUT` azul, `DELETE` vermelho).
