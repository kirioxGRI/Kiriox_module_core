import type { AiFieldContract } from './AiFieldContract';
import type { KirioxOfficialModuleId } from '@/shared/contracts/modules/module.contract';

// ── Text post-processing ───────────────────────────────────────────────────────

export function cleanAiText(raw: string): string {
  return raw
    .trim()
    // strip markdown bold/italic: **text** → text, *text* → text, __text__ → text
    .replace(/\*{1,3}([^*]*)\*{1,3}/g, '$1')
    // strip markdown headings: ## Título → Título
    .replace(/^#{1,6}\s+/gm, '')
    // strip remaining lone * or # symbols
    .replace(/[*#]/g, '')
    // strip leading quote or dash
    .replace(/^["']|["']$/g, '')
    .replace(/^\s*[-–—]\s*/, '')
    // collapse whitespace
    .replace(/\s+/g, ' ')
    .trim();
}

export function enforceWordLimit(text: string, maxWords: number): string {
  const words = text.split(/\s+/);
  return words.length <= maxWords ? text : words.slice(0, maxWords).join(' ');
}

export function validateAgainstContract(text: string, contract: AiFieldContract): string {
  if (!contract.forbidden?.length) return text;
  let result = text;
  for (const term of contract.forbidden) {
    result = result.replace(new RegExp(term, 'gi'), '');
  }
  return result.replace(/\s+/g, ' ').trim();
}

// ── Chrome built-in AI — Session Pool ─────────────────────────────────────────
// API: window.LanguageModel (Chrome 127+, Gemini Nano)
// Optimization: one session per "session type" — never recreate unless destroyed

export interface ChromeAiSession {
  prompt: (input: string, opts?: { signal?: AbortSignal }) => Promise<string>;
  promptStreaming: (input: string, opts?: { signal?: AbortSignal }) => ReadableStream<string>;
  destroy: () => void;
  contextUsage?: number;
  contextWindow?: number;
}

interface LanguageModelGlobal {
  availability?: (opts?: object) => Promise<string>;
  create: (opts?: {
    expectedInputs?: Array<{ type: string; languages?: string[] }>;
    expectedOutputs?: Array<{ type: string; languages?: string[] }>;
    initialPrompts?: Array<{ role: string; content: string }>;
    temperature?: number;
    topK?: number;
  }) => Promise<ChromeAiSession>;
}

function getLM(): LanguageModelGlobal | null {
  if (typeof window === 'undefined') return null;
  return (window as unknown as { LanguageModel?: LanguageModelGlobal }).LanguageModel ?? null;
}

export function isChromAiAvailable(): boolean {
  const lm = getLM();
  return lm !== null && typeof lm.create === 'function';
}

// ── Session type mapping ───────────────────────────────────────────────────────
// Each type gets a minimal, specialized system prompt — faster than a generic one

type SessionType = 'risk' | 'monitor' | 'company' | 'incident' | 'general';

function getSessionType(module: KirioxOfficialModuleId): SessionType {
  switch (module) {
    case 'linear-risk':
    case 'structural-risk':
      return 'risk';
    case 'monitoring':
      return 'monitor';
    case 'company':
    case 'core':
      return 'company';
    case 'hechos-relevantes':
    case 'incident':
      return 'incident';
    default:
      return 'general';
  }
}

// Minimal system prompts — shorter = faster inference
const SESSION_PROMPTS: Record<SessionType, string> = {
  risk:     'Completas campos de gestión de riesgos. Solo texto del campo. Sin explicación. Sin comillas. Español.',
  monitor:  'Completas campos de monitoreo y control. Solo texto del campo. Sin explicación. Sin comillas. Español.',
  company:  'Completas campos de gestión estratégica. Solo texto del campo. Sin explicación. Sin comillas. Español.',
  incident: 'Completas campos de análisis de incidentes. Solo texto del campo. Sin explicación. Sin comillas. Español.',
  general:  'Completas campos de formularios institucionales. Solo texto del campo. Sin explicación. Sin comillas. Español.',
};

// ── Session pool singleton ─────────────────────────────────────────────────────

const pool = new Map<SessionType, ChromeAiSession>();
const creating = new Map<SessionType, Promise<ChromeAiSession>>();

export async function getKirioxSession(module: KirioxOfficialModuleId): Promise<ChromeAiSession> {
  const lm = getLM();
  if (!lm) throw new Error('Chrome AI no disponible. Requiere Chrome 127+ con Gemini Nano.');

  const type = getSessionType(module);

  // Return existing session immediately
  const existing = pool.get(type);
  if (existing) return existing;

  // Deduplicate concurrent creates for same type
  const pending = creating.get(type);
  if (pending) return pending;

  const promise = (async () => {
    if (lm.availability) {
      const status = await lm.availability({
        expectedInputs: [{ type: 'text', languages: ['es'] }],
        expectedOutputs: [{ type: 'text', languages: ['es'] }],
      });
      if (status === 'unavailable') throw new Error('Gemini Nano no disponible en este equipo.');
      if (status === 'downloadable' || status === 'downloading') throw new Error('El modelo se está descargando. Intenta en unos minutos.');
    }

    const session = await lm.create({
      expectedInputs:  [{ type: 'text', languages: ['es'] }],
      expectedOutputs: [{ type: 'text', languages: ['es'] }],
      initialPrompts:  [{ role: 'system', content: SESSION_PROMPTS[type] }],
    });

    pool.set(type, session);
    creating.delete(type);
    return session;
  })();

  creating.set(type, promise);
  return promise;
}

// ── Warmup ────────────────────────────────────────────────────────────────────
// Call on component mount to pre-heat the session before the user clicks

export async function warmupKirioxAi(module: KirioxOfficialModuleId): Promise<void> {
  if (!isChromAiAvailable()) return;
  try {
    const session = await getKirioxSession(module);
    // Minimal warmup prompt to initialize the model's KV cache
    await session.prompt('hola');
  } catch {
    // Warmup failure is non-fatal
  }
}

// ── Session invalidation (call if session errors mid-use) ─────────────────────

export function invalidateSession(module: KirioxOfficialModuleId): void {
  const type = getSessionType(module);
  const s = pool.get(type);
  if (s) {
    try { s.destroy(); } catch { /* ignore */ }
    pool.delete(type);
  }
}
