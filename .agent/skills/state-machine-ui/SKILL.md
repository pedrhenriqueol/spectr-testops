---
name: state-machine-ui
description: Modelagem de componentes e fluxos baseados em Máquinas de Estados Finitos (FSM), garantindo previsibilidade determinística (Idle, Loading, Success, Error).
---

# State Machine UI & Deterministic Interfaces

Modelagem de componentes e fluxos baseados em Máquinas de Estados Finitos (FSM), garantindo previsibilidade determinística (Idle, Loading, Success, Error).

## Overview
Eliminação de estados ambíguos de interface através da modelagem explícita de Máquinas de Estados Finitos (FSM).

## Guidelines & Principles
1. **Explicit States**: Cada componente complexo deve pertencer a exatamente um estado: `IDLE`, `PENDING`, `SUCCESS` ou `ERROR`.
2. **Impossible State Prevention**: Impossibilitar estados mutuamente exclusivos (ex: `loading=true` e `error=true` ao mesmo tempo).
3. **Deterministic Transitions**: Transições de estado devem responder a eventos específicos (`TRIGGER_SEND`, `RECEIVE_DATA`, `NETWORK_ERROR`).
4. **Visual Consistency**: Cada estado deve possuir representação gráfica inequívoca (spinners, skeletons, checkmarks ou alerts).
