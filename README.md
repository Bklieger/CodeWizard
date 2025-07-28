<h2 align="center">
  <br>
  <img src="https://i.imgur.com/8MltvER.png" alt="CodeWizard Logo" width="200">
 <br>
 <br>
 CodeWizard: Kimi K2 on Groq Connected to Context7's MCP  <br> with Real-time Documentation for ~30,000 Libraries
 <br>
</h2>
<p align="center">
 <a href="https://github.com/bklieger/codewizard/stargazers"><img src="https://img.shields.io/github/stars/bklieger/codewizard"></a>
 <a href="https://github.com/bklieger/codewizard/blob/main/LICENSE">
 <img src="https://img.shields.io/badge/License-MIT-green.svg">
 </a>
</p>
<p align="center">
 <a href="#overview">Overview</a> •
 <a href="#features">Features</a> •
 <a href="#quick-start">Quick Start</a> •
 <a href="#usage">Usage</a> •
 <a href="#contributing">Contributing</a>
</p>

<br>

[Demo of CodeWizard](https://github.com/user-attachments/assets/34c93fad-026b-4aa4-86e6-7cc26655385a)

---

## Overview

**CodeWizard** is a lightning-fast AI coding assistant that combines the power of **Kimi K2** on **Groq** with real-time documentation access to over **30,000 libraries and frameworks**. Built with Next.js and React, it provides developers with instant answers to coding questions while fetching up-to-date documentation from the most popular libraries and frameworks.

### 🤖 **Fast LLM Integration with Kimi K2**
- Powered by Kimi K2 on Groq for lightning-fast responses
- Easy to switch out to any OpenAI-compatible model endpoint

### 📚 **Real-time Documentation Access with Context7**
- Connected to Context7 with ~30,000 libraries and frameworks
- Instant documentation lookup during conversations using MCP tools
- Pre-configured for popular libraries (React, Next.js, Tailwind, MongoDB, etc.)

### 💬 **Modern Chat Interface**
- Streaming responses with typing indicators
- Syntax highlighting for code blocks
- Tool execution visualization
- Responsive design across all device sizes

---

[Demo of CodeWizard](https://github.com/user-attachments/assets/48be0e2c-d145-4d78-b8fd-6a6c6763e40e)

## Quick Start

> [!IMPORTANT]
> To use CodeWizard, you can use the hosted version at [code-wizard-demo.vercel.app]
(https://code-wizard-demo.vercel.app)
> Alternatively, you can run CodeWizard locally using the quickstart 
instructions.

### Prerequisites

- Node.js 18+ and npm/yarn
- A Groq API key ([Get one here](https://console.groq.com/keys))

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/bklieger/codewizard.git
   cd codewizard
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Run the development server**
   ```bash
   npm run dev
   ```

4. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

5. **Configure your API key**
   Click the settings button and enter your Groq API key

---

## Usage

### Getting Started

1. **Ask coding questions**: Type any programming question or request
2. **Get real-time docs**: CodeWizard automatically fetches relevant documentation
3. **View tool execution**: See when CodeWizard is looking up information

### Example Questions

Try asking CodeWizard questions like:

- "How can I pass in tools to Anthropic's messages API?"
- "What embedding products does MongoDB offer?"
- "How do you make responsive design with Tailwind CSS?"
- "How can I get started with a new Supabase project?"
- "What are recent changes to OpenAI's responses API?"

### Supported Libraries

CodeWizard has built-in support for popular libraries including:

| Category | Libraries |
|----------|-----------|
| **AI/ML** | OpenAI, Anthropic, Groq, Perplexity |
| **Frontend** | React, Next.js, Tailwind CSS |
| **Backend** | Express, MongoDB, Prisma, Supabase |
| **Cloud** | Vercel, Firebase, Clerk, Stripe |

CodeWizard can also look up other libraries from the database of about 30,000 on Context7.

---

## Development

### Adding New Libraries

To add support for new libraries, you can submit them on Context7. In addition, if you want to specify a preferred documentation set for a specific framework, you can update the pre-configured library IDs in `src/app/api/chatbot/route.tsx`:

```typescript
// Add the library ID on Context7 to the system prompt
- YourLibrary: /your/library/id
```

### Customizing the UI

- Modify components in `src/components/`
- Update styling with Tailwind classes
- Customize the chat interface in `src/app/page.tsx`

---

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

### Development Setup

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes
4. Run tests and linting: `npm run lint`
5. Commit your changes: `git commit -am 'Add feature'`
6. Push to the branch: `git push origin feature-name`
7. Submit a pull request

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## Acknowledgments

Built by (Benjamin Klieger)[http://github.com/bklieger] as a personal project.

- **Groq** for providing fast AI inference
- **Upstash** for Context7 MCP integration
- **Vercel** for hosting and deployment
- The open-source community for amazing libraries and frameworks
