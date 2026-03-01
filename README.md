# 🎨 AstraCreate - AI-Powered Retail Media Creative Tool

> **Transform product images into compliant retail media campaigns in seconds with autonomous AI generation.**

[![Made with React](https://img.shields.io/badge/Made%20with-React-61DAFB?logo=react)](https://react.dev)
[![Fabric.js](https://img.shields.io/badge/Canvas-Fabric.js-ff69b4)](http://fabricjs.com/)

---

## 🚀 The Problem

Retail media creative production is **slow, expensive, and error-prone**:
- Designers spend hours per campaign variant
- Compliance checks happen too late in the process
- Multi-format adaptation is manual and tedious
- Brand guidelines are frequently violated

## ✨ The Solution

**AstraCreate** uses AI to autonomously generate retail media creatives:

| Input | Output |
|-------|--------|
| 📸 **1 product image** | 🎯 **5 creative variants** × **6 formats** = **30 assets** |
| ⏱️ **~3 seconds** | ✅ **100% compliant** |

---

## 🎯 Key Features

### 🪄 Magic Wand - One-Click Campaign Generation
Upload a single product image and AI automatically:
- **Detects product** name, brand, and category
- **Extracts brand colors** from packaging
- **Generates 5 variants** with different creative tones
- **Applies compliance** (Drinkaware for alcohol, no prohibited claims)

**Keyboard shortcut:** `⌘M` / `Ctrl+M`

### 📸 AI Creative Gallery
Pre-generated showcase of 8+ products demonstrating autonomous creative generation across categories:
- Beverages (Coca-Cola, Heineken)
- Baby (Pampers)
- Household (Persil)
- Fresh (Strawberries)
- Bakery (Sourdough)
- Frozen (Ben & Jerry's)
- Pet (Pedigree)

**Keyboard shortcut:** `⌘G` / `Ctrl+G`

### 🧠 Smart Multi-Format Export
True AI-driven layout adaptation (not just scaling):
- Headlines repositioned for each format's optimal placement
- Packshots maintain visual prominence per aspect ratio
- Value tiles stay in attention zones
- Story formats (9:16) respect platform safe zones

### 📁 Template Manager
Save and reuse your best designs:
- Save current design as reusable template
- Campaign history with quick-load
- Local storage persistence

**Keyboard shortcut:** `⌘T` / `Ctrl+T`

### ✅ Real-Time Compliance Engine
Built-in retail media compliance checking:
- Headlines limited to 35 characters
- Prohibited terms blocked (save, best, free, etc.)
- Alcohol products require Drinkaware lockup
- Format-specific safe zone validation

---

## 🛠️ Tech Stack

| Component | Technology |
|-----------|------------|
| Frontend | React 18 + Vite |
| Canvas | Fabric.js 6 |
| State | Zustand |
| Styling | Tailwind CSS |
| AI | Google Gemini API |
| Export | JSZip + file-saver |

---

## 🚀 Quick Start

```bash
# Clone the repository
git clone <repo-url>
cd "Tesco AI Hackathon"

# Install dependencies
npm install

# Add your Gemini API key
echo "VITE_GEMINI_API_KEY=your_api_key_here" > .env

# Start development server
npm run dev
```

Open http://localhost:5173 in your browser.

---

## 📸 Screenshots

### Magic Wand Wizard
One-click campaign generation from product images with AI-generated variants.

### Demo Gallery
Pre-generated creatives showcase across 8 product categories.

### Smart Export
Intelligent multi-format export with layout adaptation.

### Template Manager
Save and load templates with campaign history.

---

## 🎹 Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `⌘M` | Open Magic Wand (one-click generation) |
| `⌘G` | Open Demo Gallery |
| `⌘T` | Open Template Manager |
| `⌘N` | Open Quick Campaign Wizard |
| `⌘E` | Export All Formats |
| `⌘Z` | Undo |
| `⌘⇧Z` | Redo |
| `Delete` | Remove selected element |

---

## 📊 Supported Formats

| Format | Dimensions | Ratio |
|--------|------------|-------|
| Instagram Feed | 1080 × 1080 | 1:1 |
| Instagram Story | 1080 × 1920 | 9:16 |
| Facebook Feed | 1200 × 628 | 1.91:1 |
| Facebook Story | 1080 × 1920 | 9:16 |
| Display Banner | 728 × 90 | 8.09:1 |
| Display MPU | 300 × 250 | 1.2:1 |

---

## 🔒 Compliance Rules

AstraCreate enforces Tesco retail media guidelines:

- **Headlines:** Max 35 characters, uppercase
- **Subheadlines:** Max 20 words
- **Prohibited terms:** "save", "best", "free", "cheapest", "deal", "bargain"
- **Value tiles:** Clubcard, White, or New only
- **Alcohol:** Mandatory drinkaware.co.uk lockup
- **Safe zones:** Platform-specific margins respected

---

## 🏆 Why AstraCreate Wins

| Traditional Workflow | AstraCreate |
|---------------------|-------------|
| 2+ hours per campaign | ~3 seconds |
| Manual multi-format adaptation | AI-driven layout intelligence |
| Compliance checked at end | Real-time compliance feedback |
| Multiple design iterations | 5 variants generated instantly |
| Specialist designer required | Anyone can create |

---

## 📂 Project Structure

```
src/
├── components/
│   ├── MagicWandWizard.jsx    # One-click AI generation
│   ├── DemoGallery.jsx        # Pre-generated showcase
│   ├── TemplateManager.jsx    # Save/load templates
│   ├── CampaignGenerator.jsx  # Smart export
│   ├── CanvasEditor.jsx       # Fabric.js canvas
│   └── Toolbar.jsx            # Main toolbar
├── services/
│   └── geminiService.js       # AI integration
├── store/
│   └── useStore.js            # Zustand state + compliance rules
└── hooks/
    └── useCompliance.js       # Real-time compliance checking
```

---

## 🤝 Team

Built for the Tesco AI Hackathon with ❤️

---

## 📄 License

MIT License - Feel free to use and modify!
