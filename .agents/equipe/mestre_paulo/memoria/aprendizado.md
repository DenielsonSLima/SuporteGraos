# 🧠 Aprendizado: Mestre Paulo

## 📅 30/03/2026 - Decisões Arquiteturais
- **Padrão:** Implementada a estrutura de "Equipe Distribuída" dentro do diretório `.agents/`.
- **Racional:** Reduz o "noise" de contexto global e permite que cada agente foque no seu domínio (Frontend, Backend, etc.).
- **Alerta:** Vigiar para que a comunicação entre agentes via `reunioes_gerais` não se perca.
