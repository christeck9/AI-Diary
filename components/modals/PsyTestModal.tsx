import React, { useState } from 'react';
/**
 * PSYCHOMETRIC FOUNDATIONS - AI DIARY (v2.0 — Fixed Results Visualizer)
 * -------------------------------------------------------------------
 * FIX v2.0: Results are stored in LOCAL state computed immediately when
 * the last answer is pressed — NOT read from the async psyProfile context.
 * This guarantees results screen shows correct data right away.
 * Tests: OCEAN+, Aptitude, Vocational, Anxiety/Balance, Mood, MBTI 16r.
 */
import {
  Modal, View, Text, TouchableOpacity, ScrollView, StyleSheet,
  Platform, SafeAreaView, Animated, Easing,
} from 'react-native';

export interface PsyProfile {
  O: number; C: number; E: number; A: number; N: number; D: number; L: number;
  aptitudeScore?: number; vocationalType?: string; anxietyLevel?: string;
  moodBalance?: number; mbtiType?: string;
}
export type TestType = 'ocean' | 'aptitude' | 'vocational' | 'anxiety' | 'mood' | 'mbti';

interface PsyTestModalProps {
  visible: boolean; onClose: () => void; lang: 'en' | 'es'; colors: any;
  psyProfile: PsyProfile; psyStep: number; setPsyStep: (step: number) => void;
  psyAnswers: number[]; setPsyAnswers: (answers: number[] | ((prev: number[]) => number[])) => void;
  activeTest: TestType; scoreTest: (type: TestType, answers: number[]) => void;
}

// ─── Self-contained scoring (no async context dependency) ─────────────────────

function scoreOcean(answers: number[], questions: any[]): Record<string, number> {
  const dims: Record<string, number[]> = { O: [], C: [], E: [], A: [], N: [], D: [], L: [] };
  answers.forEach((ansIdx, i) => {
    const opt = questions[i]?.opts[ansIdx];
    if (opt?.dim && dims[opt.dim] !== undefined) dims[opt.dim].push(opt.val ?? 0);
  });
  const avg = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0.5;
  return { O: avg(dims.O), C: avg(dims.C), E: avg(dims.E), A: avg(dims.A), N: avg(dims.N), D: avg(dims.D), L: avg(dims.L) };
}

function scoreAptitude(answers: number[], questions: any[]): number {
  let correct = 0;
  answers.forEach((ansIdx, i) => { if (questions[i]?.opts[ansIdx]?.correct === true) correct++; });
  return correct / Math.max(questions.length, 1);
}

function scoreVocational(answers: number[], questions: any[]): Record<string, number> {
  const dims: Record<string, number> = { R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 };
  answers.forEach((ansIdx, i) => {
    const qType = questions[i]?.opts[0]?.type as string;
    if (qType && dims[qType] !== undefined) {
      dims[qType] += ansIdx === 0 ? 1 : ansIdx === 1 ? 0.7 : ansIdx === 2 ? 0.4 : 0;
    }
  });
  return dims;
}

function scoreAnxiety(answers: number[], questions: any[]): { score: number; level: string } {
  const total = answers.reduce((sum, ansIdx, i) => sum + (questions[i]?.opts[ansIdx]?.val ?? 0), 0);
  const pct = total / (questions.length * 3);
  const level = pct < 0.2 ? 'minimal' : pct < 0.4 ? 'mild' : pct < 0.6 ? 'moderate' : 'severe';
  return { score: 1 - pct, level };
}

function scoreMood(answers: number[], questions: any[]): number {
  const total = answers.reduce((sum, ansIdx, i) => sum + (questions[i]?.opts[ansIdx]?.val ?? 0), 0);
  return 1 - total / (questions.length * 3);
}

function scoreMbti(answers: number[], questions: any[]): string {
  const dims: Record<string, number> = { E: 0, I: 0, S: 0, N: 0, T: 0, F: 0, J: 0, P: 0 };
  answers.forEach((ansIdx, i) => { const opt = questions[i]?.opts[ansIdx]; if (opt?.dim) dims[opt.dim]++; });
  return (dims.E >= dims.I ? 'E' : 'I') + (dims.S >= dims.N ? 'S' : 'N') +
         (dims.T >= dims.F ? 'T' : 'F') + (dims.J >= dims.P ? 'J' : 'P');
}

// ─── MBTI Archetypes ──────────────────────────────────────────────────────────
const MBTI_ARCHETYPES: Record<string, { emoji: string; en: string; es: string; desc_en: string; desc_es: string }> = {
  INTJ: { emoji: '🏛️', en: 'The Architect',    es: 'El Arquitecto',  desc_en: 'Strategic, independent, driven by vision.',        desc_es: 'Estratégico, independiente, guiado por la visión.' },
  INTP: { emoji: '🔬', en: 'The Thinker',      es: 'El Pensador',    desc_en: 'Innovative logician who loves ideas.',             desc_es: 'Lógico innovador que ama las ideas.' },
  ENTJ: { emoji: '⚡', en: 'The Commander',    es: 'El Comandante',  desc_en: 'Bold leader who always finds a way.',              desc_es: 'Líder audaz que siempre encuentra el camino.' },
  ENTP: { emoji: '💡', en: 'The Debater',      es: 'El Debatidor',   desc_en: 'Quick-witted, loves intellectual challenges.',     desc_es: 'Mente ágil, ama los retos intelectuales.' },
  INFJ: { emoji: '🌿', en: 'The Advocate',     es: 'El Defensor',    desc_en: 'Quiet idealist with deep insights.',              desc_es: 'Idealista tranquilo con visión profunda.' },
  INFP: { emoji: '🦋', en: 'The Mediator',     es: 'El Mediador',    desc_en: 'Poetic, empathetic, values authenticity.',        desc_es: 'Poético, empático, valora la autenticidad.' },
  ENFJ: { emoji: '🌟', en: 'The Protagonist',  es: 'El Protagonista',desc_en: 'Charismatic leader who inspires others.',         desc_es: 'Líder carismático que inspira a los demás.' },
  ENFP: { emoji: '🎇', en: 'The Campaigner',   es: 'El Inspirador',  desc_en: 'Enthusiastic creative; life is full of possibilities.', desc_es: 'Creativo entusiasta; ve la vida llena de posibilidades.' },
  ISTJ: { emoji: '📋', en: 'The Logistician',  es: 'El Logístico',   desc_en: 'Practical, reliable, detail-oriented.',           desc_es: 'Práctico, confiable, orientado al detalle.' },
  ISFJ: { emoji: '🛡️', en: 'The Defender',     es: 'El Protector',   desc_en: 'Dedicated, warm protector.',                     desc_es: 'Protector dedicado y cálido.' },
  ESTJ: { emoji: '⚖️', en: 'The Executive',    es: 'El Ejecutivo',   desc_en: 'Order, structure, tradition — the manager.',      desc_es: 'Orden, estructura, tradición — el gestor.' },
  ESFJ: { emoji: '🤝', en: 'The Consul',       es: 'El Cónsul',      desc_en: 'Popular, caring, social harmony seeker.',         desc_es: 'Popular, solidario, busca armonía social.' },
  ISTP: { emoji: '🔧', en: 'The Virtuoso',     es: 'El Virtuoso',    desc_en: 'Bold experimenter who masters tools.',            desc_es: 'Experimentador audaz, maestro de herramientas.' },
  ISFP: { emoji: '🎨', en: 'The Adventurer',   es: 'El Aventurero',  desc_en: 'Flexible artist, true to their nature.',          desc_es: 'Artista flexible, fiel a su naturaleza.' },
  ESTP: { emoji: '🏄', en: 'The Entrepreneur', es: 'El Emprendedor', desc_en: 'Smart, energetic, perceptive.',                   desc_es: 'Inteligente, enérgico, perspicaz.' },
  ESFP: { emoji: '🎭', en: 'The Entertainer',  es: 'El Animador',    desc_en: 'Spontaneous, energetic, brings joy.',             desc_es: 'Espontáneo, enérgico, trae alegría.' },
};

// ─── Holland Vocational Labels ────────────────────────────────────────────────
const HOLLAND_LABELS: Record<string, { emoji: string; en: string; es: string; careers_en: string; careers_es: string }> = {
  R: { emoji: '🔨', en: 'Realistic',     es: 'Realista',     careers_en: 'Engineering, Trades, Agriculture',       careers_es: 'Ingeniería, Oficios, Agricultura' },
  I: { emoji: '🔭', en: 'Investigative', es: 'Investigador', careers_en: 'Science, Research, Medicine',            careers_es: 'Ciencia, Investigación, Medicina' },
  A: { emoji: '🎨', en: 'Artistic',      es: 'Artístico',    careers_en: 'Design, Music, Writing',                 careers_es: 'Diseño, Música, Escritura' },
  S: { emoji: '🤗', en: 'Social',        es: 'Social',       careers_en: 'Teaching, Counseling, Healthcare',       careers_es: 'Docencia, Consejería, Salud' },
  E: { emoji: '💼', en: 'Enterprising',  es: 'Emprendedor',  careers_en: 'Business, Law, Management',              careers_es: 'Negocios, Derecho, Gestión' },
  C: { emoji: '📊', en: 'Conventional',  es: 'Convencional', careers_en: 'Accounting, Administration, Finance',    careers_es: 'Contabilidad, Administración, Finanzas' },
};

// ─── OCEAN dimension metadata ─────────────────────────────────────────────────
const OCEAN_META: Record<string, { emoji: string; color: string; label_en: string; label_es: string }> = {
  O: { emoji: '🔭', color: '#a855f7', label_en: 'Openness',          label_es: 'Apertura' },
  C: { emoji: '📋', color: '#3b82f6', label_en: 'Conscientiousness', label_es: 'Responsabilidad' },
  E: { emoji: '🌟', color: '#f59e0b', label_en: 'Extraversion',      label_es: 'Extraversión' },
  A: { emoji: '🤝', color: '#10b981', label_en: 'Agreeableness',     label_es: 'Amabilidad' },
  N: { emoji: '⚓', color: '#06b6d4', label_en: 'Stability',         label_es: 'Estabilidad' },
  D: { emoji: '⚡', color: '#f97316', label_en: 'Decision Speed',    label_es: 'Velocidad de Decisión' },
  L: { emoji: '📚', color: '#8b5cf6', label_en: 'Learning Style',    label_es: 'Estilo de Aprendizaje' },
};

// ─── Animated horizontal bar ───────────────────────────────────────────────────
const AnimatedBar: React.FC<{ label: string; emoji: string; value: number; color: string; colors: any; delay: number }> =
  ({ label, emoji, value, color, colors, delay }) => {
  const [width] = useState(new Animated.Value(0));
  React.useEffect(() => {
    Animated.timing(width, {
      toValue: Math.max(0, Math.min(1, value)), duration: 600, delay,
      easing: Easing.out(Easing.cubic), useNativeDriver: false,
    }).start();
  }, [value]);
  return (
    <View style={{ marginBottom: 14 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
        <Text style={{ color: colors.textPrimary, fontWeight: '600', fontSize: 14 }}>{emoji}  {label}</Text>
        <Text style={{ color, fontSize: 14, fontWeight: 'bold' }}>{Math.round(value * 100)}%</Text>
      </View>
      <View style={{ backgroundColor: colors.surfaceSecondary, height: 10, borderRadius: 5, overflow: 'hidden' }}>
        <Animated.View style={{
          backgroundColor: color, height: 10, borderRadius: 5,
          width: width.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
        }} />
      </View>
    </View>
  );
};

// ─── Circular gauge indicator ─────────────────────────────────────────────────
const GaugeIndicator: React.FC<{ score: number; color: string; label: string; colors: any }> =
  ({ score, color, label, colors }) => (
  <View style={{ alignItems: 'center', marginVertical: 16 }}>
    <View style={{
      width: 120, height: 120, borderRadius: 60, borderWidth: 12,
      borderColor: colors.surfaceSecondary, justifyContent: 'center',
      alignItems: 'center', backgroundColor: colors.surface,
      shadowColor: color, shadowOpacity: 0.35, shadowRadius: 14, elevation: 8,
    }}>
      <Text style={{ color, fontSize: 26, fontWeight: 'bold' }}>{Math.round(score * 100)}%</Text>
    </View>
    <Text style={{ color: colors.textPrimary, fontWeight: 'bold', fontSize: 15, marginTop: 12 }}>{label}</Text>
  </View>
);

export const PSY_QUESTIONS = [
  // Core 10 questions (Indices 0-9)
  { q_en: "It's Friday night and you have free energy. What do you do?", q_es: "Es viernes por la noche y tienes energía libre. ¿Qué haces?",
    opts: [
      { en: "Go out with friends", es: "Salgo con amigos", dim: 'E', val: 1 },
      { en: "Read or research something", es: "Leo o investigo algo", dim: 'O', val: 1 },
      { en: "Organize my pending tasks", es: "Organizo mis pendientes", dim: 'C', val: 1 },
      { en: "Rest with no plan", es: "Descanso sin plan", dim: 'N', val: 1 },
    ] },
  { q_en: "A friend asks you for brutally honest feedback on their project. You...", q_es: "Un amigo te pide opinión brutalmente honesta sobre su proyecto. Tú...",
    opts: [
      { en: "Tell the truth directly", es: "Le digo la verdad directamente", dim: 'A', val: 0 },
      { en: "Soften it with encouragement", es: "Lo suavizo con ánimo", dim: 'A', val: 1 },
      { en: "Give a detailed written analysis", es: "Le doy un análisis detallado por escrito", dim: 'C', val: 1 },
      { en: "Ask what kind of feedback they want first", es: "Le pregunto primero qué tipo de opinión quiere", dim: 'E', val: 0.5 },
    ] },
  { q_en: "You need to make an important decision. You prefer to...", q_es: "Tienes que tomar una decisión importante. Prefieres...",
    opts: [
      { en: "Decide quickly with my gut", es: "Decidir rápido con instinto", dim: 'D', val: 1 },
      { en: "Research thoroughly, then decide", es: "Investigar a fondo y luego decidir", dim: 'D', val: 0 },
      { en: "Ask people I trust", es: "Preguntar a personas de confianza", dim: 'E', val: 1 },
      { en: "Sleep on it for a day", es: "Consultarlo con la almohada", dim: 'N', val: 1 },
    ] },
  { q_en: "When learning something new, you prefer...", q_es: "Al aprender algo nuevo, prefieres...",
    opts: [
      { en: "Hands-on examples first", es: "Ejemplos prácticos primero", dim: 'L', val: 1 },
      { en: "Theory and concepts first", es: "Teoría y conceptos primero", dim: 'L', val: 0 },
      { en: "A video or visual explanation", es: "Un video o explicación visual", dim: 'O', val: 0.5 },
      { en: "Figuring it out myself", es: "Descubrirlo yo mismo/a", dim: 'O', val: 1 },
    ] },
  { q_en: "At a party with strangers, you...", q_es: "En una fiesta con desconocidos, tú...",
    opts: [
      { en: "Talk to everyone naturally", es: "Hablo con todos naturalmente", dim: 'E', val: 1 },
      { en: "Find one interesting person to talk to", es: "Encuentro a una persona interesante", dim: 'O', val: 0.7 },
      { en: "Stay near people I know", es: "Me quedo cerca de quienes conozco", dim: 'E', val: 0.3 },
      { en: "Leave early", es: "Me voy temprano", dim: 'E', val: 0 },
    ] },
  { q_en: "Your workspace is usually...", q_es: "Tu espacio de trabajo normalmente está...",
    opts: [
      { en: "Perfectly organized", es: "Perfectamente organizado", dim: 'C', val: 1 },
      { en: "Organized chaos — I know where everything is", es: "Caos organizado — sé dónde está todo", dim: 'C', val: 0.5 },
      { en: "Messy, I clean when inspired", es: "Desordenado, limpio cuando me inspiro", dim: 'O', val: 0.7 },
      { en: "Depends on my mood", es: "Depende de mi ánimo", dim: 'N', val: 0.5 },
    ] },
  { q_en: "When facing a stressful situation, you...", q_es: "Ante una situación estresante, tú...",
    opts: [
      { en: "Take immediate action", es: "Tomo acción inmediata", dim: 'D', val: 1 },
      { en: "Need space to think alone", es: "Necesito espacio para pensar solo/a", dim: 'E', val: 0 },
      { en: "Talk it out with someone", es: "Lo hablo con alguien", dim: 'A', val: 0.7 },
      { en: "Make a list and prioritize", es: "Hago una lista y priorizo", dim: 'C', val: 1 },
    ] },
  { q_en: "A stranger drops their groceries. You...", q_es: "Un desconocido tira sus compras al suelo. Tú...",
    opts: [
      { en: "Help immediately without thinking", es: "Ayudo de inmediato sin pensar", dim: 'A', val: 1 },
      { en: "Help if no one else does", es: "Ayudo si nadie más lo hace", dim: 'A', val: 0.5 },
      { en: "Feel bad but keep walking", es: "Me siento mal pero sigo caminando", dim: 'A', val: 0.2 },
      { en: "Depends on my rush level", es: "Depende de la prisa que lleve", dim: 'D', val: 0.5 },
    ] },
  { q_en: "You receive unexpected criticism at work. You...", q_es: "Recibes una crítica inesperada en el trabajo. Tú...",
    opts: [
      { en: "Analyze it objectively", es: "La analizo objetivamente", dim: 'N', val: 1 },
      { en: "Feel hurt but try to learn", es: "Me duele pero intento aprender", dim: 'N', val: 0.5 },
      { en: "Defend my position", es: "Defiendo mi postura", dim: 'D', val: 0.8 },
      { en: "It stays on my mind for days", es: "Se queda en mi mente por días", dim: 'N', val: 0 },
    ] },
  { q_en: "Your ideal vacation is...", q_es: "Tus vacaciones ideales son...",
    opts: [
      { en: "Exploring a new culture", es: "Explorar una cultura nueva", dim: 'O', val: 1 },
      { en: "A well-planned itinerary", es: "Un itinerario bien planeado", dim: 'C', val: 1 },
      { en: "Relaxing on a beach", es: "Relajarme en la playa", dim: 'N', val: 0.8 },
      { en: "Adventure sports", es: "Deportes de aventura", dim: 'D', val: 1 },
    ] },
  // Extension (Indices 10-24)
  { q_en: "When someone disagrees with you, you...", q_es: "Cuando alguien no está de acuerdo contigo, tú...",
    opts: [
      { en: "Enjoy the debate", es: "Disfruto el debate", dim: 'O', val: 1 },
      { en: "Try to find common ground", es: "Busco un punto medio", dim: 'A', val: 1 },
      { en: "Get frustrated inside", es: "Me frustro internamente", dim: 'N', val: 0 },
      { en: "Let it go — not worth the energy", es: "Lo dejo pasar — no vale la energía", dim: 'E', val: 0.3 },
    ] },
  { q_en: "When explaining something to someone, you tend to...", q_es: "Al explicar algo a alguien, tiendes a...",
    opts: [
      { en: "Use analogies and metaphors", es: "Usar analogías y metáforas", dim: 'O', val: 1 },
      { en: "Be precise and step-by-step", es: "Ser preciso y paso a paso", dim: 'C', val: 1 },
      { en: "Adjust to their level", es: "Ajustarme a su nivel", dim: 'A', val: 0.8 },
      { en: "Keep it as short as possible", es: "Hacerlo lo más breve posible", dim: 'D', val: 0.7 },
    ] },
  { q_en: "Your phone notifications are...", q_es: "Las notificaciones de tu teléfono están...",
    opts: [
      { en: "All on — I don't miss anything", es: "Todas encendidas — no me pierdo nada", dim: 'E', val: 1 },
      { en: "Only the essentials", es: "Solo las esenciales", dim: 'C', val: 0.8 },
      { en: "Mostly silenced", es: "Casi todas silenciadas", dim: 'E', val: 0 },
      { en: "I check manually when I want", es: "Las reviso manualmente cuando quiero", dim: 'D', val: 0.5 },
    ] },
  { q_en: "What motivates you the most?", q_es: "¿Qué te motiva más?",
    opts: [
      { en: "Achieving my goals", es: "Lograr mis metas", dim: 'D', val: 1 },
      { en: "Helping others", es: "Ayudar a otros", dim: 'A', val: 1 },
      { en: "Learning new things", es: "Aprender cosas nuevas", dim: 'O', val: 1 },
      { en: "Security and stability", es: "Seguridad y estabilidad", dim: 'N', val: 1 },
    ] },
  { q_en: "Before sleeping, you usually...", q_es: "Antes de dormir, normalmente...",
    opts: [
      { en: "Plan tomorrow's tasks", es: "Planeo las tareas de mañana", dim: 'C', val: 1 },
      { en: "Scroll social media", es: "Reviso redes sociales", dim: 'E', val: 0.7 },
      { en: "Read or watch something interesting", es: "Leo o veo algo interesante", dim: 'L', val: 0.5 },
      { en: "Overthink the day", es: "Le doy muchas vueltas al día", dim: 'N', val: 0 },
    ] },
  { q_en: "How do you handle unexpected changes in plan?", q_es: "¿Cómo manejas los cambios inesperados de planes?",
    opts: [
      { en: "Adapt instantly", es: "Me adapto al instante", dim: 'O', val: 1 },
      { en: "Get annoyed but follow along", es: "Me molesto pero sigo adelante", dim: 'C', val: 0.5 },
      { en: "Try to regain control", es: "Intento retomar el control", dim: 'D', val: 0.8 },
      { en: "Feel anxious or stressed", es: "Siento ansiedad o estrés", dim: 'N', val: 0 },
    ] },
  { q_en: "In a group project, you naturally...", q_es: "En un proyecto grupal, tú naturalmente...",
    opts: [
      { en: "Lead the direction", es: "Lidero el rumbo", dim: 'D', val: 1 },
      { en: "Do my assigned part perfectly", es: "Hago mi parte asignada perfecto", dim: 'C', val: 1 },
      { en: "Mediate conflicts", es: "Medio en los conflictos", dim: 'A', val: 1 },
      { en: "Bring creative ideas", es: "Aporto ideas creativas", dim: 'O', val: 1 },
    ] },
  { q_en: "When you have a long list of tasks, you...", q_es: "Cuando tienes una lista larga de tareas, tú...",
    opts: [
      { en: "Start with the hardest one", es: "Empiezo por la más difícil", dim: 'D', val: 1 },
      { en: "Organize them by priority", es: "Las organizo por prioridad", dim: 'C', val: 1 },
      { en: "Procrastinate a bit first", es: "Dejo pasar el tiempo un poco", dim: 'N', val: 0.5 },
      { en: "Do the quickest ones first", es: "Hago las más rápidas primero", dim: 'D', val: 0.5 },
    ] },
  { q_en: "How do you feel about public speaking?", q_es: "¿Cómo te sientes hablando en público?",
    opts: [
      { en: "Love the attention", es: "Me encanta la atención", dim: 'E', val: 1 },
      { en: "Prepare extensively to feel safe", es: "Me preparo mucho para estar seguro", dim: 'C', val: 0.8 },
      { en: "Terrified but I do it", es: "Aterrado pero lo hago", dim: 'N', val: 0.3 },
      { en: "Focus on the message, not the audience", es: "Me enfoco en el mensaje, no en el público", dim: 'O', val: 0.7 },
    ] },
  { q_en: "When someone is sad, you usually...", q_es: "Cuando alguien está triste, normalmente tú...",
    opts: [
      { en: "Offer practical solutions", es: "Ofrezco soluciones prácticas", dim: 'D', val: 0.7 },
      { en: "Listen and empathize", es: "Escucho y empatizo", dim: 'A', val: 1 },
      { en: "Give them space", es: "Les doy su espacio", dim: 'E', val: 0 },
      { en: "Try to cheer them up with humor", es: "Intento animarlos con humor", dim: 'E', val: 1 },
    ] },
  { q_en: "Your long-term goals are...", q_es: "Tus metas a largo plazo están...",
    opts: [
      { en: "Written down in detail", es: "Escritas detalladamente", dim: 'C', val: 1 },
      { en: "In my head, mostly clear", es: "En mi cabeza, bastante claras", dim: 'O', val: 0.7 },
      { en: "Changing frequently", es: "Cambiando frecuentemente", dim: 'O', val: 1 },
      { en: "I focus on the present", es: "Me enfoco en el presente", dim: 'N', val: 1 },
    ] },
  { q_en: "When starting a new hobby, you...", q_es: "Al empezar un nuevo hobby, tú...",
    opts: [
      { en: "Buy all the best gear immediately", es: "Compro todo el equipo mejor de inmediato", dim: 'D', val: 1 },
      { en: "Read all about it first", es: "Leo todo al respecto primero", dim: 'L', val: 1 },
      { en: "Look for a community or group", es: "Busco una comunidad o grupo", dim: 'E', val: 1 },
      { en: "Experiment by trial and error", es: "Experimento por prueba y error", dim: 'O', val: 1 },
    ] },
  { q_en: "How do you react to a complex puzzle?", q_es: "¿Cómo reaccionas ante un acertijo complejo?",
    opts: [
      { en: "Excited by the challenge", es: "Emocionado por el reto", dim: 'O', val: 1 },
      { en: "Patiently analyze it", es: "Lo analizo pacientemente", dim: 'C', val: 1 },
      { en: "Get frustrated quickly", es: "Me frustro rápido", dim: 'N', val: 0 },
      { en: "Ask for a hint", es: "Pido una pista", dim: 'A', val: 0.5 },
    ] },
  { q_en: "When you witness an injustice, you...", q_es: "Cuando presencias una injusticia, tú...",
    opts: [
      { en: "Intervene immediately", es: "Intervengo de inmediato", dim: 'D', val: 1 },
      { en: "Express my disagreement loudly", es: "Expreso mi desacuerdo fuerte", dim: 'E', val: 1 },
      { en: "Report it through proper channels", es: "Lo reporto por los canales adecuados", dim: 'C', val: 1 },
      { en: "Feel powerlessly angry", es: "Siento una rabia impotente", dim: 'N', val: 0 },
    ] },
  { q_en: "Your social circle is...", q_es: "Tu círculo social es...",
    opts: [
      { en: "Very large and diverse", es: "Muy grande y diverso", dim: 'E', val: 1 },
      { en: "Small but very deep", es: "Pequeño pero muy profundo", dim: 'A', val: 1 },
      { en: "Selective based on interests", es: "Selectivo según intereses", dim: 'O', val: 0.8 },
      { en: "Mostly work or study related", es: "Principalmente de trabajo o estudio", dim: 'C', val: 0.6 },
    ] },
];

export const APTITUDE_QUESTIONS = [
  { q_en: "Which number follows the sequence: 2, 4, 8, 16...", q_es: "¿Qué número sigue la serie: 2, 4, 8, 16...", 
    opts: [{ en: "32", es: "32", val: 1, correct: true }, { en: "24", es: "24", val: 0 }, { en: "64", es: "64", val: 0 }, { en: "20", es: "20", val: 0 }] },
  { q_en: "Complete: 'Sun' is to 'Day' as 'Moon' is to...", q_es: "Completa: 'Sol' es a 'Día' como 'Luna' es a...",
    opts: [{ en: "Night", es: "Noche", val: 1, correct: true }, { en: "Stars", es: "Estrellas", val: 0 }, { en: "Dark", es: "Oscuridad", val: 0 }, { en: "Sleep", es: "Dormir", val: 0 }] },
  { q_en: "If all Roses are flowers, and some flowers fade, then...", q_es: "Si todas las Rosas son flores, y algunas flores se marchitan, entonces...",
    opts: [{ en: "Some Roses might fade", es: "Algunas Rosas podrían marchitarse", val: 1, correct: true }, { en: "All Roses fade", es: "Todas las Rosas se marchitan", val: 0 }, { en: "No Roses fade", es: "Ninguna Rosa se marchita", val: 0 }, { en: "Flowers are Roses", es: "Las flores son Rosas", val: 0 }] },
  { q_en: "Which word does NOT belong?", q_es: "¿Qué palabra NO pertenece al grupo?",
    opts: [{ en: "Apple", es: "Manzana", val: 0 }, { en: "Carrot", es: "Zanahoria", val: 1, correct: true }, { en: "Banana", es: "Plátano", val: 0 }, { en: "Grape", es: "Uva", val: 0 }] },
  { q_en: "Solve: 15 + (12 / 3) =", q_es: "Resuelve: 15 + (12 / 3) =",
    opts: [{ en: "19", es: "19", val: 1, correct: true }, { en: "9", es: "9", val: 0 }, { en: "27", es: "27", val: 0 }, { en: "18", es: "18", val: 0 }] },
  { q_en: "A train travels 60km in 1 hour. How long for 150km?", q_es: "Un tren viaja 60km en 1 hora. ¿Cuánto tarda en 150km?",
    opts: [{ en: "2.5 hours", es: "2.5 horas", val: 1, correct: true }, { en: "2 hours", es: "2 horas", val: 0 }, { en: "3 hours", es: "3 horas", val: 0 }, { en: "1.5 hours", es: "1.5 horas", val: 0 }] },
  { q_en: "Opposite of 'Stagnant' is...", q_es: "Lo opuesto de 'Estancado' es...",
    opts: [{ en: "Flowing", es: "Fluido", val: 1, correct: true }, { en: "Still", es: "Quieto", val: 0 }, { en: "Old", es: "Viejo", val: 0 }, { en: "Heavy", es: "Pesado", val: 0 }] },
  { q_en: "Which shape comes next: Circle, Square, Circle...", q_es: "¿Qué forma sigue: Círculo, Cuadrado, Círculo...",
    opts: [{ en: "Square", es: "Cuadrado", val: 1, correct: true }, { en: "Triangle", es: "Triángulo", val: 0 }, { en: "Circle", es: "Círculo", val: 0 }, { en: "Hexagon", es: "Hexágono", val: 0 }] },
  { q_en: "If 3 cats catch 3 mice in 3 minutes, how long for 100 cats to catch 100 mice?", q_es: "Si 3 gatos cazan 3 ratones en 3 min, ¿cuánto tardan 100 gatos en cazar 100 ratones?",
    opts: [{ en: "3 minutes", es: "3 minutos", val: 1, correct: true }, { en: "100 minutes", es: "100 minutos", val: 0 }, { en: "1 minute", es: "1 minuto", val: 0 }, { en: "33 minutes", es: "33 minutos", val: 0 }] },
  { q_en: "Rearrange 'EART' to find a planet.", q_es: "Reordena 'EART' para hallar un planeta.",
    opts: [{ en: "Earth", es: "Tierra", val: 1, correct: true }, { en: "Mars", es: "Marte", val: 0 }, { en: "Venus", es: "Venus", val: 0 }, { en: "Jupiter", es: "Júpiter", val: 0 }] },
  { q_en: "Which is the largest fraction?", q_es: "¿Cuál es la fracción más grande?",
    opts: [{ en: "1/2", es: "1/2", val: 0 }, { en: "3/4", es: "3/4", val: 1, correct: true }, { en: "2/3", es: "2/3", val: 0 }, { en: "5/8", es: "5/8", val: 0 }] },
  { q_en: "If you rotate a 'P' 180 degrees, it looks like...", q_es: "Si giras una 'P' 180 grados, se parece a...",
    opts: [{ en: "d", es: "d", val: 1, correct: true }, { en: "b", es: "b", val: 0 }, { en: "q", es: "q", val: 0 }, { en: "p", es: "p", val: 0 }] },
  { q_en: "Complete the series: J, F, M, A, M, J...", q_es: "Completa la serie: E, F, M, A, M, J...",
    opts: [{ en: "J (July)", es: "J (Julio)", val: 1, correct: true }, { en: "A (August)", es: "A (Agosto)", val: 0 }, { en: "S", es: "S", val: 0 }, { en: "O", es: "O", val: 0 }] },
  { q_en: "A box has 4 red balls and 6 blue balls. Probability of red?", q_es: "Una caja tiene 4 bolas rojas y 6 azules. ¿Probabilidad de roja?",
    opts: [{ en: "0.4", es: "0.4", val: 1, correct: true }, { en: "0.6", es: "0.6", val: 0 }, { en: "0.5", es: "0.5", val: 0 }, { en: "4/6", es: "4/6", val: 0 }] },
  { q_en: "Which word means 'to improve'?", q_es: "¿Qué palabra significa 'mejorar'?",
    opts: [{ en: "Ameliorate", es: "Aminorar", val: 1, correct: true }, { en: "Deteriorate", es: "Deteriorar", val: 0 }, { en: "Stagnate", es: "Estancar", val: 0 }, { en: "Vitiate", es: "Viciar", val: 0 }] },
  { q_en: "If X is taller than Y, and Y is taller than Z...", q_es: "Si X es más alto que Y, e Y más alto que Z...",
    opts: [{ en: "X is the tallest", es: "X es el más alto", val: 1, correct: true }, { en: "Z is the tallest", es: "Z es el más alto", val: 0 }, { en: "Y is the tallest", es: "Y es el más alto", val: 0 }, { en: "None", es: "Ninguno", val: 0 }] },
  { q_en: "How many degrees in a triangle?", q_es: "¿Cuántos grados hay en un triángulo?",
    opts: [{ en: "180", es: "180", val: 1, correct: true }, { en: "90", es: "90", val: 0 }, { en: "360", es: "360", val: 0 }, { en: "270", es: "270", val: 0 }] },
  { q_en: "What is the square root of 81?", q_es: "¿Cuál es la raíz cuadrada de 81?",
    opts: [{ en: "9", es: "9", val: 1, correct: true }, { en: "7", es: "7", val: 0 }, { en: "8", es: "8", val: 0 }, { en: "11", es: "11", val: 0 }] },
  { q_en: "Which is a prime number?", q_es: "¿Cuál es un número primo?",
    opts: [{ en: "17", es: "17", val: 1, correct: true }, { en: "15", es: "15", val: 0 }, { en: "21", es: "21", val: 0 }, { en: "9", es: "9", val: 0 }] },
  { q_en: "A clock shows 3:15. What is the angle between hands?", q_es: "Un reloj marca las 3:15. ¿Ángulo entre las manecillas?",
    opts: [{ en: "7.5°", es: "7.5°", val: 1, correct: true }, { en: "0°", es: "0°", val: 0 }, { en: "15°", es: "15°", val: 0 }, { en: "90°", es: "90°", val: 0 }] },
  { q_en: "Which country is an island?", q_es: "¿Qué país es una isla?",
    opts: [{ en: "Japan", es: "Japón", val: 1, correct: true }, { en: "Brazil", es: "Brasil", val: 0 }, { en: "Egypt", es: "Egipto", val: 0 }, { en: "Canada", es: "Canadá", val: 0 }] },
  { q_en: "What is 20% of 200?", q_es: "¿Cuánto es el 20% de 200?",
    opts: [{ en: "40", es: "40", val: 1, correct: true }, { en: "20", es: "20", val: 0 }, { en: "50", es: "50", val: 0 }, { en: "100", es: "100", val: 0 }] },
  { q_en: "If a=5 and b=10, then 2a + b =", q_es: "Si a=5 y b=10, entonces 2a + b =",
    opts: [{ en: "20", es: "20", val: 1, correct: true }, { en: "15", es: "15", val: 0 }, { en: "25", es: "25", val: 0 }, { en: "30", es: "30", val: 0 }] },
  { q_en: "Which word is a synonym for 'Vibrant'?", q_es: "¿Qué palabra es sinónimo de 'Vibrante'?",
    opts: [{ en: "Energetic", es: "Enérgico", val: 1, correct: true }, { en: "Dull", es: "Apagado", val: 0 }, { en: "Quiet", es: "Silencioso", val: 0 }, { en: "Slow", es: "Lento", val: 0 }] },
  { q_en: "If a doctor gives you 3 pills to take one every 30 mins...", q_es: "Si un médico te da 3 pastillas para tomar una cada 30 min...",
    opts: [{ en: "It lasts 1 hour", es: "Dura 1 hora", val: 1, correct: true }, { en: "It lasts 1.5 hours", es: "Dura 1.5 horas", val: 0 }, { en: "It lasts 30 mins", es: "Dura 30 min", val: 0 }, { en: "It lasts 2 hours", es: "Dura 2 horas", val: 0 }] },
];

export const VOCATIONAL_QUESTIONS = [
  { q_en: "I like to work with tools and machines.", q_es: "Me gusta trabajar con herramientas y máquinas.", 
    opts: [{ en: "Strongly Agree", es: "Muy de acuerdo", val: 1, type: 'R' }, { en: "Agree", es: "De acuerdo", val: 0.7 }, { en: "Neutral", es: "Neutral", val: 0.5 }, { en: "Disagree", es: "En desacuerdo", val: 0 }] },
  { q_en: "I enjoy solving complex scientific problems.", q_es: "Disfruto resolviendo problemas científicos complejos.",
    opts: [{ en: "Strongly Agree", es: "Muy de acuerdo", val: 1, type: 'I' }, { en: "Agree", es: "De acuerdo", val: 0.7 }, { en: "Neutral", es: "Neutral", val: 0.5 }, { en: "Disagree", es: "En desacuerdo", val: 0 }] },
  { q_en: "I like to create original artistic works.", q_es: "Me gusta crear obras artísticas originales.",
    opts: [{ en: "Strongly Agree", es: "Muy de acuerdo", val: 1, type: 'A' }, { en: "Agree", es: "De acuerdo", val: 0.7 }, { en: "Neutral", es: "Neutral", val: 0.5 }, { en: "Disagree", es: "En desacuerdo", val: 0 }] },
  { q_en: "I like helping people with their problems.", q_es: "Me gusta ayudar a la gente con sus problemas.",
    opts: [{ en: "Strongly Agree", es: "Muy de acuerdo", val: 1, type: 'S' }, { en: "Agree", es: "De acuerdo", val: 0.7 }, { en: "Neutral", es: "Neutral", val: 0.5 }, { en: "Disagree", es: "En desacuerdo", val: 0 }] },
  { q_en: "I enjoy leading and managing a team.", q_es: "Disfruto liderando y dirigiendo un equipo.",
    opts: [{ en: "Strongly Agree", es: "Muy de acuerdo", val: 1, type: 'E' }, { en: "Agree", es: "De acuerdo", val: 0.7 }, { en: "Neutral", es: "Neutral", val: 0.5 }, { en: "Disagree", es: "En desacuerdo", val: 0 }] },
  { q_en: "I like keeping accurate records and data.", q_es: "Me gusta llevar registros y datos precisos.",
    opts: [{ en: "Strongly Agree", es: "Muy de acuerdo", val: 1, type: 'C' }, { en: "Agree", es: "De acuerdo", val: 0.7 }, { en: "Neutral", es: "Neutral", val: 0.5 }, { en: "Disagree", es: "En desacuerdo", val: 0 }] },
  { q_en: "I prefer working outdoors in nature.", q_es: "Prefiero trabajar al aire libre en la naturaleza.",
    opts: [{ en: "Strongly Agree", es: "Muy de acuerdo", val: 1, type: 'R' }, { en: "Agree", es: "De acuerdo", val: 0.7 }, { en: "Neutral", es: "Neutral", val: 0.5 }, { en: "Disagree", es: "En desacuerdo", val: 0 }] },
  { q_en: "I like reading about new scientific discoveries.", q_es: "Me gusta leer sobre nuevos descubrimientos científicos.",
    opts: [{ en: "Strongly Agree", es: "Muy de acuerdo", val: 1, type: 'I' }, { en: "Agree", es: "De acuerdo", val: 0.7 }, { en: "Neutral", es: "Neutral", val: 0.5 }, { en: "Disagree", es: "En desacuerdo", val: 0 }] },
  { q_en: "I enjoy playing a musical instrument.", q_es: "Disfruto tocando un instrumento musical.",
    opts: [{ en: "Strongly Agree", es: "Muy de acuerdo", val: 1, type: 'A' }, { en: "Agree", es: "De acuerdo", val: 0.7 }, { en: "Neutral", es: "Neutral", val: 0.5 }, { en: "Disagree", es: "En desacuerdo", val: 0 }] },
  { q_en: "I like teaching or training others.", q_es: "Me gusta enseñar o entrenar a otros.",
    opts: [{ en: "Strongly Agree", es: "Muy de acuerdo", val: 1, type: 'S' }, { en: "Agree", es: "De acuerdo", val: 0.7 }, { en: "Neutral", es: "Neutral", val: 0.5 }, { en: "Disagree", es: "En desacuerdo", val: 0 }] },
  { q_en: "I enjoy persuading others to buy things.", q_es: "Disfruto persuadiendo a otros para comprar cosas.",
    opts: [{ en: "Strongly Agree", es: "Muy de acuerdo", val: 1, type: 'E' }, { en: "Agree", es: "De acuerdo", val: 0.7 }, { en: "Neutral", es: "Neutral", val: 0.5 }, { en: "Disagree", es: "En desacuerdo", val: 0 }] },
  { q_en: "I like organizing office files and schedules.", q_es: "Me gusta organizar archivos y agendas de oficina.",
    opts: [{ en: "Strongly Agree", es: "Muy de acuerdo", val: 1, type: 'C' }, { en: "Agree", es: "De acuerdo", val: 0.7 }, { en: "Neutral", es: "Neutral", val: 0.5 }, { en: "Disagree", es: "En desacuerdo", val: 0 }] },
  { q_en: "I enjoy fixing broken things at home.", q_es: "Disfruto arreglando cosas rotas en casa.",
    opts: [{ en: "Strongly Agree", es: "Muy de acuerdo", val: 1, type: 'R' }, { en: "Agree", es: "De acuerdo", val: 0.7 }, { en: "Neutral", es: "Neutral", val: 0.5 }, { en: "Disagree", es: "En desacuerdo", val: 0 }] },
  { q_en: "I like performing experiments in a lab.", q_es: "Me gusta realizar experimentos en un laboratorio.",
    opts: [{ en: "Strongly Agree", es: "Muy de acuerdo", val: 1, type: 'I' }, { en: "Agree", es: "De acuerdo", val: 0.7 }, { en: "Neutral", es: "Neutral", val: 0.5 }, { en: "Disagree", es: "En desacuerdo", val: 0 }] },
  { q_en: "I enjoy writing poems or stories.", q_es: "Disfruto escribiendo poemas o historias.",
    opts: [{ en: "Strongly Agree", es: "Muy de acuerdo", val: 1, type: 'A' }, { en: "Agree", es: "De acuerdo", val: 0.7 }, { en: "Neutral", es: "Neutral", val: 0.5 }, { en: "Disagree", es: "En desacuerdo", val: 0 }] },
  { q_en: "I like volunteering for social causes.", q_es: "Me gusta ser voluntario para causas sociales.",
    opts: [{ en: "Strongly Agree", es: "Muy de acuerdo", val: 1, type: 'S' }, { en: "Agree", es: "De acuerdo", val: 0.7 }, { en: "Neutral", es: "Neutral", val: 0.5 }, { en: "Disagree", es: "En desacuerdo", val: 0 }] },
  { q_en: "I enjoy starting my own business.", q_es: "Disfruto iniciando mi propio negocio.",
    opts: [{ en: "Strongly Agree", es: "Muy de acuerdo", val: 1, type: 'E' }, { en: "Agree", es: "De acuerdo", val: 0.7 }, { en: "Neutral", es: "Neutral", val: 0.5 }, { en: "Disagree", es: "En desacuerdo", val: 0 }] },
  { q_en: "I like following a strict routine.", q_es: "Me gusta seguir una rutina estricta.",
    opts: [{ en: "Strongly Agree", es: "Muy de acuerdo", val: 1, type: 'C' }, { en: "Agree", es: "De acuerdo", val: 0.7 }, { en: "Neutral", es: "Neutral", val: 0.5 }, { en: "Disagree", es: "En desacuerdo", val: 0 }] },
  { q_en: "I enjoy gardening or farming.", q_es: "Disfruto de la jardinería o la agricultura.",
    opts: [{ en: "Strongly Agree", es: "Muy de acuerdo", val: 1, type: 'R' }, { en: "Agree", es: "De acuerdo", val: 0.7 }, { en: "Neutral", es: "Neutral", val: 0.5 }, { en: "Disagree", es: "En desacuerdo", val: 0 }] },
  { q_en: "I like studying stars and planets.", q_es: "Me gusta estudiar las estrellas y los planetas.",
    opts: [{ en: "Strongly Agree", es: "Muy de acuerdo", val: 1, type: 'I' }, { en: "Agree", es: "De acuerdo", val: 0.7 }, { en: "Neutral", es: "Neutral", val: 0.5 }, { en: "Disagree", es: "En desacuerdo", val: 0 }] },
  { q_en: "I enjoy designing clothes or posters.", q_es: "Disfruto diseñando ropa o pósteres.",
    opts: [{ en: "Strongly Agree", es: "Muy de acuerdo", val: 1, type: 'A' }, { en: "Agree", es: "De acuerdo", val: 0.7 }, { en: "Neutral", es: "Neutral", val: 0.5 }, { en: "Disagree", es: "En desacuerdo", val: 0 }] },
  { q_en: "I like working as a therapist or counselor.", q_es: "Me gusta trabajar como terapeuta o consejero.",
    opts: [{ en: "Strongly Agree", es: "Muy de acuerdo", val: 1, type: 'S' }, { en: "Agree", es: "De acuerdo", val: 0.7 }, { en: "Neutral", es: "Neutral", val: 0.5 }, { en: "Disagree", es: "En desacuerdo", val: 0 }] },
  { q_en: "I enjoy negotiating deals.", q_es: "Disfruto negociando tratos.",
    opts: [{ en: "Strongly Agree", es: "Muy de acuerdo", val: 1, type: 'E' }, { en: "Agree", es: "De acuerdo", val: 0.7 }, { en: "Neutral", es: "Neutral", val: 0.5 }, { en: "Disagree", es: "En desacuerdo", val: 0 }] },
  { q_en: "I like managing budget spreadsheets.", q_es: "Me gusta manejar hojas de cálculo de presupuestos.",
    opts: [{ en: "Strongly Agree", es: "Muy de acuerdo", val: 1, type: 'C' }, { en: "Agree", es: "De acuerdo", val: 0.7 }, { en: "Neutral", es: "Neutral", val: 0.5 }, { en: "Disagree", es: "En desacuerdo", val: 0 }] },
  { q_en: "I enjoy construction or building things.", q_es: "Disfruto de la construcción o de fabricar cosas.",
    opts: [{ en: "Strongly Agree", es: "Muy de acuerdo", val: 1, type: 'R' }, { en: "Agree", es: "De acuerdo", val: 0.7 }, { en: "Neutral", es: "Neutral", val: 0.5 }, { en: "Disagree", es: "En desacuerdo", val: 0 }] },
];

export const ANXIETY_QUESTIONS = [
  { q_en: "Feeling nervous, anxious, or on edge.", q_es: "Sentirse nervioso/a, ansioso/a o con los pelos de punta.", 
    opts: [{ en: "Not at all", es: "Para nada", val: 0 }, { en: "Several days", es: "Varios días", val: 1 }, { en: "More than half the days", es: "Más de la mitad de los días", val: 2 }, { en: "Nearly every day", es: "Casi todos los días", val: 3 }] },
  { q_en: "Not being able to stop or control worrying.", q_es: "No poder detener o controlar las preocupaciones.",
    opts: [{ en: "Not at all", es: "Para nada", val: 0 }, { en: "Several days", es: "Varios días", val: 1 }, { en: "More than half the days", es: "Más de la mitad de los días", val: 2 }, { en: "Nearly every day", es: "Casi todos los días", val: 3 }] },
  { q_en: "Worrying too much about different things.", q_es: "Preocuparse demasiado por diferentes cosas.",
    opts: [{ en: "Not at all", es: "Para nada", val: 0 }, { en: "Several days", es: "Varios días", val: 1 }, { en: "More than half the days", es: "Más de la mitad de los días", val: 2 }, { en: "Nearly every day", es: "Casi todos los días", val: 3 }] },
  { q_en: "Trouble relaxing.", q_es: "Dificultad para relajarse.",
    opts: [{ en: "Not at all", es: "Para nada", val: 0 }, { en: "Several days", es: "Varios días", val: 1 }, { en: "More than half the days", es: "Más de la mitad de los días", val: 2 }, { en: "Nearly every day", es: "Casi todos los días", val: 3 }] },
  { q_en: "Being so restless that it is hard to sit still.", q_es: "Estar tan inquieto/a que es difícil quedarse quieto/a.",
    opts: [{ en: "Not at all", es: "Para nada", val: 0 }, { en: "Several days", es: "Varios días", val: 1 }, { en: "More than half the days", es: "Más de la mitad de los días", val: 2 }, { en: "Nearly every day", es: "Casi todos los días", val: 3 }] },
  { q_en: "Becoming easily annoyed or irritable.", q_es: "Irritarse o enfadarse con facilidad.",
    opts: [{ en: "Not at all", es: "Para nada", val: 0 }, { en: "Several days", es: "Varios días", val: 1 }, { en: "More than half the days", es: "Más de la mitad de los días", val: 2 }, { en: "Nearly every day", es: "Casi todos los días", val: 3 }] },
  { q_en: "Feeling afraid as if something awful might happen.", q_es: "Sentir miedo como si algo terrible pudiera pasar.",
    opts: [{ en: "Not at all", es: "Para nada", val: 0 }, { en: "Several days", es: "Varios días", val: 1 }, { en: "More than half the days", es: "Más de la mitad de los días", val: 2 }, { en: "Nearly every day", es: "Casi todos los días", val: 3 }] },
  { q_en: "Heart racing or pounding.", q_es: "Corazón acelerado o palpitaciones.",
    opts: [{ en: "Not at all", es: "Para nada", val: 0 }, { en: "Several days", es: "Varios días", val: 1 }, { en: "More than half the days", es: "Más de la mitad de los días", val: 2 }, { en: "Nearly every day", es: "Casi todos los días", val: 3 }] },
  { q_en: "Numbness or tingling.", q_es: "Entumecimiento u hormigueo.",
    opts: [{ en: "Not at all", es: "Para nada", val: 0 }, { en: "Several days", es: "Varios días", val: 1 }, { en: "More than half the days", es: "Más de la mitad de los días", val: 2 }, { en: "Nearly every day", es: "Casi todos los días", val: 3 }] },
  { q_en: "Feeling hot or cold sweats.", q_es: "Sentir sudores fríos o calientes.",
    opts: [{ en: "Not at all", es: "Para nada", val: 0 }, { en: "Several days", es: "Varios días", val: 1 }, { en: "More than half the days", es: "Más de la mitad de los días", val: 2 }, { en: "Nearly every day", es: "Casi todos los días", val: 3 }] },
  { q_en: "Wobbliness in legs.", q_es: "Inestabilidad en las piernas.",
    opts: [{ en: "Not at all", es: "Para nada", val: 0 }, { en: "Several days", es: "Varios días", val: 1 }, { en: "More than half the days", es: "Más de la mitad de los días", val: 2 }, { en: "Nearly every day", es: "Casi todos los días", val: 3 }] },
  { q_en: "Fear of losing control.", q_es: "Miedo a perder el control.",
    opts: [{ en: "Not at all", es: "Para nada", val: 0 }, { en: "Several days", es: "Varios días", val: 1 }, { en: "More than half the days", es: "Más de la mitad de los días", val: 2 }, { en: "Nearly every day", es: "Casi todos los días", val: 3 }] },
  { q_en: "Difficulty breathing.", q_es: "Dificultad para respirar.",
    opts: [{ en: "Not at all", es: "Para nada", val: 0 }, { en: "Several days", es: "Varios días", val: 1 }, { en: "More than half the days", es: "Más de la mitad de los días", val: 2 }, { en: "Nearly every day", es: "Casi todos los días", val: 3 }] },
  { q_en: "Fear of dying.", q_es: "Miedo a morir.",
    opts: [{ en: "Not at all", es: "Para nada", val: 0 }, { en: "Several days", es: "Varios días", val: 1 }, { en: "More than half the days", es: "Más de la mitad de los días", val: 2 }, { en: "Nearly every day", es: "Casi todos los días", val: 3 }] },
  { q_en: "Feeling faint.", q_es: "Sentir desmayo.",
    opts: [{ en: "Not at all", es: "Para nada", val: 0 }, { en: "Several days", es: "Varios días", val: 1 }, { en: "More than half the days", es: "Más de la mitad de los días", val: 2 }, { en: "Nearly every day", es: "Casi todos los días", val: 3 }] },
  { q_en: "Shakiness in hands.", q_es: "Temblor en las manos.",
    opts: [{ en: "Not at all", es: "Para nada", val: 0 }, { en: "Several days", es: "Varios días", val: 1 }, { en: "More than half the days", es: "Más de la mitad de los días", val: 2 }, { en: "Nearly every day", es: "Casi todos los días", val: 3 }] },
  { q_en: "Feeling of choking.", q_es: "Sensación de ahogo.",
    opts: [{ en: "Not at all", es: "Para nada", val: 0 }, { en: "Several days", es: "Varios días", val: 1 }, { en: "More than half the days", es: "Más de la mitad de los días", val: 2 }, { en: "Nearly every day", es: "Casi todos los días", val: 3 }] },
  { q_en: "Fear of the worst happening.", q_es: "Miedo a que ocurra lo peor.",
    opts: [{ en: "Not at all", es: "Para nada", val: 0 }, { en: "Several days", es: "Varios días", val: 1 }, { en: "More than half the days", es: "Más de la mitad de los días", val: 2 }, { en: "Nearly every day", es: "Casi todos los días", val: 3 }] },
  { q_en: "Terrified or afraid.", q_es: "Aterrorizado o asustado.",
    opts: [{ en: "Not at all", es: "Para nada", val: 0 }, { en: "Several days", es: "Varios días", val: 1 }, { en: "More than half the days", es: "Más de la mitad de los días", val: 2 }, { en: "Nearly every day", es: "Casi todos los días", val: 3 }] },
  { q_en: "Nervousness.", q_es: "Nerviosismo.",
    opts: [{ en: "Not at all", es: "Para nada", val: 0 }, { en: "Several days", es: "Varios días", val: 1 }, { en: "More than half the days", es: "Más de la mitad de los días", val: 2 }, { en: "Nearly every day", es: "Casi todos los días", val: 3 }] },
  { q_en: "Indigestion or discomfort in abdomen.", q_es: "Indigestión o malestar en el abdomen.",
    opts: [{ en: "Not at all", es: "Para nada", val: 0 }, { en: "Several days", es: "Varios días", val: 1 }, { en: "More than half the days", es: "Más de la mitad de los días", val: 2 }, { en: "Nearly every day", es: "Casi todos los días", val: 3 }] },
  { q_en: "Face flushed.", q_es: "Cara ruborizada.",
    opts: [{ en: "Not at all", es: "Para nada", val: 0 }, { en: "Several days", es: "Varios días", val: 1 }, { en: "More than half the days", es: "Más de la mitad de los días", val: 2 }, { en: "Nearly every day", es: "Casi todos los días", val: 3 }] },
  { q_en: "Night sweats.", q_es: "Sudores nocturnos.",
    opts: [{ en: "Not at all", es: "Para nada", val: 0 }, { en: "Several days", es: "Varios días", val: 1 }, { en: "More than half the days", es: "Más de la mitad de los días", val: 2 }, { en: "Nearly every day", es: "Casi todos los días", val: 3 }] },
  { q_en: "Difficulty concentrating.", q_es: "Dificultad para concentrarse.",
    opts: [{ en: "Not at all", es: "Para nada", val: 0 }, { en: "Several days", es: "Varios días", val: 1 }, { en: "More than half the days", es: "Más de la mitad de los días", val: 2 }, { en: "Nearly every day", es: "Casi todos los días", val: 3 }] },
  { q_en: "Mind going blank.", q_es: "Mente quedándose en blanco.",
    opts: [{ en: "Not at all", es: "Para nada", val: 0 }, { en: "Several days", es: "Varios días", val: 1 }, { en: "More than half the days", es: "Más de la mitad de los días", val: 2 }, { en: "Nearly every day", es: "Casi todos los días", val: 3 }] },
];

export const MOOD_QUESTIONS = [
  { q_en: "Little interest or pleasure in doing things.", q_es: "Poco interés o placer en hacer las cosas.", 
    opts: [{ en: "Not at all", es: "Para nada", val: 0 }, { en: "Several days", es: "Varios días", val: 1 }, { en: "More than half the days", es: "Más de la mitad de los días", val: 2 }, { en: "Nearly every day", es: "Casi todos los días", val: 3 }] },
  { q_en: "Feeling down, depressed, or hopeless.", q_es: "Sentirse desanimado/a, deprimido/a o sin esperanza.",
    opts: [{ en: "Not at all", es: "Para nada", val: 0 }, { en: "Several days", es: "Varios días", val: 1 }, { en: "More than half the days", es: "Más de la mitad de los días", val: 2 }, { en: "Nearly every day", es: "Casi todos los días", val: 3 }] },
  { q_en: "Trouble falling or staying asleep, or sleeping too much.", q_es: "Dificultad para dormir o dormir demasiado.",
    opts: [{ en: "Not at all", es: "Para nada", val: 0 }, { en: "Several days", es: "Varios días", val: 1 }, { en: "More than half the days", es: "Más de la mitad de los días", val: 2 }, { en: "Nearly every day", es: "Casi todos los días", val: 3 }] },
  { q_en: "Feeling tired or having little energy.", q_es: "Sentirse cansado/a o con poca energía.",
    opts: [{ en: "Not at all", es: "Para nada", val: 0 }, { en: "Several days", es: "Varios días", val: 1 }, { en: "More than half the days", es: "Más de la mitad de los días", val: 2 }, { en: "Nearly every day", es: "Casi todos los días", val: 3 }] },
  { q_en: "Poor appetite or overeating.", q_es: "Falta de apetito o comer en exceso.",
    opts: [{ en: "Not at all", es: "Para nada", val: 0 }, { en: "Several days", es: "Varios días", val: 1 }, { en: "More than half the days", es: "Más de la mitad de los días", val: 2 }, { en: "Nearly every day", es: "Casi todos los días", val: 3 }] },
  { q_en: "Feeling bad about yourself or that you are a failure.", q_es: "Sentirse mal contigo mismo/a o que eres un fracaso.",
    opts: [{ en: "Not at all", es: "Para nada", val: 0 }, { en: "Several days", es: "Varios días", val: 1 }, { en: "More than half the days", es: "Más de la mitad de los días", val: 2 }, { en: "Nearly every day", es: "Casi todos los días", val: 3 }] },
  { q_en: "Trouble concentrating on things.", q_es: "Dificultad para concentrarse en las cosas.",
    opts: [{ en: "Not at all", es: "Para nada", val: 0 }, { en: "Several days", es: "Varios días", val: 1 }, { en: "More than half the days", es: "Más de la mitad de los días", val: 2 }, { en: "Nearly every day", es: "Casi todos los días", val: 3 }] },
  { q_en: "Moving or speaking so slowly that other people could have noticed.", q_es: "Moverse o hablar tan despacio que los demás lo notarían.",
    opts: [{ en: "Not at all", es: "Para nada", val: 0 }, { en: "Several days", es: "Varios días", val: 1 }, { en: "More than half the days", es: "Más de la mitad de los días", val: 2 }, { en: "Nearly every day", es: "Casi todos los días", val: 3 }] },
  { q_en: "Thoughts that you would be better off dead.", q_es: "Pensamientos de que estarías mejor muerto/a.",
    opts: [{ en: "Not at all", es: "Para nada", val: 0 }, { en: "Several days", es: "Varios días", val: 1 }, { en: "More than half the days", es: "Más de la mitad de los días", val: 2 }, { en: "Nearly every day", es: "Casi todos los días", val: 3 }] },
  { q_en: "Feeling optimistic about the future.", q_es: "Sentirse optimista sobre el futuro.",
    opts: [{ en: "Never", es: "Nunca", val: 3 }, { en: "Rarely", es: "Raramente", val: 2 }, { en: "Sometimes", es: "A veces", val: 1 }, { en: "Often", es: "A menudo", val: 0 }] },
  { q_en: "Feeling useful.", q_es: "Sentirse útil.",
    opts: [{ en: "Never", es: "Nunca", val: 3 }, { en: "Rarely", es: "Raramente", val: 2 }, { en: "Sometimes", es: "A veces", val: 1 }, { en: "Often", es: "A menudo", val: 0 }] },
  { q_en: "Feeling relaxed.", q_es: "Sentirse relajado/a.",
    opts: [{ en: "Never", es: "Nunca", val: 3 }, { en: "Rarely", es: "Raramente", val: 2 }, { en: "Sometimes", es: "A veces", val: 1 }, { en: "Often", es: "A menudo", val: 0 }] },
  { q_en: "Feeling interested in other people.", q_es: "Sentirse interesado/a en otras personas.",
    opts: [{ en: "Never", es: "Nunca", val: 3 }, { en: "Rarely", es: "Raramente", val: 2 }, { en: "Sometimes", es: "A veces", val: 1 }, { en: "Often", es: "A menudo", val: 0 }] },
  { q_en: "Having energy to spare.", q_es: "Tener energía de sobra.",
    opts: [{ en: "Never", es: "Nunca", val: 3 }, { en: "Rarely", es: "Raramente", val: 2 }, { en: "Sometimes", es: "A veces", val: 1 }, { en: "Often", es: "A menudo", val: 0 }] },
  { q_en: "Dealing with problems well.", q_es: "Manejar bien los problemas.",
    opts: [{ en: "Never", es: "Nunca", val: 3 }, { en: "Rarely", es: "Raramente", val: 2 }, { en: "Sometimes", es: "A veces", val: 1 }, { en: "Often", es: "A menudo", val: 0 }] },
  { q_en: "Thinking clearly.", q_es: "Pensar con claridad.",
    opts: [{ en: "Never", es: "Nunca", val: 3 }, { en: "Rarely", es: "Raramente", val: 2 }, { en: "Sometimes", es: "A veces", val: 1 }, { en: "Often", es: "A menudo", val: 0 }] },
  { q_en: "Feeling good about myself.", q_es: "Sentirme bien conmigo mismo/a.",
    opts: [{ en: "Never", es: "Nunca", val: 3 }, { en: "Rarely", es: "Raramente", val: 2 }, { en: "Sometimes", es: "A veces", val: 1 }, { en: "Often", es: "A menudo", val: 0 }] },
  { q_en: "Feeling close to other people.", q_es: "Sentirse cercano/a a otras personas.",
    opts: [{ en: "Never", es: "Nunca", val: 3 }, { en: "Rarely", es: "Raramente", val: 2 }, { en: "Sometimes", es: "A veces", val: 1 }, { en: "Often", es: "A menudo", val: 0 }] },
  { q_en: "Feeling confident.", q_es: "Sentirse seguro/a de sí mismo/a.",
    opts: [{ en: "Never", es: "Nunca", val: 3 }, { en: "Rarely", es: "Raramente", val: 2 }, { en: "Sometimes", es: "A veces", val: 1 }, { en: "Often", es: "A menudo", val: 0 }] },
  { q_en: "Able to make up my own mind about things.", q_es: "Capaz de decidir por mí mismo/a sobre las cosas.",
    opts: [{ en: "Never", es: "Nunca", val: 3 }, { en: "Rarely", es: "Raramente", val: 2 }, { en: "Sometimes", es: "A veces", val: 1 }, { en: "Often", es: "A menudo", val: 0 }] },
  { q_en: "Feeling loved.", q_es: "Sentirse amado/a.",
    opts: [{ en: "Never", es: "Nunca", val: 3 }, { en: "Rarely", es: "Raramente", val: 2 }, { en: "Sometimes", es: "A veces", val: 1 }, { en: "Often", es: "A menudo", val: 0 }] },
  { q_en: "Interested in new things.", q_es: "Interesado/a en cosas nuevas.",
    opts: [{ en: "Never", es: "Nunca", val: 3 }, { en: "Rarely", es: "Raramente", val: 2 }, { en: "Sometimes", es: "A veces", val: 1 }, { en: "Often", es: "A menudo", val: 0 }] },
  { q_en: "Feeling cheerful.", q_es: "Sentirse alegre.",
    opts: [{ en: "Never", es: "Nunca", val: 3 }, { en: "Rarely", es: "Raramente", val: 2 }, { en: "Sometimes", es: "A veces", val: 1 }, { en: "Often", es: "A menudo", val: 0 }] },
  { q_en: "Having something to look forward to.", q_es: "Tener algo que esperar con ilusión.",
    opts: [{ en: "Never", es: "Nunca", val: 3 }, { en: "Rarely", es: "Raramente", val: 2 }, { en: "Sometimes", es: "A veces", val: 1 }, { en: "Often", es: "A menudo", val: 0 }] },
  { q_en: "Feeling at peace with myself.", q_es: "Sentirse en paz conmigo mismo/a.",
    opts: [{ en: "Never", es: "Nunca", val: 3 }, { en: "Rarely", es: "Raramente", val: 2 }, { en: "Sometimes", es: "A veces", val: 1 }, { en: "Often", es: "A menudo", val: 0 }] },
];

export const MBTI_QUESTIONS = [
  { q_en: "You prefer to recharge your energy by...", q_es: "Prefieres recargar tu energía...",
    opts: [{ en: "Being around people", es: "Estando con gente", val: 1, dim: 'E' }, { en: "Spending time alone", es: "Pasando tiempo a solas", val: 1, dim: 'I' }] },
  { q_en: "When making decisions, you rely more on...", q_es: "Al tomar decisiones, confías más en...",
    opts: [{ en: "Logic and objective facts", es: "Lógica y hechos objetivos", val: 1, dim: 'T' }, { en: "Values and feelings", es: "Valores y sentimientos", val: 1, dim: 'F' }] },
  { q_en: "You prefer your life to be...", q_es: "Prefieres que tu vida sea...",
    opts: [{ en: "Organized and planned", es: "Organizada y planeada", val: 1, dim: 'J' }, { en: "Spontaneous and flexible", es: "Espontánea y flexible", val: 1, dim: 'P' }] },
  { q_en: "You pay more attention to...", q_es: "Prestas más atención a...",
    opts: [{ en: "Practical details and the present", es: "Detalles prácticos y el presente", val: 1, dim: 'S' }, { en: "Possibilities and the future", es: "Posibilidades y el futuro", val: 1, dim: 'N' }] },
  // ... Adding more for E/I, S/N, T/F, J/P
  { q_en: "At social events, you usually...", q_es: "En eventos sociales, normalmente...",
    opts: [{ en: "Initiate conversations", es: "Inicias conversaciones", val: 1, dim: 'E' }, { en: "Wait to be approached", es: "Esperas a que te hablen", val: 1, dim: 'I' }] },
  { q_en: "You are more interested in...", q_es: "Te interesa más...",
    opts: [{ en: "What is actual and real", es: "Lo que es real y actual", val: 1, dim: 'S' }, { en: "What is possible and hypothetical", es: "Lo que es posible e hipotético", val: 1, dim: 'N' }] },
  { q_en: "You tend to be...", q_es: "Tiendes a ser...",
    opts: [{ en: "Cool-headed and firm", es: "De mente fría y firme", val: 1, dim: 'T' }, { en: "Warm-hearted and empathetic", es: "De corazón cálido y empático", val: 1, dim: 'F' }] },
  { q_en: "You prefer to have things...", q_es: "Prefieres tener las cosas...",
    opts: [{ en: "Settled and decided", es: "Cerradas y decididas", val: 1, dim: 'J' }, { en: "Open to new information", es: "Abiertas a nueva información", val: 1, dim: 'P' }] },
  { q_en: "New situations make you feel...", q_es: "Las situaciones nuevas te hacen sentir...",
    opts: [{ en: "Energized", es: "Con energía", val: 1, dim: 'E' }, { en: "Drained", es: "Agotado/a", val: 1, dim: 'I' }] },
  { q_en: "You trust your...", q_es: "Confías en tu...",
    opts: [{ en: "Experience", es: "Experiencia", val: 1, dim: 'S' }, { en: "Intuition", es: "Intuición", val: 1, dim: 'N' }] },
  { q_en: "In a group, you value...", q_es: "En un grupo, valoras la...",
    opts: [{ en: "Efficiency and competence", es: "Eficiencia y competencia", val: 1, dim: 'T' }, { en: "Harmony and cooperation", es: "Armonía y cooperación", val: 1, dim: 'F' }] },
  { q_en: "You prefer to work with...", q_es: "Prefieres trabajar con...",
    opts: [{ en: "Deadlines and milestones", es: "Plazos y hitos", val: 1, dim: 'J' }, { en: "Flow and inspiration", es: "Flujo e inspiración", val: 1, dim: 'P' }] },
  { q_en: "Your social circle is...", q_es: "Tu círculo social es...",
    opts: [{ en: "Large and varied", es: "Amplio y variado", val: 1, dim: 'E' }, { en: "Small and select", es: "Pequeño y selecto", val: 1, dim: 'I' }] },
  { q_en: "You prefer tasks that are...", q_es: "Prefieres tareas que sean...",
    opts: [{ en: "Concrete and sequential", es: "Concretas y secuenciales", val: 1, dim: 'S' }, { en: "Abstract and holistic", es: "Abstractas y holísticas", val: 1, dim: 'N' }] },
  { q_en: "You are more critical of...", q_es: "Eres más crítico/a con...",
    opts: [{ en: "Logical errors", es: "Errores lógicos", val: 1, dim: 'T' }, { en: "Lack of empathy", es: "Falta de empatía", val: 1, dim: 'F' }] },
  { q_en: "On a trip, you prefer...", q_es: "En un viaje, prefieres...",
    opts: [{ en: "A detailed itinerary", es: "Un itinerario detallado", val: 1, dim: 'J' }, { en: "Exploring without a map", es: "Explorar sin mapa", val: 1, dim: 'P' }] },
  { q_en: "You speak more than you listen.", q_es: "Hablas más de lo que escuchas.",
    opts: [{ en: "Often", es: "A menudo", val: 1, dim: 'E' }, { en: "Rarely", es: "Raramente", val: 1, dim: 'I' }] },
  { q_en: "You prefer to follow...", q_es: "Prefieres seguir...",
    opts: [{ en: "Proven methods", es: "Métodos probados", val: 1, dim: 'S' }, { en: "Innovative ideas", es: "Ideas innovadoras", val: 1, dim: 'N' }] },
  { q_en: "You are more likely to...", q_es: "Es más probable que...",
    opts: [{ en: "Reason with someone", es: "Razones con alguien", val: 1, dim: 'T' }, { en: "Connect emotionally", es: "Conectes emocionalmente", val: 1, dim: 'F' }] },
  { q_en: "You find it easier to...", q_es: "Te resulta más fácil...",
    opts: [{ en: "Finish a project", es: "Terminar un proyecto", val: 1, dim: 'J' }, { en: "Start a new one", es: "Empezar uno nuevo", val: 1, dim: 'P' }] },
  { q_en: "You are described as...", q_es: "Te describen como...",
    opts: [{ en: "Outgoing", es: "Extrovertido/a", val: 1, dim: 'E' }, { en: "Reserved", es: "Reservado/a", val: 1, dim: 'I' }] },
  { q_en: "You focus on...", q_es: "Te enfocas en...",
    opts: [{ en: "The trees (details)", es: "Los árboles (detalles)", val: 1, dim: 'S' }, { en: "The forest (big picture)", es: "El bosque (visión general)", val: 1, dim: 'N' }] },
  { q_en: "You prefer to be...", q_es: "Prefieres ser...",
    opts: [{ en: "Right", es: "Tener la razón", val: 1, dim: 'T' }, { en: "Kind", es: "Ser amable", val: 1, dim: 'F' }] },
  { q_en: "You feel better when...", q_es: "Te sientes mejor cuando...",
    opts: [{ en: "A decision is made", es: "Se toma una decisión", val: 1, dim: 'J' }, { en: "Options remain open", es: "Las opciones siguen abiertas", val: 1, dim: 'P' }] },
  { q_en: "You seek...", q_es: "Buscas...",
    opts: [{ en: "Excitement", es: "Emoción", val: 1, dim: 'E' }, { en: "Tranquility", es: "Tranquilidad", val: 1, dim: 'I' }] },
];

export const PsyTestModal: React.FC<PsyTestModalProps> = ({
  visible, onClose, lang, colors, psyProfile,
  psyStep, setPsyStep, psyAnswers, setPsyAnswers, activeTest, scoreTest,
}) => {
  // Local results: computed immediately on last answer — no async context wait
  const [localResults, setLocalResults] = useState<any>(null);

  const getQuestions = () => {
    switch (activeTest) {
      case 'aptitude':  return APTITUDE_QUESTIONS;
      case 'vocational':return VOCATIONAL_QUESTIONS;
      case 'anxiety':   return ANXIETY_QUESTIONS;
      case 'mood':      return MOOD_QUESTIONS;
      case 'mbti':      return MBTI_QUESTIONS;
      default:          return PSY_QUESTIONS;
    }
  };
  const questions      = getQuestions();
  const totalQuestions = questions.length;

  // ── Handle answer tap ───────────────────────────────────────────────────────
  const handleAnswer = (ansIdx: number) => {
    const newAnswers = [...psyAnswers, ansIdx];
    setPsyAnswers(newAnswers);

    if (psyStep + 1 < totalQuestions) {
      setPsyStep(psyStep + 1);
      return;
    }

    // Last answer → compute results locally BEFORE calling parent (async)
    let results: any = {};
    switch (activeTest) {
      case 'ocean':
        results = { type: 'ocean', scores: scoreOcean(newAnswers, questions) };
        break;
      case 'aptitude':
        results = { type: 'aptitude', score: scoreAptitude(newAnswers, questions) };
        break;
      case 'vocational': {
        const dims = scoreVocational(newAnswers, questions);
        const sorted = Object.entries(dims).sort(([, a], [, b]) => b - a);
        results = { type: 'vocational', dims, topTypes: sorted.slice(0, 3).map(([k]) => k) };
        break;
      }
      case 'anxiety': {
        const { score, level } = scoreAnxiety(newAnswers, questions);
        results = { type: 'anxiety', score, level };
        break;
      }
      case 'mood':
        results = { type: 'mood', score: scoreMood(newAnswers, questions) };
        break;
      case 'mbti':
        results = { type: 'mbti', mbtiType: scoreMbti(newAnswers, questions) };
        break;
    }
    setLocalResults(results);
    setPsyStep(totalQuestions);
    scoreTest(activeTest, newAnswers); // persist to DB (fire-and-forget)
  };

  // ── Export current test result as PDF ───────────────────────────────────────
  const handleExportResults = async () => {
    if (!localResults) return;
    try {
      const getVal = (v: number) => `${Math.round(v * 100)}%`;
      let html = '';

      if (localResults.type === 'ocean') {
        const scores = localResults.scores as Record<string, number>;
        const rows = Object.entries(scores)
          .filter(([k]) => ['O','C','E','A','N','D','L'].includes(k))
          .map(([key, val]) => {
            const m = OCEAN_META[key];
            return `<tr><td style="padding:8px;font-weight:bold;">${m?.emoji} ${lang==='es'?m?.label_es:m?.label_en} (${key})</td>
              <td style="padding:8px;"><div style="background:#e5e7eb;border-radius:6px;height:14px;overflow:hidden;">
              <div style="width:${Math.round(val*100)}%;height:14px;background:${m?.color};border-radius:6px;"></div></div></td>
              <td style="padding:8px;font-weight:bold;color:${m?.color};">${Math.round(val*100)}%</td></tr>`;
          }).join('');
        html = `<html><head><style>body{font-family:sans-serif;padding:32px;color:#222;}h1{color:#7c3aed;}table{width:100%;border-collapse:collapse;}</style></head>
          <body><h1>🧠 ${lang==='es'?'Perfil OCEAN+':'OCEAN+ Profile'}</h1>
          <p>${lang==='es'?'Fecha':'Date'}: ${new Date().toLocaleDateString()}</p>
          <table>${rows}</table></body></html>`;

      } else if (localResults.type === 'mbti') {
        const arch = MBTI_ARCHETYPES[localResults.mbtiType] || {};
        html = `<html><head><style>body{font-family:sans-serif;padding:32px;}.badge{font-size:52px;font-weight:900;letter-spacing:8px;color:#fff;background:#ec4899;padding:16px 32px;border-radius:12px;display:inline-block;}</style></head>
          <body><h1>🎭 ${lang==='es'?'Perfil MBTI (16r)':'MBTI (16r) Profile'}</h1>
          <p>${lang==='es'?'Fecha':'Date'}: ${new Date().toLocaleDateString()}</p>
          <div class="badge">${localResults.mbtiType}</div>
          <h2>${(arch as any).emoji||''} ${lang==='es'?(arch as any).es||'':( arch as any).en||''}</h2>
          <p>${lang==='es'?(arch as any).desc_es||'':(arch as any).desc_en||''}</p></body></html>`;

      } else if (localResults.type === 'aptitude') {
        html = `<html><head><style>body{font-family:sans-serif;padding:32px;}.score{font-size:72px;font-weight:900;color:#3b82f6;}</style></head>
          <body><h1>💡 ${lang==='es'?'Reporte de Aptitudes':'Aptitude Report'}</h1>
          <p>${lang==='es'?'Fecha':'Date'}: ${new Date().toLocaleDateString()}</p>
          <div class="score">${Math.round(localResults.score*100)}%</div>
          <p>${lang==='es'?'Razonamiento lógico, numérico, verbal y espacial.':'Logical, numerical, verbal and spatial reasoning.'}</p></body></html>`;

      } else if (localResults.type === 'vocational') {
        const topLabels = (localResults.topTypes as string[]).map((t, idx) => {
          const h = HOLLAND_LABELS[t];
          return `<li style="margin:10px 0;${idx===0?'font-size:18px;':'font-size:15px;'}">${h?.emoji} <strong>${lang==='es'?h?.es:h?.en}</strong>${idx===0?` <span style="background:#f59e0b;color:#000;padding:2px 8px;border-radius:4px;font-size:11px;">${lang==='es'?'DOMINANTE':'DOMINANT'}</span>`:''}
            <br><small style="color:#666;">${lang==='es'?h?.careers_es:h?.careers_en}</small></li>`;
        }).join('');
        html = `<html><head><style>body{font-family:sans-serif;padding:32px;}</style></head>
          <body><h1>🎯 ${lang==='es'?'Reporte Vocacional (Holland)':'Vocational Report (Holland)'}</h1>
          <p>${lang==='es'?'Fecha':'Date'}: ${new Date().toLocaleDateString()}</p>
          <ul>${topLabels}</ul></body></html>`;

      } else {
        const pct = Math.round(localResults.score * 100);
        const isAnxiety = localResults.type === 'anxiety';
        const levelMap: Record<string, {en:string;es:string}> = {
          minimal:{en:'Minimal',es:'Mínimo'}, mild:{en:'Mild',es:'Leve'},
          moderate:{en:'Moderate',es:'Moderado'}, severe:{en:'Severe',es:'Severo'},
        };
        const levelLabel = localResults.level ? (lang==='es'?levelMap[localResults.level]?.es:levelMap[localResults.level]?.en)||'' : '';
        html = `<html><head><style>body{font-family:sans-serif;padding:32px;}.score{font-size:72px;font-weight:900;color:#10b981;}</style></head>
          <body><h1>${isAnxiety?'🌊':'🌿'} ${lang==='es'?(isAnxiety?'Balance Emocional':'Bienestar Emocional'):(isAnxiety?'Emotional Balance':'Emotional Well-being')}</h1>
          <p>${lang==='es'?'Fecha':'Date'}: ${new Date().toLocaleDateString()}</p>
          <div class="score">${pct}%</div>
          ${levelLabel?`<p><strong>${lang==='es'?'Nivel':'Level'}:</strong> ${levelLabel}</p>`:''}
          </body></html>`;
      }

      const Print   = await import('expo-print');
      const Sharing = await import('expo-sharing');
      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri);
    } catch (e) { console.error('[PDF_RESULTS]', e); }
  };

  // ── Results screen renderer ─────────────────────────────────────────────────
  const renderResults = () => {
    if (!localResults) return null;
    const accentColor = activeTest==='ocean'?'#a855f7': activeTest==='aptitude'?'#3b82f6':
      activeTest==='vocational'?'#f59e0b': activeTest==='mbti'?'#ec4899':
      activeTest==='anxiety'?'#06b6d4':'#10b981';

    return (
      <>
        {/* ── Header ── */}
        <View style={{ alignItems: 'center', paddingTop: 4, paddingBottom: 8 }}>
          <Text style={{ fontSize: 38, marginBottom: 2 }}>✨</Text>
          <Text style={{ color: accentColor, fontSize: 19, fontWeight: 'bold', textAlign: 'center' }}>
            Ψ {lang==='es' ? 'Análisis Completado' : 'Analysis Complete'}
          </Text>
          <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 3, textAlign: 'center' }}>
            {lang==='es' ? 'Resultados guardados en tu perfil.' : 'Results saved to your profile.'}
          </Text>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} bounces={false} overScrollMode="never"
          style={{ flex: 1, marginTop: 10 }} contentContainerStyle={{ paddingBottom: 8 }}>

          {/* ══ OCEAN ══ */}
          {localResults.type === 'ocean' && (
            <View style={{ backgroundColor: colors.surfaceSecondary, borderRadius: 16, padding: 18 }}>
              <Text style={{ color: colors.textPrimary, fontWeight: 'bold', fontSize: 16, marginBottom: 16, textAlign: 'center' }}>
                🧠 {lang==='es' ? 'Perfil OCEAN+' : 'OCEAN+ Profile'}
              </Text>
              {Object.entries(localResults.scores as Record<string,number>).map(([key, val], i) => {
                const meta = OCEAN_META[key]; if (!meta) return null;
                return <AnimatedBar key={key} label={lang==='es'?meta.label_es:meta.label_en}
                  emoji={meta.emoji} value={val} color={meta.color} colors={colors} delay={i*70} />;
              })}
            </View>
          )}

          {/* ══ MBTI ══ */}
          {localResults.type === 'mbti' && (() => {
            const arch = MBTI_ARCHETYPES[localResults.mbtiType] ||
              { emoji: '🎭', en: localResults.mbtiType, es: localResults.mbtiType, desc_en: '', desc_es: '' };
            return (
              <View style={{ alignItems: 'center' }}>
                <View style={{ backgroundColor: '#12002a', borderRadius: 20, padding: 24, marginBottom: 12,
                  alignItems: 'center', width: '100%', borderWidth: 1, borderColor: '#ec4899' }}>
                  <Text style={{ fontSize: 36, marginBottom: 6 }}>{arch.emoji}</Text>
                  <View style={{ backgroundColor: '#ec4899', paddingHorizontal: 24, paddingVertical: 10,
                    borderRadius: 12, marginBottom: 14,
                    shadowColor: '#ec4899', shadowOpacity: 0.5, shadowRadius: 10, elevation: 8 }}>
                    <Text style={{ color: '#fff', fontSize: 36, fontWeight: '900', letterSpacing: 6 }}>
                      {localResults.mbtiType}
                    </Text>
                  </View>
                  <Text style={{ color: '#fff', fontSize: 17, fontWeight: 'bold', marginBottom: 6 }}>
                    {lang==='es' ? arch.es : arch.en}
                  </Text>
                  <Text style={{ color: '#bbb', fontSize: 13, textAlign: 'center', lineHeight: 20 }}>
                    {lang==='es' ? arch.desc_es : arch.desc_en}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
                  {['E/I','S/N','T/F','J/P'].map(pair => {
                    const [a, b] = pair.split('/');
                    const letter = localResults.mbtiType?.includes(a) ? a : b;
                    return (
                      <View key={pair} style={{ backgroundColor: colors.surfaceSecondary, borderRadius: 10,
                        paddingHorizontal: 14, paddingVertical: 10, alignItems: 'center',
                        borderWidth: 1, borderColor: '#ec4899' }}>
                        <Text style={{ color: '#ec4899', fontSize: 18, fontWeight: 'bold' }}>{letter}</Text>
                        <Text style={{ color: colors.textSecondary, fontSize: 10 }}>{pair}</Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            );
          })()}

          {/* ══ Aptitude ══ */}
          {localResults.type === 'aptitude' && (() => {
            const pct = Math.round(localResults.score * 100);
            const lv = pct>=85 ? { label_en:'Exceptional', label_es:'Excepcional', emoji:'🏆', color:'#f59e0b' }
              : pct>=70 ? { label_en:'Advanced', label_es:'Avanzado', emoji:'🌟', color:'#3b82f6' }
              : pct>=55 ? { label_en:'Solid', label_es:'Sólido', emoji:'💪', color:'#10b981' }
              : { label_en:'Developing', label_es:'En Desarrollo', emoji:'📈', color:'#f97316' };
            return (
              <View style={{ backgroundColor: colors.surfaceSecondary, borderRadius: 16, padding: 18, alignItems: 'center' }}>
                <Text style={{ fontSize: 36, marginBottom: 4 }}>{lv.emoji}</Text>
                <GaugeIndicator score={localResults.score} color={lv.color}
                  label={lang==='es'?lv.label_es:lv.label_en} colors={colors} />
                <Text style={{ color: colors.textSecondary, fontSize: 13, textAlign: 'center', marginTop: 4, lineHeight: 18 }}>
                  {lang==='es'?'Razonamiento lógico, numérico, verbal y espacial.':'Logical, numerical, verbal and spatial reasoning.'}
                </Text>
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 14, flexWrap: 'wrap', justifyContent: 'center' }}>
                  {[{l:lang==='es'?'Lógica':'Logic',e:'🔗'},{l:lang==='es'?'Numérica':'Numerical',e:'🔢'},
                    {l:lang==='es'?'Verbal':'Verbal',e:'💬'},{l:lang==='es'?'Espacial':'Spatial',e:'🧩'}].map(s=>(
                    <View key={s.l} style={{ backgroundColor: colors.surface, borderRadius: 10,
                      paddingHorizontal: 12, paddingVertical: 8, alignItems: 'center',
                      borderWidth: 1, borderColor: '#3b82f6' }}>
                      <Text style={{ fontSize: 18 }}>{s.e}</Text>
                      <Text style={{ color: colors.textPrimary, fontSize: 11, marginTop: 2 }}>{s.l}</Text>
                    </View>
                  ))}
                </View>
              </View>
            );
          })()}

          {/* ══ Vocational ══ */}
          {localResults.type === 'vocational' && (() => {
            const topTypes = localResults.topTypes as string[];
            return (
              <View style={{ backgroundColor: colors.surfaceSecondary, borderRadius: 16, padding: 18 }}>
                <Text style={{ color: colors.textPrimary, fontWeight: 'bold', fontSize: 16, marginBottom: 14, textAlign: 'center' }}>
                  🎯 {lang==='es' ? 'Tu Código Holland (RIASEC)' : 'Your Holland Code (RIASEC)'}
                </Text>
                {topTypes.map((t, idx) => {
                  const h = HOLLAND_LABELS[t]; if (!h) return null;
                  const highlight = idx === 0;
                  return (
                    <View key={t} style={{ backgroundColor: highlight?colors.surface:'transparent',
                      borderRadius: 12, padding: 14, marginBottom: 10,
                      borderWidth: highlight?1.5:1, borderColor: highlight?'#f59e0b':colors.border }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <Text style={{ fontSize: 26 }}>{h.emoji}</Text>
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            <Text style={{ color: highlight?'#f59e0b':colors.textPrimary, fontWeight: 'bold', fontSize: 15 }}>
                              {lang==='es'?h.es:h.en}
                            </Text>
                            {highlight && (
                              <View style={{ backgroundColor: '#f59e0b', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 }}>
                                <Text style={{ color: '#000', fontSize: 10, fontWeight: 'bold' }}>
                                  {lang==='es'?'DOMINANTE':'DOMINANT'}
                                </Text>
                              </View>
                            )}
                          </View>
                          <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 3 }}>
                            📌 {lang==='es'?h.careers_es:h.careers_en}
                          </Text>
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>
            );
          })()}

          {/* ══ Anxiety (Balance Emocional) ══ */}
          {localResults.type === 'anxiety' && (() => {
            const levelData: Record<string, {en:string;es:string;emoji:string;color:string;adv_en:string;adv_es:string}> = {
              minimal: { en:'Minimal', es:'Mínimo',   emoji:'🌿', color:'#10b981', adv_en:'Very low anxiety. Keep up healthy habits!',       adv_es:'Ansiedad muy baja. ¡Mantén tus hábitos saludables!' },
              mild:    { en:'Mild',    es:'Leve',     emoji:'😌', color:'#3b82f6', adv_en:'Mild signs. Mindfulness and exercise can help.',   adv_es:'Señales leves. La meditación y el ejercicio ayudan.' },
              moderate:{ en:'Moderate',es:'Moderado', emoji:'🌊', color:'#f59e0b', adv_en:'Consider speaking to a professional.',            adv_es:'Considera hablar con un profesional.' },
              severe:  { en:'Severe',  es:'Severo',   emoji:'⚠️', color:'#ef4444', adv_en:'Please reach out to a mental health professional.',adv_es:'Por favor contacta a un profesional de salud mental.' },
            };
            const lv = levelData[localResults.level] || levelData.minimal;
            return (
              <View style={{ backgroundColor: colors.surfaceSecondary, borderRadius: 16, padding: 18, alignItems: 'center' }}>
                <Text style={{ fontSize: 36, marginBottom: 2 }}>{lv.emoji}</Text>
                <Text style={{ color: lv.color, fontSize: 20, fontWeight: 'bold', marginBottom: 2 }}>
                  {lang==='es'?lv.es:lv.en}
                </Text>
                <GaugeIndicator score={localResults.score} color={lv.color}
                  label={lang==='es'?'Balance Emocional':'Emotional Balance'} colors={colors} />
                <View style={{ backgroundColor: colors.surface, borderRadius: 12, padding: 14,
                  borderWidth: 1, borderColor: lv.color, marginTop: 4 }}>
                  <Text style={{ color: colors.textSecondary, fontSize: 13, textAlign: 'center', lineHeight: 20 }}>
                    {lang==='es'?lv.adv_es:lv.adv_en}
                  </Text>
                </View>
              </View>
            );
          })()}

          {/* ══ Mood (Bienestar) ══ */}
          {localResults.type === 'mood' && (() => {
            const pct = Math.round(localResults.score * 100);
            const moodColor = pct>=75?'#10b981':pct>=50?'#3b82f6':pct>=30?'#f59e0b':'#ef4444';
            const moodLabel = pct>=75?{en:'Flourishing',es:'Floreciendo',emoji:'🌸'}
              :pct>=50?{en:'Balanced',es:'Equilibrado',emoji:'🌿'}
              :pct>=30?{en:'Struggling',es:'Con Dificultades',emoji:'🌦️'}
              :{en:'Needs Attention',es:'Necesita Atención',emoji:'🆘'};
            return (
              <View style={{ backgroundColor: colors.surfaceSecondary, borderRadius: 16, padding: 18, alignItems: 'center' }}>
                <Text style={{ fontSize: 36, marginBottom: 2 }}>{moodLabel.emoji}</Text>
                <Text style={{ color: moodColor, fontSize: 20, fontWeight: 'bold', marginBottom: 2 }}>
                  {lang==='es'?moodLabel.es:moodLabel.en}
                </Text>
                <GaugeIndicator score={localResults.score} color={moodColor}
                  label={lang==='es'?'Bienestar Emocional':'Emotional Well-being'} colors={colors} />
                <View style={{ flexDirection: 'row', gap: 10, justifyContent: 'center', marginTop: 8 }}>
                  {['😔','😐','🙂','😊','🌟'].map((e, i) => {
                    const active = Math.min(4, Math.round(pct / 25)) === i;
                    return (
                      <Text key={i} style={{ fontSize: 26, opacity: active ? 1 : 0.3,
                        transform: [{ scale: active ? 1.3 : 1 }] }}>{e}</Text>
                    );
                  })}
                </View>
              </View>
            );
          })()}

        </ScrollView>

        {/* ── Action Buttons ─────────────────────────────────────────────────── */}
        <View style={{ gap: 10, paddingTop: 10 }}>
          <TouchableOpacity
            style={{ backgroundColor: '#0d2b1a', borderRadius: 12, padding: 14,
              alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8,
              borderWidth: 1, borderColor: '#10b981' }}
            onPress={handleExportResults}
          >
            <Text style={{ fontSize: 18 }}>📄</Text>
            <Text style={{ color: '#10b981', fontWeight: 'bold', fontSize: 14 }}>
              {lang==='es' ? 'EXPORTAR RESULTADOS (PDF)' : 'EXPORT RESULTS (PDF)'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={{ backgroundColor: colors.surfaceSecondary, borderRadius: 12, padding: 14,
              alignItems: 'center', borderWidth: 1, borderColor: colors.border }}
            onPress={onClose}
          >
            <Text style={{ color: colors.textPrimary, fontWeight: 'bold', fontSize: 14 }}>
              {lang==='es' ? '✓  CERRAR' : '✓  CLOSE'}
            </Text>
          </TouchableOpacity>
        </View>
      </>
    );
  };

  // ── Question screen ─────────────────────────────────────────────────────────
  const testTitle: Record<TestType, string> = {
    ocean:     lang==='es'?'Test OCEAN+':'OCEAN+ Test',
    aptitude:  lang==='es'?'Test de Aptitudes':'Aptitude Test',
    vocational:lang==='es'?'Test Vocacional':'Vocational Test',
    anxiety:   lang==='es'?'Test de Balance Emocional':'Emotional Balance Test',
    mood:      lang==='es'?'Test de Bienestar':'Well-being Test',
    mbti:      lang==='es'?'Personalidad 16r':'16r Personality Test',
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false}
      statusBarTranslucent={false} onRequestClose={onClose}>
      <View style={{ flex: 1, width: '100%', height: '100%', backgroundColor: colors.background }}>
        <SafeAreaView style={{ flex: 1 }}>
          <View style={{ flex: 1, padding: 20, paddingBottom: Platform.OS === 'android' ? 85 : 20 }}>

            {psyStep < totalQuestions ? (
              /* ── Question UI ── */
              <>
                <Text style={[styles.modalTitle, { color: colors.primary, textAlign: 'center' }]}>
                  Ψ {testTitle[activeTest]}
                </Text>
                <Text style={{ color: colors.textSecondary, textAlign: 'center', marginBottom: 5, fontSize: 12 }}>
                  {psyStep + 1} / {totalQuestions}
                </Text>
                <View style={{ backgroundColor: colors.surfaceSecondary, height: 4, borderRadius: 2, marginBottom: 20 }}>
                  <View style={{ backgroundColor: colors.primary, height: 4, borderRadius: 2,
                    width: `${((psyStep + 1) / totalQuestions) * 100}%` }} />
                </View>

                <ScrollView showsVerticalScrollIndicator={false} bounces={false} overScrollMode="never"
                  style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 20 }}>
                  <Text style={{ color: colors.textPrimary, fontSize: 18, fontWeight: 'bold',
                    marginBottom: 25, textAlign: 'center', lineHeight: 26 }}>
                    {lang === 'es' ? questions[psyStep].q_es : questions[psyStep].q_en}
                  </Text>
                  {questions[psyStep].opts.map((opt: any, idx: number) => (
                    <TouchableOpacity key={idx}
                      style={{ padding: 16, borderWidth: 1, borderColor: colors.border,
                        borderRadius: 10, marginBottom: 12, backgroundColor: colors.surfaceSecondary }}
                      onPress={() => handleAnswer(idx)}>
                      <Text style={{ color: colors.textPrimary, fontSize: 15 }}>
                        {lang === 'es' ? opt.es : opt.en}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <TouchableOpacity style={{ paddingVertical: 15, alignItems: 'center' }} onPress={onClose}>
                  <Text style={{ color: colors.textSecondary, fontSize: 15, fontWeight: 'bold' }}>
                    {lang === 'es' ? 'Cancelar' : 'Cancel'}
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              /* ── Results UI ── */
              renderResults()
            )}

          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
});
