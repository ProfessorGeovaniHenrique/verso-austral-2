# 📚 Verso Austral Documentation

Welcome to the Verso Austral documentation. This directory contains all technical documentation for the project.

---

## Quick Links

| Document | Description |
|----------|-------------|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | System architecture overview |
| [EDGE_FUNCTIONS.md](./EDGE_FUNCTIONS.md) | Edge functions catalog and patterns |
| [CODE_CONVENTIONS.md](./CODE_CONVENTIONS.md) | Coding standards and style guide |
| [REFACTORING_AUDIT_2024_12_02.md](./REFACTORING_AUDIT_2024_12_02.md) | Pre-refactoring audit snapshot |

---

## Project Overview

**Verso Austral** is a semantic analysis platform for Brazilian regional music corpora, featuring:

- 🎵 **52,356 songs** across 2 active corpora (Gaúcho, Nordestino)
- 🧠 **Semantic annotation** with 728 hierarchical tagsets (N1-N4)
- 📚 **70,360 lexicon entries** (Gutenberg + Dialectal)
- 🎓 **Educational module** with quiz and achievement system
- 🔬 **Analysis tools** for corpus linguistics research

---

## Architecture Summary

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (React)                      │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐    │
│  │  Pages  │  │ Contexts│  │  Hooks  │  │Services │    │
│  │   (36)  │  │   (11)  │  │   (97)  │  │  (35)   │    │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘    │
└─────────────────────────┬───────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                 Supabase Backend                         │
│  ┌─────────────────┐  ┌─────────────────────────────┐  │
│  │ Edge Functions  │  │        PostgreSQL           │  │
│  │      (62)       │  │  - songs, artists, corpora  │  │
│  │                 │  │  - semantic_* tables        │  │
│  │  - Annotation   │  │  - lexicon tables           │  │
│  │  - Enrichment   │  │  - user management          │  │
│  │  - Import       │  │  - job tracking             │  │
│  └─────────────────┘  └─────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                    AI Services                           │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐                 │
│  │  GPT-5  │  │ Gemini  │  │ spaCy   │                 │
│  │  (mini) │  │ (Flash) │  │(pt_core)│                 │
│  └─────────┘  └─────────┘  └─────────┘                 │
└─────────────────────────────────────────────────────────┘
```

---

## Key Subsystems

### 1. Semantic Annotation
- 4-layer POS tagging (VA Grammar → spaCy → Gutenberg → Gemini)
- Hierarchical domain classification (N1-N4)
- Self-invoking job queue for large corpora
- [See EDGE_FUNCTIONS.md → Semantic Annotation](./EDGE_FUNCTIONS.md#-semantic-annotation)

### 2. Music Enrichment
- 5-layer metadata enrichment pipeline
- Cross-validation with confidence scoring
- [See ARCHITECTURE.md → Enrichment System](./ARCHITECTURE.md#2-music-enrichment-system)

### 3. Dictionary Import
- Support for Gutenberg, Dialectal, Navarro, Rocha Pombo
- Chunked processing with progress tracking
- [See EDGE_FUNCTIONS.md → Dictionary Import](./EDGE_FUNCTIONS.md#-dictionary-import)

---

## Refactoring Status

Last audit: **2024-12-02**

| Sprint | Status | Risk |
|--------|--------|------|
| Sprint 0: Audit & Backup | ✅ Complete | Zero |
| Sprint 1: Critical Data Fixes | 🔲 Pending | Medium |
| Sprint 2: Infrastructure | 🔲 Pending | Low |
| Sprint 3: Context Fixes | 🔲 Pending | Medium |
| Sprint 4: Code Cleanup | 🔲 Pending | Low |
| Sprint 5: Security | 🔲 Pending | Low |
| Sprint 6: Performance | 🔲 Pending | Low |
| Sprint 7: Documentation | ✅ Complete | Zero |

[Full audit details](./REFACTORING_AUDIT_2024_12_02.md)

---

## Getting Started

1. Clone the repository
2. Run `npm install`
3. Run `npm run dev`
4. Access at `http://localhost:5173`

For deployment, see [README.md](../README.md#how-can-i-deploy-this-project)
