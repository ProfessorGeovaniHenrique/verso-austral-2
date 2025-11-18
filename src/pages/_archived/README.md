# Protótipos Arquivados

Esta pasta contém os dashboards de protótipo desenvolvidos durante a fase de exploração e prototipagem do projeto.

## Dashboards Arquivados

### Dashboard.tsx
- **Propósito**: Dashboard inicial com lista de projetos mockados
- **Features**: Cards de projetos, navegação básica
- **Status**: Referência - substituído por DashboardMVP

### Dashboard2.tsx
- **Propósito**: Visualização de análise semântica com nuvem de palavras
- **Features**: WordCloud, modal KWIC, estatísticas
- **Status**: Referência - funcionalidade base preservada no MVP

### Dashboard3.tsx
- **Propósito**: Visualização de "galáxia semântica" 2D
- **Features**: SemanticDomainCloud, tabs (Galaxy/Network/Stats), tooltip interativo
- **Status**: Referência - conceito de visualização galáctica

### Dashboard4.tsx
- **Propósito**: Nuvem semântica 3D com Three.js
- **Features**: ThreeSemanticCloud, controles de visualização, filtros avançados
- **Status**: Referência - primeiro protótipo 3D

### Dashboard5.tsx
- **Propósito**: Visualização 3D com domínios como "fog clouds" e palavras como planetas
- **Features**: FogDomain, PlanetWord, controles de câmera GSAP
- **Status**: Referência - conceito de fog/planet

### Dashboard7.tsx
- **Propósito**: Navegação espacial hierárquica (universo → galáxia)
- **Features**: SpaceNavigationHub, navegação por níveis, FogDomain + PlanetWord
- **Status**: Referência - sistema de navegação em níveis

### Dashboard8.tsx
- **Propósito**: Visualização espacial avançada com sondas orbitais e KWIC funcional
- **Features**: ⭐ **ScannerPlanet, OrbitalRings, ProbeRenderer, KWIC integrado via useKWICModal**
- **Status**: ⭐ **Funcional** - implementação completa de KWIC com corpus real
- **Nota**: Este dashboard tem funcionalidade KWIC totalmente operacional e testada

## Como Restaurar um Protótipo

1. Mover o arquivo desejado de `_archived/` para `src/pages/`
2. Adicionar o import no `src/App.tsx`:
   ```tsx
   import DashboardX from "./pages/DashboardX";
   ```
3. Adicionar a rota no `App.tsx`:
   ```tsx
   <Route path="/dashboard-x" element={<DashboardX />} />
   ```

## Acessando via Admin Gallery

Administradores podem acessar todos os protótipos através de:
- Menu Admin → "Galeria de Protótipos"
- URL direta: `/admin/prototypes`
