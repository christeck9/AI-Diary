import React, { useState, useEffect, useRef } from 'react';
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
  savedResults?: any; onRetake?: () => void;
  onAiDescription?: (prompt: string) => void;
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
  INTJ: { emoji: '🏛️', en: 'The Architect', es: 'El Arquitecto', desc_en: 'Strategic and independent thinker driven by long-term vision...', desc_es: 'Pensador estratégico e independiente, guiado por una visión a largo plazo...' },
  INTP: { emoji: '🔬', en: 'The Thinker', es: 'El Pensador', desc_en: 'Innovative logician obsessed with ideas, theories...', desc_es: 'Lógico innovador obsesionado con ideas, teorías y deconstruir problemas...' },
  ENTJ: { emoji: '⚡', en: 'The Commander', es: 'El Comandante', desc_en: 'Bold, decisive leader who thrives on turning vision into reality...', desc_es: 'Líder audaz y decisivo que prospera convirtiendo visión en realidad...' },
  ENTP: { emoji: '💡', en: 'The Debater', es: 'El Debatidor', desc_en: 'Quick-witted intellectual who loves challenging ideas...', desc_es: 'Intelectual de mente ágil que ama desafiar ideas y explorar posibilidades...' },
  INFJ: { emoji: '🌿', en: 'The Advocate', es: 'El Defensor', desc_en: 'Quiet idealist with profound insight into human nature...', desc_es: 'Idealista tranquilo con profunda comprensión de la naturaleza humana...' },
  INFP: { emoji: '🦋', en: 'The Mediator', es: 'El Mediador', desc_en: 'Poetic, empathetic soul guided by deep personal values...', desc_es: 'Alma poética y empática guiada por valores personales profundos...' },
  ENFJ: { emoji: '🌟', en: 'The Protagonist', es: 'El Protagonista', desc_en: 'Charismatic leader who inspires and uplifts others...', desc_es: 'Líder carismático que inspira y eleva a otros mediante conexión genuina...' },
  ENFP: { emoji: '🎇', en: 'The Campaigner', es: 'El Inspirador', desc_en: 'Enthusiastic creative who sees life as a canvas...', desc_es: 'Creativo entusiasta que ve la vida como un lienzo de posibilidades...' },
  ISTJ: { emoji: '📋', en: 'The Logistician', es: 'El Logístico', desc_en: 'Practical, reliable anchor who values duty, tradition...', desc_es: 'Ancla práctica y confiable que valora el deber, la tradición y resultados concretos...' },
  ISFJ: { emoji: '🛡️', en: 'The Defender', es: 'El Protector', desc_en: 'Dedicated, warm protector who quietly supports others...', desc_es: 'Protector dedicado y cálido que apoya a otros silenciosamente...' },
  ESTJ: { emoji: '⚖️', en: 'The Executive', es: 'El Ejecutivo', desc_en: 'Order-driven manager who establishes structure...', desc_es: 'Gestor orientado al orden que establece estructura, hace cumplir estándares...' },
  ESFJ: { emoji: '🤝', en: 'The Consul', es: 'El Cónsul', desc_en: 'Popular, caring social harmony seeker who invests heavily...', desc_es: 'Popular y solidario buscador de armonía social que invierte fuertemente en relaciones...' },
  ISTP: { emoji: '🔧', en: 'The Virtuoso', es: 'El Virtuoso', desc_en: 'Bold experimenter and master of tools who learns by doing...', desc_es: 'Experimentador audaz y maestro de herramientas que aprende haciendo...' },
  ISFP: { emoji: '🎨', en: 'The Adventurer', es: 'El Aventurero', desc_en: 'Flexible artist and authentic soul who lives in the moment...', desc_es: 'Artista flexible y alma auténtica que vive el momento con pasión tranquila...' },
  ESTP: { emoji: '🏄', en: 'The Entrepreneur', es: 'El Emprendedor', desc_en: 'Smart, energetic, perceptive risk-taker who lives for action...', desc_es: 'Arriesgado inteligente, enérgico y perspicaz que vive por la acción y resultados inmediatos...' },
  ESFP: { emoji: '🎭', en: 'The Entertainer', es: 'El Animador', desc_en: 'Spontaneous, energetic performer who brings joy...', desc_es: 'Performers espontáneos y enérgicos que traen alegría y emoción a cada situación...' },
};

// ─── Holland Vocational Labels ────────────────────────────────────────────────
const HOLLAND_LABELS: Record<string, { emoji: string; en: string; es: string; careers_en: string; careers_es: string; desc_en: string; desc_es: string }> = {
  R: { emoji: '🔨', en: 'Realistic', es: 'Realista', careers_en: 'Engineering, Trades, Agriculture', careers_es: 'Ingeniería, Oficios, Agricultura', desc_en: 'Practical, hands-on, and mechanically inclined...', desc_es: 'Práctico, manual y mecánicamente inclinado...' },
  I: { emoji: '🔭', en: 'Investigative', es: 'Investigador', careers_en: 'Science, Research, Medicine', careers_es: 'Ciencia, Investigación, Medicina', desc_en: 'Analytical, curious, and intellectual explorer...', desc_es: 'Analítico, curioso y explorador intelectual de problemas complejos...' },
  A: { emoji: '🎨', en: 'Artistic', es: 'Artístico', careers_en: 'Design, Music, Writing', careers_es: 'Diseño, Música, Escritura', desc_en: 'Creative, expressive, and original thinker...', desc_es: 'Creativo, expresivo y pensador original que prospera en entornos no estructurados...' },
  S: { emoji: '🤗', en: 'Social', es: 'Social', careers_en: 'Teaching, Counseling, Healthcare', careers_es: 'Docencia, Consejería, Salud', desc_en: 'Empathetic, supportive, and nurturing helper...', desc_es: 'Servicial empático y solidario que sobresale en entender y elevar a otros...' },
  E: { emoji: '💼', en: 'Enterprising', es: 'Emprendedor', careers_en: 'Business, Law, Management', careers_es: 'Negocios, Derecho, Gestión', desc_en: 'Adventurous, persuasive, and energetic leader...', desc_es: 'Líder aventurero, persuasivo y enérgico que disfruta influir en otros...' },
  C: { emoji: '📊', en: 'Conventional', es: 'Convencional', careers_en: 'Accounting, Administration, Finance', careers_es: 'Contabilidad, Administración, Finanzas', desc_en: 'Organized, detail-oriented, and systematic thinker...', desc_es: 'Pensador organizado, orientado al detalle y sistemático que valora la precisión...' },
};

// ─── OCEAN dimension metadata ─────────────────────────────────────────────────
const OCEAN_META: Record<string, { emoji: string; color: string; label_en: string; label_es: string; desc_en: string; desc_es: string }> = {
  O: { emoji: '🔭', color: '#a855f7', label_en: 'Openness', label_es: 'Apertura', desc_en: 'Measures curiosity, creativity, and appetite for novelty...', desc_es: 'Mide curiosidad, creatividad y apetito por la novedad...' },
  C: { emoji: '📋', color: '#3b82f6', label_en: 'Conscientiousness', label_es: 'Responsabilidad', desc_en: 'Reflects organization, discipline, and goal-directed behavior...', desc_es: 'Refleja organización, disciplina y conducta orientada a metas...' },
  E: { emoji: '🌟', color: '#f59e0b', label_en: 'Extraversion', label_es: 'Extraversión', desc_en: 'Captures sociability, assertiveness, and energy drawn from external stimulation...', desc_es: 'Captura sociabilidad, asertividad y energía obtenida de estímulos externos...' },
  A: { emoji: '🤝', color: '#10b981', label_en: 'Agreeableness', label_es: 'Amabilidad', desc_en: 'Measures compassion, cooperation, and trust in social relationships...', desc_es: 'Mide compasión, cooperación y confianza en relaciones sociales...' },
  N: { emoji: '⚓', color: '#06b6d4', label_en: 'Stability', label_es: 'Estabilidad', desc_en: 'Measures emotional resilience, calmness, and resistance to stress...', desc_es: 'Mide la resiliencia emocional, la calma y la resistencia al estrés...' },
  D: { emoji: '⚡', color: '#f97316', label_en: 'Decision Speed', label_es: 'Velocidad de Decisión', desc_en: 'Reflects how quickly and confidently you make choices under uncertainty...', desc_es: 'Refleja la rapidez y confianza con que tomas decisiones bajo incertidumbre...' },
  L: { emoji: '📚', color: '#8b5cf6', label_en: 'Learning Style', label_es: 'Estilo de Aprendizaje', desc_en: 'Captures preference for acquiring and processing new knowledge...', desc_es: 'Captura la preferencia para adquirir y procesar conocimiento nuevo...' },
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
  // Core 10 questions (Indices 0-9) - Refactored for Trait framing and Ipsative choices
  {
    q_en: "Historically, when you finally have a free weekend after a heavy week, your default impulse is to...", q_es: "Históricamente, cuando al fin tienes un fin de semana libre tras una semana pesada, tu impulso automático es...",
    opts: [
      { en: "Seek external stimulation (friends, events)", es: "Buscar estimulación externa (amigos, eventos)", dim: 'E', val: 1 },
      { en: "Dive into a personal rabbit hole (reading, research)", es: "Sumergirme en un tema de interés (leer, investigar)", dim: 'O', val: 1 },
      { en: "Restore order to my environment (organize, plan)", es: "Restaurar el orden en mi entorno (organizar, planear)", dim: 'C', val: 1 },
      { en: "Completely unplug to recover mental bandwidth", es: "Desconectarme por completo para recuperar energía mental", dim: 'N', val: 1 },
    ]
  },
  {
    q_en: "A colleague asks for feedback on a flawed project. Which approach aligns with your core philosophy?", q_es: "Un colega pide opinión sobre un proyecto defectuoso. ¿Qué enfoque se alinea más con tu filosofía central?",
    opts: [
      { en: "Deliver objective truth, even if it causes temporary friction", es: "Decir la verdad objetiva, aunque cause fricción temporal", dim: 'A', val: 0 },
      { en: "Protect their confidence first, correcting flaws gently later", es: "Proteger su confianza primero, corrigiendo fallas con tacto después", dim: 'A', val: 1 },
      { en: "Provide a structured, step-by-step breakdown of errors", es: "Proveer un desglose estructurado y paso a paso de los errores", dim: 'C', val: 1 },
      { en: "Brainstorm new directions with them collaboratively", es: "Proponer nuevas direcciones rebotando ideas juntos", dim: 'E', val: 0.5 },
    ]
  },
  {
    q_en: "When faced with a high-stakes, ambiguous decision, your typical pattern is to...", q_es: "Ante una decisión ambigua y de alto riesgo, tu patrón típico es...",
    opts: [
      { en: "Trust my heuristic instincts and execute rapidly", es: "Confiar en mis instintos heurísticos y ejecutar rápido", dim: 'D', val: 1 },
      { en: "Delay action until all data points are analyzed", es: "Retrasar la acción hasta analizar todos los datos", dim: 'D', val: 0 },
      { en: "Consensus-build with a trusted circle of peers", es: "Construir consenso con mi círculo de confianza", dim: 'E', val: 1 },
      { en: "Step away entirely to let my subconscious process it", es: "Alejarme del problema para que mi subconsciente lo procese", dim: 'N', val: 1 },
    ]
  },
  {
    q_en: "When onboarding into a complex new system, you reliably learn best by...", q_es: "Al integrarte a un sistema nuevo y complejo, confiablemente aprendes mejor al...",
    opts: [
      { en: "Breaking things in a sandbox environment (hands-on)", es: "Experimentar y romper cosas en un entorno de prueba (práctica)", dim: 'L', val: 1 },
      { en: "Mapping the underlying architectural concepts first (theory)", es: "Mapear primero los conceptos arquitectónicos subyacentes (teoría)", dim: 'L', val: 0 },
      { en: "Observing a visual breakdown or diagram", es: "Observar un desglose visual o diagrama", dim: 'O', val: 0.5 },
      { en: "Reverse-engineering it completely solo", es: "Hacer ingeniería inversa completamente por mi cuenta", dim: 'O', val: 1 },
    ]
  },
  {
    q_en: "In a mandatory networking event with unfamiliar peers, your consistent strategy is...", q_es: "En un evento social obligatorio con desconocidos, tu estrategia consistente es...",
    opts: [
      { en: "Circulate broadly to maximize superficial connections", es: "Circular ampliamente para maximizar conexiones", dim: 'E', val: 1 },
      { en: "Target one deep, substantive conversation", es: "Buscar una sola conversación profunda y sustancial", dim: 'O', val: 0.7 },
      { en: "Anchor myself to the few people I already know", es: "Anclarme a las pocas personas que ya conozco", dim: 'E', val: 0.3 },
      { en: "Fulfill minimum obligations and exit efficiently", es: "Cumplir lo mínimo indispensable y retirarme eficientemente", dim: 'E', val: 0 },
    ]
  },
  {
    q_en: "If we audited your physical or digital workspace over a random 3-month period, it would mostly be...", q_es: "Si auditáramos tu espacio de trabajo (físico o digital) en un periodo aleatorio de 3 meses, sería principalmente...",
    opts: [
      { en: "Systematically categorized and maintained", es: "Sistemáticamente categorizado y mantenido", dim: 'C', val: 1 },
      { en: "Visually chaotic but functionally accessible to me", es: "Visualmente caótico pero funcionalmente accesible para mí", dim: 'C', val: 0.5 },
      { en: "Fluctuating between extreme mess and hyper-organization", es: "Fluctuando entre caos extremo y ultra-organización", dim: 'O', val: 0.7 },
      { en: "Reflective of my current project's stress level", es: "Un reflejo directo del nivel de estrés de mi proyecto actual", dim: 'N', val: 0.5 },
    ]
  },
  {
    q_en: "When an unexpected crisis derails your week, your immediate internal reaction is to...", q_es: "Cuando una crisis inesperada descarrila tu semana, tu reacción interna inmediata es...",
    opts: [
      { en: "Pivot aggressively into problem-solving mode", es: "Pivotar agresivamente a modo de resolución de problemas", dim: 'D', val: 1 },
      { en: "Isolate to recalibrate my mental state before acting", es: "Aislarme para recalibrar mi estado mental antes de actuar", dim: 'E', val: 0 },
      { en: "Externally verbalize the stress to process it", es: "Verbalizar externamente el estrés para procesarlo", dim: 'A', val: 0.7 },
      { en: "Systematize the damage and re-prioritize the backlog", es: "Sistematizar el daño y re-priorizar mis tareas", dim: 'C', val: 1 },
    ]
  },
  {
    q_en: "If you witness someone struggling with a minor public task, your authentic default is to...", q_es: "Si ves a alguien batallando con una tarea pública menor, tu reacción auténtica por defecto es...",
    opts: [
      { en: "Intervene to assist, assuming they want the help", es: "Intervenir para ayudar, asumiendo que desean la ayuda", dim: 'A', val: 1 },
      { en: "Observe briefly to ensure my help wouldn't be intrusive", es: "Observar un momento para asegurar que mi ayuda no sea intrusiva", dim: 'A', val: 0.5 },
      { en: "Protect my current focus unless they explicitly ask", es: "Proteger mi enfoque actual a menos que pidan ayuda explícitamente", dim: 'A', val: 0.2 },
      { en: "Assess if I have the bandwidth before committing to help", es: "Evaluar si tengo el ancho de banda antes de comprometerme a ayudar", dim: 'D', val: 0.5 },
    ]
  },
  {
    q_en: "When a core piece of your work is harshly criticized by a superior, your historical pattern is...", q_es: "Cuando una parte central de tu trabajo es duramente criticada por un superior, tu patrón histórico es...",
    opts: [
      { en: "Compartmentalize the emotion and extract the actionable data", es: "Compartimentar la emoción y extraer los datos útiles", dim: 'N', val: 1 },
      { en: "Internalize the critique as a reflection of my competence", es: "Internalizar la crítica como reflejo de mi competencia", dim: 'N', val: 0.5 },
      { en: "Instinctively build a logical defense of my architecture", es: "Construir instintivamente una defensa lógica de mi trabajo", dim: 'D', val: 0.8 },
      { en: "Ruminate on the interaction for multiple iteration cycles", es: "Rumiar sobre la interacción por varios días", dim: 'N', val: 0 },
    ]
  },
  {
    q_en: "If you had absolute freedom to structure a long-term goal, you would lean toward...", q_es: "Si tuvieras libertad absoluta para estructurar una meta a largo plazo, te inclinarías hacia...",
    opts: [
      { en: "An exploratory path optimizing for novel discoveries", es: "Un camino exploratorio optimizando por descubrimientos novedosos", dim: 'O', val: 1 },
      { en: "A rigid, milestone-driven roadmap minimizing variance", es: "Una hoja de ruta rígida basada en hitos para minimizar variabilidad", dim: 'C', val: 1 },
      { en: "A low-pressure environment optimizing for sustainability", es: "Un entorno de baja presión optimizando por sostenibilidad", dim: 'N', val: 0.8 },
      { en: "High-risk, high-reward sprints optimizing for speed", es: "Sprints de alto riesgo y recompensa optimizando por velocidad", dim: 'D', val: 1 },
    ]
  },
  // Extension (Indices 10-24)
  {
    q_en: "When a fundamental ideological disagreement arises, you reliably...", q_es: "Cuando surge un desacuerdo ideológico fundamental, tú confiablemente...",
    opts: [
      { en: "View the friction as an intellectual sparring opportunity", es: "Ves la fricción como una oportunidad de debate intelectual", dim: 'O', val: 1 },
      { en: "De-escalate to preserve the functional relationship", es: "Desescalas la situación para preservar la relación funcional", dim: 'A', val: 1 },
      { en: "Experience significant internal physiological tension", es: "Experimentas tensión fisiológica interna significativa", dim: 'N', val: 0 },
      { en: "Disengage entirely as it's an inefficient use of compute", es: "Te desconectas por completo por ser un uso ineficiente de energía", dim: 'E', val: 0.3 },
    ]
  },
  {
    q_en: "When forced to transfer complex knowledge to a novice, your default style is...", q_es: "Al ser forzado a transferir conocimiento complejo a un novato, tu estilo por defecto es...",
    opts: [
      { en: "Generating abstract metaphors and conceptual models", es: "Generar metáforas abstractas y modelos conceptuales", dim: 'O', val: 1 },
      { en: "Providing a linear, highly structured instruction set", es: "Proveer un conjunto de instrucciones lineal y altamente estructurado", dim: 'C', val: 1 },
      { en: "Iteratively reading their emotional feedback to adjust pacing", es: "Leer iterativamente su feedback emocional para ajustar el ritmo", dim: 'A', val: 0.8 },
      { en: "Delivering the absolute minimum viable explanation", es: "Entregar la mínima explicación viable absoluta", dim: 'D', val: 0.7 },
    ]
  },
  {
    q_en: "Over the last year, your digital interruption management (notifications) has been...", q_es: "Durante el último año, tu gestión de interrupciones digitales (notificaciones) ha sido...",
    opts: [
      { en: "Highly permissive to maintain real-time situational awareness", es: "Altamente permisiva para mantener conciencia situacional en tiempo real", dim: 'E', val: 1 },
      { en: "Strictly filtered to allow only critical whitelist alerts", es: "Estrictamente filtrada para permitir solo alertas críticas", dim: 'C', val: 0.8 },
      { en: "Almost universally muted to defend deep work states", es: "Casi universalmente silenciada para defender estados de trabajo profundo", dim: 'E', val: 0 },
      { en: "Processed in asynchronous batches on my own terms", es: "Procesada en lotes asíncronos bajo mis propios términos", dim: 'D', val: 0.5 },
    ]
  },
  {
    q_en: "When analyzing your past career or project shifts, the primary driving variable was usually...", q_es: "Al analizar tus pasados cambios de proyecto o carrera, la variable motriz principal usualmente fue...",
    opts: [
      { en: "The pursuit of autonomy and aggressive goal execution", es: "La búsqueda de autonomía y ejecución agresiva de metas", dim: 'D', val: 1 },
      { en: "The desire to maximize positive impact on a user base/community", es: "El deseo de maximizar el impacto positivo en una comunidad/usuarios", dim: 'A', val: 1 },
      { en: "The need to solve increasingly complex or novel problems", es: "La necesidad de resolver problemas cada vez más complejos o novedosos", dim: 'O', val: 1 },
      { en: "The optimization for long-term predictability and resource security", es: "La optimización por predictibilidad a largo plazo y seguridad", dim: 'N', val: 1 },
    ]
  },
  {
    q_en: "In the 30 minutes before sleep, your consistent baseline behavior is...", q_es: "En los 30 minutos antes de dormir, tu comportamiento base consistente es...",
    opts: [
      { en: "Mentally compiling the architecture for tomorrow's execution", es: "Compilar mentalmente la arquitectura para la ejecución de mañana", dim: 'C', val: 1 },
      { en: "Consuming low-friction dopamine (social feeds, light media)", es: "Consumir dopamina de baja fricción (redes, medios ligeros)", dim: 'E', val: 0.7 },
      { en: "Ingesting dense information (reading, deep-dive videos)", es: "Ingerir información densa (lectura, videos de análisis profundo)", dim: 'L', val: 0.5 },
      { en: "Involuntarily debugging past social or technical errors", es: "Depurar involuntariamente errores sociales o técnicos del pasado", dim: 'N', val: 0 },
    ]
  },
  {
    q_en: "If external dependencies suddenly invalidate your project architecture, you typically...", q_es: "Si dependencias externas invalidan repentinamente la arquitectura de tu proyecto, típicamente tú...",
    opts: [
      { en: "Experience immediate excitement for the refactoring challenge", es: "Sientes emoción inmediata por el reto de refactorizar", dim: 'O', val: 1 },
      { en: "Experience frustration regarding the wasted compute cycles", es: "Sientes frustración por los ciclos de trabajo desperdiciados", dim: 'C', val: 0.5 },
      { en: "Ruthlessly force a workaround to maintain project momentum", es: "Fuerzas implacablemente una solución temporal para mantener el ritmo", dim: 'D', val: 0.8 },
      { en: "Experience a spike in baseline anxiety until a new path is clear", es: "Experimentas un pico de ansiedad hasta que el nuevo camino es claro", dim: 'N', val: 0 },
    ]
  },
  {
    q_en: "When forced into collaborative environments, your historical center of gravity is...", q_es: "Cuando eres forzado a entornos colaborativos, tu centro de gravedad histórico es...",
    opts: [
      { en: "Assuming executive control to optimize group velocity", es: "Asumir control ejecutivo para optimizar la velocidad del grupo", dim: 'D', val: 1 },
      { en: "Isolating my specific module and delivering it flawlessly", es: "Aislar mi módulo específico y entregarlo impecablemente", dim: 'C', val: 1 },
      { en: "Acting as the integration layer resolving interpersonal merge conflicts", es: "Actuar como capa de integración resolviendo conflictos interpersonales", dim: 'A', val: 1 },
      { en: "Injecting lateral thinking to prevent standard-solution bias", es: "Inyectar pensamiento lateral para prevenir soluciones estándar", dim: 'O', val: 1 },
    ]
  },
  {
    q_en: "Facing a massively parallel workload, your documented execution strategy is to...", q_es: "Frente a una carga de trabajo masivamente paralela, tu estrategia de ejecución documentada es...",
    opts: [
      { en: "Attack the highest-complexity bottleneck immediately", es: "Atacar el cuello de botella de mayor complejidad inmediatamente", dim: 'D', val: 1 },
      { en: "Generate a rigid topological sort of dependencies first", es: "Generar primero un orden topológico rígido de dependencias", dim: 'C', val: 1 },
      { en: "Buffer the stress by delaying initialization (procrastination)", es: "Amortiguar el estrés retrasando la inicialización (procrastinación)", dim: 'N', val: 0.5 },
      { en: "Clear all low-compute micro-tasks to build psychological momentum", es: "Limpiar las micro-tareas rápidas para ganar inercia psicológica", dim: 'D', val: 0.5 },
    ]
  },
  {
    q_en: "Regarding broadcasting yourself to a large audience, your long-term pattern shows...", q_es: "Respecto a presentarte ante una gran audiencia, tu patrón a largo plazo muestra que...",
    opts: [
      { en: "You actively farm the energy delta of being perceived", es: "Activamente cultivas la energía que te da ser percibido", dim: 'E', val: 1 },
      { en: "You rely on exhaustive pre-computation (rehearsal) to survive it", es: "Dependes de pre-computación exhaustiva (ensayo) para sobrevivirlo", dim: 'C', val: 0.8 },
      { en: "You experience severe threat-response activation but execute anyway", es: "Experimentas severa respuesta de amenaza pero ejecutas de todos modos", dim: 'N', val: 0.3 },
      { en: "You detach from the audience and focus purely on data transmission", es: "Te desapegas de la audiencia y te enfocas puramente en transmitir datos", dim: 'O', val: 0.7 },
    ]
  },
  {
    q_en: "When a node in your network (a friend) experiences system failure (sadness), you reliably...", q_es: "Cuando un nodo en tu red (un amigo) experimenta falla de sistema (tristeza), confiablemente tú...",
    opts: [
      { en: "Compile a list of actionable patches to resolve the root cause", es: "Compilas una lista de parches ejecutables para resolver la causa raíz", dim: 'D', val: 0.7 },
      { en: "Allocate processing power purely to listening and mirroring state", es: "Asignas poder de procesamiento puramente a escuchar y empatizar", dim: 'A', val: 1 },
      { en: "Maintain distance to prevent cascading emotional failure", es: "Mantienes distancia para prevenir fallas emocionales en cascada", dim: 'E', val: 0 },
      { en: "Deploy humor or distraction protocols to force a state change", es: "Despliegas protocolos de humor para forzar un cambio de estado", dim: 'E', val: 1 },
    ]
  },
  {
    q_en: "If we analyzed your 5-year personal roadmap, we would find...", q_es: "Si analizáramos tu hoja de ruta personal a 5 años, encontraríamos...",
    opts: [
      { en: "Highly granular, documented milestones and OKRs", es: "Hitos y OKRs altamente granulares y documentados", dim: 'C', val: 1 },
      { en: "A clear overarching architecture, stored purely in memory", es: "Una arquitectura general clara, almacenada puramente en memoria", dim: 'O', val: 0.7 },
      { en: "Constant branch-switching based on newly discovered optimizations", es: "Cambios constantes de rama basados en optimizaciones recién descubiertas", dim: 'O', val: 1 },
      { en: "Minimal long-term state; optimized for immediate local maximums", es: "Mínimo estado a largo plazo; optimizado para máximos locales inmediatos", dim: 'N', val: 1 },
    ]
  },
  {
    q_en: "Historically, when bootstrapping a new domain of interest (hobby), your process is...", q_es: "Históricamente, al inicializar un nuevo dominio de interés (hobby), tu proceso es...",
    opts: [
      { en: "Aggressively acquiring top-tier hardware/tools before mastering basics", es: "Adquirir agresivamente hardware/herramientas top antes de dominar lo básico", dim: 'D', val: 1 },
      { en: "Exhausting the theoretical documentation before writing 'Hello World'", es: "Agotar la documentación teórica antes del primer 'Hello World'", dim: 'L', val: 1 },
      { en: "Immediately integrating into the open-source community/guild", es: "Integrarme de inmediato a la comunidad/gremio del tema", dim: 'E', val: 1 },
      { en: "Brute-forcing execution through pure, unstructured trial and error", es: "Forzar la ejecución mediante prueba y error pura y desestructurada", dim: 'O', val: 1 },
    ]
  },
  {
    q_en: "Encountering a cryptographic-level logic puzzle, your baseline response is...", q_es: "Al encontrar un rompecabezas lógico de alta complejidad, tu respuesta base es...",
    opts: [
      { en: "Dopaminergic spike due to the novelty of the challenge", es: "Pico de dopamina debido a la novedad del reto", dim: 'O', val: 1 },
      { en: "Methodical, algorithmic reduction of the problem space", es: "Reducción metódica y algorítmica del espacio del problema", dim: 'C', val: 1 },
      { en: "Rapid depletion of patience resulting in process termination", es: "Rápido agotamiento de paciencia resultando en terminación del proceso", dim: 'N', val: 0 },
      { en: "Bypassing the friction by querying an external oracle (asking for help)", es: "Evitar la fricción consultando a un oráculo externo (pedir ayuda)", dim: 'A', val: 0.5 },
    ]
  },
  {
    q_en: "Observing a systemic injustice in your environment, your reliable action is to...", q_es: "Al observar una injusticia sistémica en tu entorno, tu acción confiable es...",
    opts: [
      { en: "Execute an immediate, unilateral override (intervene directly)", es: "Ejecutar una anulación unilateral inmediata (intervenir directamente)", dim: 'D', val: 1 },
      { en: "Broadcast vocal dissent to mobilize the network", es: "Emitir disidencia vocal para movilizar a la red", dim: 'E', val: 1 },
      { en: "Document the flaw and submit it through established protocols", es: "Documentar la falla y enviarla por los protocolos establecidos", dim: 'C', val: 1 },
      { en: "Experience internal compute drain (powerless frustration)", es: "Experimentar drenaje interno (frustración impotente)", dim: 'N', val: 0 },
    ]
  },
  {
    q_en: "If we mapped your social graph (friend network) over your lifetime, it would show...", q_es: "Si mapeáramos tu grafo social (red de amigos) a lo largo de tu vida, mostraría...",
    opts: [
      { en: "A highly distributed network with massive node breadth", es: "Una red altamente distribuida con masiva amplitud de nodos", dim: 'E', val: 1 },
      { en: "A severely restricted topology with extremely high bandwidth connections", es: "Una topología muy restringida con conexiones de altísimo ancho de banda", dim: 'A', val: 1 },
      { en: "Clusters formed strictly around niche ideological compatibility", es: "Clústers formados estrictamente en torno a compatibilidad ideológica nicho", dim: 'O', val: 0.8 },
      { en: "Nodes acquired almost exclusively as side-effects of professional tasks", es: "Nodos adquiridos casi exclusivamente como efecto secundario del trabajo", dim: 'C', val: 0.6 },
    ]
  },
];

export const APTITUDE_QUESTIONS = [
  {
    q_en: "Which number follows the sequence: 2, 4, 8, 16...", q_es: "¿Qué número sigue la serie: 2, 4, 8, 16...",
    opts: [{ en: "32", es: "32", val: 1, correct: true }, { en: "24", es: "24", val: 0 }, { en: "64", es: "64", val: 0 }, { en: "20", es: "20", val: 0 }]
  },
  {
    q_en: "Complete: 'Sun' is to 'Day' as 'Moon' is to...", q_es: "Completa: 'Sol' es a 'Día' como 'Luna' es a...",
    opts: [{ en: "Night", es: "Noche", val: 1, correct: true }, { en: "Stars", es: "Estrellas", val: 0 }, { en: "Dark", es: "Oscuridad", val: 0 }, { en: "Sleep", es: "Dormir", val: 0 }]
  },
  {
    q_en: "If all Roses are flowers, and some flowers fade, then...", q_es: "Si todas las Rosas son flores, y algunas flores se marchitan, entonces...",
    opts: [{ en: "Some Roses might fade", es: "Algunas Rosas podrían marchitarse", val: 1, correct: true }, { en: "All Roses fade", es: "Todas las Rosas se marchitan", val: 0 }, { en: "No Roses fade", es: "Ninguna Rosa se marchita", val: 0 }, { en: "Flowers are Roses", es: "Las flores son Rosas", val: 0 }]
  },
  {
    q_en: "Which word does NOT belong?", q_es: "¿Qué palabra NO pertenece al grupo?",
    opts: [{ en: "Apple", es: "Manzana", val: 0 }, { en: "Carrot", es: "Zanahoria", val: 1, correct: true }, { en: "Banana", es: "Plátano", val: 0 }, { en: "Grape", es: "Uva", val: 0 }]
  },
  {
    q_en: "Solve: 15 + (12 / 3) =", q_es: "Resuelve: 15 + (12 / 3) =",
    opts: [{ en: "19", es: "19", val: 1, correct: true }, { en: "9", es: "9", val: 0 }, { en: "27", es: "27", val: 0 }, { en: "18", es: "18", val: 0 }]
  },
  {
    q_en: "A train travels 60km in 1 hour. How long for 150km?", q_es: "Un tren viaja 60km en 1 hora. ¿Cuánto tarda en 150km?",
    opts: [{ en: "2.5 hours", es: "2.5 horas", val: 1, correct: true }, { en: "2 hours", es: "2 horas", val: 0 }, { en: "3 hours", es: "3 horas", val: 0 }, { en: "1.5 hours", es: "1.5 horas", val: 0 }]
  },
  {
    q_en: "Opposite of 'Stagnant' is...", q_es: "Lo opuesto de 'Estancado' es...",
    opts: [{ en: "Flowing", es: "Fluido", val: 1, correct: true }, { en: "Still", es: "Quieto", val: 0 }, { en: "Old", es: "Viejo", val: 0 }, { en: "Heavy", es: "Pesado", val: 0 }]
  },
  {
    q_en: "Which shape comes next: Circle, Square, Circle...", q_es: "¿Qué forma sigue: Círculo, Cuadrado, Círculo...",
    opts: [{ en: "Square", es: "Cuadrado", val: 1, correct: true }, { en: "Triangle", es: "Triángulo", val: 0 }, { en: "Circle", es: "Círculo", val: 0 }, { en: "Hexagon", es: "Hexágono", val: 0 }]
  },
  {
    q_en: "If 3 cats catch 3 mice in 3 minutes, how long for 100 cats to catch 100 mice?", q_es: "Si 3 gatos cazan 3 ratones en 3 min, ¿cuánto tardan 100 gatos en cazar 100 ratones?",
    opts: [{ en: "3 minutes", es: "3 minutos", val: 1, correct: true }, { en: "100 minutes", es: "100 minutos", val: 0 }, { en: "1 minute", es: "1 minuto", val: 0 }, { en: "33 minutes", es: "33 minutos", val: 0 }]
  },
  {
    q_en: "Rearrange 'EART' to find a planet.", q_es: "Reordena 'EART' para hallar un planeta.",
    opts: [{ en: "Earth", es: "Tierra", val: 1, correct: true }, { en: "Mars", es: "Marte", val: 0 }, { en: "Venus", es: "Venus", val: 0 }, { en: "Jupiter", es: "Júpiter", val: 0 }]
  },
  {
    q_en: "Which is the largest fraction?", q_es: "¿Cuál es la fracción más grande?",
    opts: [{ en: "1/2", es: "1/2", val: 0 }, { en: "3/4", es: "3/4", val: 1, correct: true }, { en: "2/3", es: "2/3", val: 0 }, { en: "5/8", es: "5/8", val: 0 }]
  },
  {
    q_en: "If you rotate a 'P' 180 degrees, it looks like...", q_es: "Si giras una 'P' 180 grados, se parece a...",
    opts: [{ en: "d", es: "d", val: 1, correct: true }, { en: "b", es: "b", val: 0 }, { en: "q", es: "q", val: 0 }, { en: "p", es: "p", val: 0 }]
  },
  {
    q_en: "Complete the series: J, F, M, A, M, J...", q_es: "Completa la serie: E, F, M, A, M, J...",
    opts: [{ en: "J (July)", es: "J (Julio)", val: 1, correct: true }, { en: "A (August)", es: "A (Agosto)", val: 0 }, { en: "S", es: "S", val: 0 }, { en: "O", es: "O", val: 0 }]
  },
  {
    q_en: "A box has 4 red balls and 6 blue balls. Probability of red?", q_es: "Una caja tiene 4 bolas rojas y 6 azules. ¿Probabilidad de roja?",
    opts: [{ en: "0.4", es: "0.4", val: 1, correct: true }, { en: "0.6", es: "0.6", val: 0 }, { en: "0.5", es: "0.5", val: 0 }, { en: "4/6", es: "4/6", val: 0 }]
  },
  {
    q_en: "Which word means 'to improve'?", q_es: "¿Qué palabra significa 'mejorar'?",
    opts: [{ en: "Ameliorate", es: "Aminorar", val: 1, correct: true }, { en: "Deteriorate", es: "Deteriorar", val: 0 }, { en: "Stagnate", es: "Estancar", val: 0 }, { en: "Vitiate", es: "Viciar", val: 0 }]
  },
  {
    q_en: "If X is taller than Y, and Y is taller than Z...", q_es: "Si X es más alto que Y, e Y más alto que Z...",
    opts: [{ en: "X is the tallest", es: "X es el más alto", val: 1, correct: true }, { en: "Z is the tallest", es: "Z es el más alto", val: 0 }, { en: "Y is the tallest", es: "Y es el más alto", val: 0 }, { en: "None", es: "Ninguno", val: 0 }]
  },
  {
    q_en: "How many degrees in a triangle?", q_es: "¿Cuántos grados hay en un triángulo?",
    opts: [{ en: "180", es: "180", val: 1, correct: true }, { en: "90", es: "90", val: 0 }, { en: "360", es: "360", val: 0 }, { en: "270", es: "270", val: 0 }]
  },
  {
    q_en: "What is the square root of 81?", q_es: "¿Cuál es la raíz cuadrada de 81?",
    opts: [{ en: "9", es: "9", val: 1, correct: true }, { en: "7", es: "7", val: 0 }, { en: "8", es: "8", val: 0 }, { en: "11", es: "11", val: 0 }]
  },
  {
    q_en: "Which is a prime number?", q_es: "¿Cuál es un número primo?",
    opts: [{ en: "17", es: "17", val: 1, correct: true }, { en: "15", es: "15", val: 0 }, { en: "21", es: "21", val: 0 }, { en: "9", es: "9", val: 0 }]
  },
  {
    q_en: "A clock shows 3:15. What is the angle between hands?", q_es: "Un reloj marca las 3:15. ¿Ángulo entre las manecillas?",
    opts: [{ en: "7.5°", es: "7.5°", val: 1, correct: true }, { en: "0°", es: "0°", val: 0 }, { en: "15°", es: "15°", val: 0 }, { en: "90°", es: "90°", val: 0 }]
  },
  {
    q_en: "Which country is an island?", q_es: "¿Qué país es una isla?",
    opts: [{ en: "Japan", es: "Japón", val: 1, correct: true }, { en: "Brazil", es: "Brasil", val: 0 }, { en: "Egypt", es: "Egipto", val: 0 }, { en: "Canada", es: "Canadá", val: 0 }]
  },
  {
    q_en: "What is 20% of 200?", q_es: "¿Cuánto es el 20% de 200?",
    opts: [{ en: "40", es: "40", val: 1, correct: true }, { en: "20", es: "20", val: 0 }, { en: "50", es: "50", val: 0 }, { en: "100", es: "100", val: 0 }]
  },
  {
    q_en: "If a=5 and b=10, then 2a + b =", q_es: "Si a=5 y b=10, entonces 2a + b =",
    opts: [{ en: "20", es: "20", val: 1, correct: true }, { en: "15", es: "15", val: 0 }, { en: "25", es: "25", val: 0 }, { en: "30", es: "30", val: 0 }]
  },
  {
    q_en: "Which word is a synonym for 'Vibrant'?", q_es: "¿Qué palabra es sinónimo de 'Vibrante'?",
    opts: [{ en: "Energetic", es: "Enérgico", val: 1, correct: true }, { en: "Dull", es: "Apagado", val: 0 }, { en: "Quiet", es: "Silencioso", val: 0 }, { en: "Slow", es: "Lento", val: 0 }]
  },
  {
    q_en: "If a doctor gives you 3 pills to take one every 30 mins...", q_es: "Si un médico te da 3 pastillas para tomar una cada 30 min...",
    opts: [{ en: "It lasts 1 hour", es: "Dura 1 hora", val: 1, correct: true }, { en: "It lasts 1.5 hours", es: "Dura 1.5 horas", val: 0 }, { en: "It lasts 30 mins", es: "Dura 30 min", val: 0 }, { en: "It lasts 2 hours", es: "Dura 2 horas", val: 0 }]
  },
];

export const VOCATIONAL_QUESTIONS = [
  // Refactored to force trait-based historical assessment rather than current mood
  {
    q_en: "Consistently throughout my life, I have been drawn to working with tools, machines, or physical systems.", q_es: "Consistentemente a lo largo de mi vida, me he sentido atraído/a por trabajar con herramientas, máquinas o sistemas físicos.",
    opts: [{ en: "Strongly Agree", es: "Muy de acuerdo", val: 1, type: 'R' }, { en: "Agree", es: "De acuerdo", val: 0.7 }, { en: "Neutral", es: "Neutral", val: 0.5 }, { en: "Disagree", es: "En desacuerdo", val: 0 }]
  },
  {
    q_en: "My historical pattern shows a deep satisfaction in deconstructing complex scientific or logical problems.", q_es: "Mi patrón histórico muestra una profunda satisfacción al deconstruir problemas lógicos o científicos complejos.",
    opts: [{ en: "Strongly Agree", es: "Muy de acuerdo", val: 1, type: 'I' }, { en: "Agree", es: "De acuerdo", val: 0.7 }, { en: "Neutral", es: "Neutral", val: 0.5 }, { en: "Disagree", es: "En desacuerdo", val: 0 }]
  },
  {
    q_en: "Regardless of my job, I consistently seek out avenues to produce original artistic or creative works.", q_es: "Independientemente de mi trabajo, constantemente busco vías para producir obras artísticas o creativas originales.",
    opts: [{ en: "Strongly Agree", es: "Muy de acuerdo", val: 1, type: 'A' }, { en: "Agree", es: "De acuerdo", val: 0.7 }, { en: "Neutral", es: "Neutral", val: 0.5 }, { en: "Disagree", es: "En desacuerdo", val: 0 }]
  },
  {
    q_en: "A defining trait of my life is dedicating energy to mentoring, counseling, or helping people directly.", q_es: "Un rasgo definitorio de mi vida es dedicar energía a ser mentor, aconsejar o ayudar personas directamente.",
    opts: [{ en: "Strongly Agree", es: "Muy de acuerdo", val: 1, type: 'S' }, { en: "Agree", es: "De acuerdo", val: 0.7 }, { en: "Neutral", es: "Neutral", val: 0.5 }, { en: "Disagree", es: "En desacuerdo", val: 0 }]
  },
  {
    q_en: "I have a proven track record of naturally assuming leadership to orchestrate teams or business ventures.", q_es: "Tengo un historial comprobado de asumir naturalmente el liderazgo para orquestar equipos o proyectos de negocios.",
    opts: [{ en: "Strongly Agree", es: "Muy de acuerdo", val: 1, type: 'E' }, { en: "Agree", es: "De acuerdo", val: 0.7 }, { en: "Neutral", es: "Neutral", val: 0.5 }, { en: "Disagree", es: "En desacuerdo", val: 0 }]
  },
  {
    q_en: "I fundamentally rely on creating highly accurate records, strict procedures, and structured data.", q_es: "Fundamentalmente dependo de crear registros altamente precisos, procedimientos estrictos y datos estructurados.",
    opts: [{ en: "Strongly Agree", es: "Muy de acuerdo", val: 1, type: 'C' }, { en: "Agree", es: "De acuerdo", val: 0.7 }, { en: "Neutral", es: "Neutral", val: 0.5 }, { en: "Disagree", es: "En desacuerdo", val: 0 }]
  },
  {
    q_en: "I have reliably preferred environments that require physical interaction with nature or the outdoors.", q_es: "Confiablemente he preferido entornos que requieren interacción física con la naturaleza o el aire libre.",
    opts: [{ en: "Strongly Agree", es: "Muy de acuerdo", val: 1, type: 'R' }, { en: "Agree", es: "De acuerdo", val: 0.7 }, { en: "Neutral", es: "Neutral", val: 0.5 }, { en: "Disagree", es: "En desacuerdo", val: 0 }]
  },
  {
    q_en: "Consuming dense information about new scientific discoveries is a core part of my routine.", q_es: "Consumir información densa sobre nuevos descubrimientos científicos es una parte central de mi rutina.",
    opts: [{ en: "Strongly Agree", es: "Muy de acuerdo", val: 1, type: 'I' }, { en: "Agree", es: "De acuerdo", val: 0.7 }, { en: "Neutral", es: "Neutral", val: 0.5 }, { en: "Disagree", es: "En desacuerdo", val: 0 }]
  },
  {
    q_en: "Expressing myself through musical instruments or performing arts is non-negotiable for my well-being.", q_es: "Expresarme mediante instrumentos musicales o artes escénicas es innegociable para mi bienestar.",
    opts: [{ en: "Strongly Agree", es: "Muy de acuerdo", val: 1, type: 'A' }, { en: "Agree", es: "De acuerdo", val: 0.7 }, { en: "Neutral", es: "Neutral", val: 0.5 }, { en: "Disagree", es: "En desacuerdo", val: 0 }]
  },
  {
    q_en: "I consistently derive deep satisfaction from designing training structures to elevate others' skills.", q_es: "Constantemente derivo profunda satisfacción al diseñar estructuras de entrenamiento para elevar las habilidades de otros.",
    opts: [{ en: "Strongly Agree", es: "Muy de acuerdo", val: 1, type: 'S' }, { en: "Agree", es: "De acuerdo", val: 0.7 }, { en: "Neutral", es: "Neutral", val: 0.5 }, { en: "Disagree", es: "En desacuerdo", val: 0 }]
  },
  {
    q_en: "I am inherently driven by the challenge of negotiating deals and persuading stakeholders.", q_es: "Estoy inherentemente motivado/a por el reto de negociar tratos y persuadir a tomadores de decisiones.",
    opts: [{ en: "Strongly Agree", es: "Muy de acuerdo", val: 1, type: 'E' }, { en: "Agree", es: "De acuerdo", val: 0.7 }, { en: "Neutral", es: "Neutral", val: 0.5 }, { en: "Disagree", es: "En desacuerdo", val: 0 }]
  },
  {
    q_en: "Systematizing office files, schedules, or logistics architectures brings me clear psychological comfort.", q_es: "Sistematizar archivos, agendas o arquitecturas logísticas me brinda un claro confort psicológico.",
    opts: [{ en: "Strongly Agree", es: "Muy de acuerdo", val: 1, type: 'C' }, { en: "Agree", es: "De acuerdo", val: 0.7 }, { en: "Neutral", es: "Neutral", val: 0.5 }, { en: "Disagree", es: "En desacuerdo", val: 0 }]
  },
  {
    q_en: "When something breaks at home, my historical instinct is to repair the hardware myself.", q_es: "Cuando algo se rompe en casa, mi instinto histórico es reparar el hardware yo mismo/a.",
    opts: [{ en: "Strongly Agree", es: "Muy de acuerdo", val: 1, type: 'R' }, { en: "Agree", es: "De acuerdo", val: 0.7 }, { en: "Neutral", es: "Neutral", val: 0.5 }, { en: "Disagree", es: "En desacuerdo", val: 0 }]
  },
  {
    q_en: "Running controlled experiments to test hypotheses is a recurring theme in how I approach the world.", q_es: "Ejecutar experimentos controlados para probar hipótesis es un tema recurrente en cómo abordo el mundo.",
    opts: [{ en: "Strongly Agree", es: "Muy de acuerdo", val: 1, type: 'I' }, { en: "Agree", es: "De acuerdo", val: 0.7 }, { en: "Neutral", es: "Neutral", val: 0.5 }, { en: "Disagree", es: "En desacuerdo", val: 0 }]
  },
  {
    q_en: "Drafting original narratives, poetry, or creative writing is a consistent outlet for my internal state.", q_es: "Redactar narrativas originales, poesía o escritura creativa es una salida consistente para mi estado interno.",
    opts: [{ en: "Strongly Agree", es: "Muy de acuerdo", val: 1, type: 'A' }, { en: "Agree", es: "De acuerdo", val: 0.7 }, { en: "Neutral", es: "Neutral", val: 0.5 }, { en: "Disagree", es: "En desacuerdo", val: 0 }]
  },
  {
    q_en: "Allocating time to social causes or volunteering has been a stable pillar of my adult life.", q_es: "Asignar tiempo a causas sociales o voluntariado ha sido un pilar estable en mi vida adulta.",
    opts: [{ en: "Strongly Agree", es: "Muy de acuerdo", val: 1, type: 'S' }, { en: "Agree", es: "De acuerdo", val: 0.7 }, { en: "Neutral", es: "Neutral", val: 0.5 }, { en: "Disagree", es: "En desacuerdo", val: 0 }]
  },
  {
    q_en: "The risk and reward mechanics of starting my own ventures natively appeal to my core drive.", q_es: "Las mecánicas de riesgo y recompensa de iniciar mis propios proyectos apelan nativamente a mi motor principal.",
    opts: [{ en: "Strongly Agree", es: "Muy de acuerdo", val: 1, type: 'E' }, { en: "Agree", es: "De acuerdo", val: 0.7 }, { en: "Neutral", es: "Neutral", val: 0.5 }, { en: "Disagree", es: "En desacuerdo", val: 0 }]
  },
  {
    q_en: "I operate at peak efficiency when strictly adhering to a predefined, predictable routine.", q_es: "Opero a máxima eficiencia cuando me adhiero estrictamente a una rutina predefinida y predecible.",
    opts: [{ en: "Strongly Agree", es: "Muy de acuerdo", val: 1, type: 'C' }, { en: "Agree", es: "De acuerdo", val: 0.7 }, { en: "Neutral", es: "Neutral", val: 0.5 }, { en: "Disagree", es: "En desacuerdo", val: 0 }]
  },
  {
    q_en: "Cultivating biological systems (gardening, farming, animals) is historically grounding for me.", q_es: "Cultivar sistemas biológicos (jardinería, agricultura, animales) históricamente me da estabilidad.",
    opts: [{ en: "Strongly Agree", es: "Muy de acuerdo", val: 1, type: 'R' }, { en: "Agree", es: "De acuerdo", val: 0.7 }, { en: "Neutral", es: "Neutral", val: 0.5 }, { en: "Disagree", es: "En desacuerdo", val: 0 }]
  },
  {
    q_en: "I have an enduring fascination with mapping macro systems like astronomy, physics, or geology.", q_es: "Tengo una fascinación perdurable por mapear macro sistemas como astronomía, física o geología.",
    opts: [{ en: "Strongly Agree", es: "Muy de acuerdo", val: 1, type: 'I' }, { en: "Agree", es: "De acuerdo", val: 0.7 }, { en: "Neutral", es: "Neutral", val: 0.5 }, { en: "Disagree", es: "En desacuerdo", val: 0 }]
  },
  {
    q_en: "My historical pattern involves heavily modifying my aesthetics (clothes, spaces, visual designs).", q_es: "Mi patrón histórico implica modificar fuertemente mi estética (ropa, espacios, diseños visuales).",
    opts: [{ en: "Strongly Agree", es: "Muy de acuerdo", val: 1, type: 'A' }, { en: "Agree", es: "De acuerdo", val: 0.7 }, { en: "Neutral", es: "Neutral", val: 0.5 }, { en: "Disagree", es: "En desacuerdo", val: 0 }]
  },
  {
    q_en: "I am consistently perceived by my network as the de-facto therapist or crisis counselor.", q_es: "Soy consistentemente percibido por mi red como el terapeuta o consejero de crisis de facto.",
    opts: [{ en: "Strongly Agree", es: "Muy de acuerdo", val: 1, type: 'S' }, { en: "Agree", es: "De acuerdo", val: 0.7 }, { en: "Neutral", es: "Neutral", val: 0.5 }, { en: "Disagree", es: "En desacuerdo", val: 0 }]
  },
  {
    q_en: "I naturally gravitate toward roles where aggressive resource optimization and networking dictate success.", q_es: "Naturalmente gravito hacia roles donde la optimización agresiva de recursos y el networking dictan el éxito.",
    opts: [{ en: "Strongly Agree", es: "Muy de acuerdo", val: 1, type: 'E' }, { en: "Agree", es: "De acuerdo", val: 0.7 }, { en: "Neutral", es: "Neutral", val: 0.5 }, { en: "Disagree", es: "En desacuerdo", val: 0 }]
  },
  {
    q_en: "Balancing ledgers, managing budget spreadsheets, and auditing data aligns with my cognitive strengths.", q_es: "Balancear libros, gestionar hojas de cálculo presupuestales y auditar datos se alinea con mis fortalezas cognitivas.",
    opts: [{ en: "Strongly Agree", es: "Muy de acuerdo", val: 1, type: 'C' }, { en: "Agree", es: "De acuerdo", val: 0.7 }, { en: "Neutral", es: "Neutral", val: 0.5 }, { en: "Disagree", es: "En desacuerdo", val: 0 }]
  },
  {
    q_en: "I am inherently satisfied by the tangible output of structural construction or heavy fabrication.", q_es: "Me satisface inherentemente el resultado tangible de la construcción estructural o fabricación pesada.",
    opts: [{ en: "Strongly Agree", es: "Muy de acuerdo", val: 1, type: 'R' }, { en: "Agree", es: "De acuerdo", val: 0.7 }, { en: "Neutral", es: "Neutral", val: 0.5 }, { en: "Disagree", es: "En desacuerdo", val: 0 }]
  },
];

export const ANXIETY_QUESTIONS = [
  // GAD-7 based: Strictly anchoring to "Over the last 2 weeks" to filter state noise.
  {
    q_en: "Over the last 2 weeks: Feeling nervous, anxious, or on edge.", q_es: "Durante las ÚLTIMAS 2 SEMANAS: Sentirse nervioso/a, ansioso/a o con los nervios de punta.",
    opts: [{ en: "Not at all", es: "Para nada", val: 0 }, { en: "Several days", es: "Varios días", val: 1 }, { en: "More than half the days", es: "Más de la mitad de los días", val: 2 }, { en: "Nearly every day", es: "Casi todos los días", val: 3 }]
  },
  {
    q_en: "Over the last 2 weeks: Not being able to stop or control worrying.", q_es: "Durante las ÚLTIMAS 2 SEMANAS: No poder detener o controlar las preocupaciones.",
    opts: [{ en: "Not at all", es: "Para nada", val: 0 }, { en: "Several days", es: "Varios días", val: 1 }, { en: "More than half the days", es: "Más de la mitad de los días", val: 2 }, { en: "Nearly every day", es: "Casi todos los días", val: 3 }]
  },
  {
    q_en: "Over the last 2 weeks: Worrying too much about different things.", q_es: "Durante las ÚLTIMAS 2 SEMANAS: Preocuparse demasiado por diferentes cosas.",
    opts: [{ en: "Not at all", es: "Para nada", val: 0 }, { en: "Several days", es: "Varios días", val: 1 }, { en: "More than half the days", es: "Más de la mitad de los días", val: 2 }, { en: "Nearly every day", es: "Casi todos los días", val: 3 }]
  },
  {
    q_en: "Over the last 2 weeks: Trouble relaxing.", q_es: "Durante las ÚLTIMAS 2 SEMANAS: Dificultad para relajarse.",
    opts: [{ en: "Not at all", es: "Para nada", val: 0 }, { en: "Several days", es: "Varios días", val: 1 }, { en: "More than half the days", es: "Más de la mitad de los días", val: 2 }, { en: "Nearly every day", es: "Casi todos los días", val: 3 }]
  },
  {
    q_en: "Over the last 2 weeks: Being so restless that it is hard to sit still.", q_es: "Durante las ÚLTIMAS 2 SEMANAS: Estar tan inquieto/a que es difícil quedarse quieto/a.",
    opts: [{ en: "Not at all", es: "Para nada", val: 0 }, { en: "Several days", es: "Varios días", val: 1 }, { en: "More than half the days", es: "Más de la mitad de los días", val: 2 }, { en: "Nearly every day", es: "Casi todos los días", val: 3 }]
  },
  {
    q_en: "Over the last 2 weeks: Becoming easily annoyed or irritable.", q_es: "Durante las ÚLTIMAS 2 SEMANAS: Irritarse o enfadarse con facilidad.",
    opts: [{ en: "Not at all", es: "Para nada", val: 0 }, { en: "Several days", es: "Varios días", val: 1 }, { en: "More than half the days", es: "Más de la mitad de los días", val: 2 }, { en: "Nearly every day", es: "Casi todos los días", val: 3 }]
  },
  {
    q_en: "Over the last 2 weeks: Feeling afraid as if something awful might happen.", q_es: "Durante las ÚLTIMAS 2 SEMANAS: Sentir miedo como si algo terrible pudiera pasar.",
    opts: [{ en: "Not at all", es: "Para nada", val: 0 }, { en: "Several days", es: "Varios días", val: 1 }, { en: "More than half the days", es: "Más de la mitad de los días", val: 2 }, { en: "Nearly every day", es: "Casi todos los días", val: 3 }]
  },
  {
    q_en: "Over the last 2 weeks: Heart racing or pounding unprompted.", q_es: "Durante las ÚLTIMAS 2 SEMANAS: Corazón acelerado o palpitaciones sin motivo.",
    opts: [{ en: "Not at all", es: "Para nada", val: 0 }, { en: "Several days", es: "Varios días", val: 1 }, { en: "More than half the days", es: "Más de la mitad de los días", val: 2 }, { en: "Nearly every day", es: "Casi todos los días", val: 3 }]
  },
  {
    q_en: "Over the last 2 weeks: Numbness or tingling in extremities.", q_es: "Durante las ÚLTIMAS 2 SEMANAS: Entumecimiento u hormigueo en extremidades.",
    opts: [{ en: "Not at all", es: "Para nada", val: 0 }, { en: "Several days", es: "Varios días", val: 1 }, { en: "More than half the days", es: "Más de la mitad de los días", val: 2 }, { en: "Nearly every day", es: "Casi todos los días", val: 3 }]
  },
  {
    q_en: "Over the last 2 weeks: Feeling unexplainable hot or cold sweats.", q_es: "Durante las ÚLTIMAS 2 SEMANAS: Sentir sudores fríos o calientes inexplicables.",
    opts: [{ en: "Not at all", es: "Para nada", val: 0 }, { en: "Several days", es: "Varios días", val: 1 }, { en: "More than half the days", es: "Más de la mitad de los días", val: 2 }, { en: "Nearly every day", es: "Casi todos los días", val: 3 }]
  },
  {
    q_en: "Over the last 2 weeks: Wobbliness or weakness in legs.", q_es: "Durante las ÚLTIMAS 2 SEMANAS: Inestabilidad o debilidad en las piernas.",
    opts: [{ en: "Not at all", es: "Para nada", val: 0 }, { en: "Several days", es: "Varios días", val: 1 }, { en: "More than half the days", es: "Más de la mitad de los días", val: 2 }, { en: "Nearly every day", es: "Casi todos los días", val: 3 }]
  },
  {
    q_en: "Over the last 2 weeks: Fear of losing your mind or control.", q_es: "Durante las ÚLTIMAS 2 SEMANAS: Miedo a perder la razón o el control.",
    opts: [{ en: "Not at all", es: "Para nada", val: 0 }, { en: "Several days", es: "Varios días", val: 1 }, { en: "More than half the days", es: "Más de la mitad de los días", val: 2 }, { en: "Nearly every day", es: "Casi todos los días", val: 3 }]
  },
  {
    q_en: "Over the last 2 weeks: Difficulty catching your breath.", q_es: "Durante las ÚLTIMAS 2 SEMANAS: Dificultad para atrapar el aliento.",
    opts: [{ en: "Not at all", es: "Para nada", val: 0 }, { en: "Several days", es: "Varios días", val: 1 }, { en: "More than half the days", es: "Más de la mitad de los días", val: 2 }, { en: "Nearly every day", es: "Casi todos los días", val: 3 }]
  },
  {
    q_en: "Over the last 2 weeks: Sudden, intense fear of dying.", q_es: "Durante las ÚLTIMAS 2 SEMANAS: Miedo repentino e intenso a morir.",
    opts: [{ en: "Not at all", es: "Para nada", val: 0 }, { en: "Several days", es: "Varios días", val: 1 }, { en: "More than half the days", es: "Más de la mitad de los días", val: 2 }, { en: "Nearly every day", es: "Casi todos los días", val: 3 }]
  },
  {
    q_en: "Over the last 2 weeks: Feeling faint, dizzy, or lightheaded.", q_es: "Durante las ÚLTIMAS 2 SEMANAS: Sentir desmayo, mareo o vértigo.",
    opts: [{ en: "Not at all", es: "Para nada", val: 0 }, { en: "Several days", es: "Varios días", val: 1 }, { en: "More than half the days", es: "Más de la mitad de los días", val: 2 }, { en: "Nearly every day", es: "Casi todos los días", val: 3 }]
  },
  {
    q_en: "Over the last 2 weeks: Uncontrollable shakiness in hands.", q_es: "Durante las ÚLTIMAS 2 SEMANAS: Temblor incontrolable en las manos.",
    opts: [{ en: "Not at all", es: "Para nada", val: 0 }, { en: "Several days", es: "Varios días", val: 1 }, { en: "More than half the days", es: "Más de la mitad de los días", val: 2 }, { en: "Nearly every day", es: "Casi todos los días", val: 3 }]
  },
  {
    q_en: "Over the last 2 weeks: Feeling of choking or tightness in throat.", q_es: "Durante las ÚLTIMAS 2 SEMANAS: Sensación de ahogo o tensión en la garganta.",
    opts: [{ en: "Not at all", es: "Para nada", val: 0 }, { en: "Several days", es: "Varios días", val: 1 }, { en: "More than half the days", es: "Más de la mitad de los días", val: 2 }, { en: "Nearly every day", es: "Casi todos los días", val: 3 }]
  },
  {
    q_en: "Over the last 2 weeks: Catastrophizing or fear of the worst happening.", q_es: "Durante las ÚLTIMAS 2 SEMANAS: Catastrofizar o miedo a que ocurra lo peor.",
    opts: [{ en: "Not at all", es: "Para nada", val: 0 }, { en: "Several days", es: "Varios días", val: 1 }, { en: "More than half the days", es: "Más de la mitad de los días", val: 2 }, { en: "Nearly every day", es: "Casi todos los días", val: 3 }]
  },
  {
    q_en: "Over the last 2 weeks: Terrified or afraid for no logical reason.", q_es: "Durante las ÚLTIMAS 2 SEMANAS: Aterrorizado o asustado sin razón lógica.",
    opts: [{ en: "Not at all", es: "Para nada", val: 0 }, { en: "Several days", es: "Varios días", val: 1 }, { en: "More than half the days", es: "Más de la mitad de los días", val: 2 }, { en: "Nearly every day", es: "Casi todos los días", val: 3 }]
  },
  {
    q_en: "Over the last 2 weeks: Generalized nervousness that won't subside.", q_es: "Durante las ÚLTIMAS 2 SEMANAS: Nerviosismo generalizado que no cesa.",
    opts: [{ en: "Not at all", es: "Para nada", val: 0 }, { en: "Several days", es: "Varios días", val: 1 }, { en: "More than half the days", es: "Más de la mitad de los días", val: 2 }, { en: "Nearly every day", es: "Casi todos los días", val: 3 }]
  },
  {
    q_en: "Over the last 2 weeks: Indigestion, nausea, or discomfort in abdomen.", q_es: "Durante las ÚLTIMAS 2 SEMANAS: Indigestión, náuseas o malestar en el abdomen.",
    opts: [{ en: "Not at all", es: "Para nada", val: 0 }, { en: "Several days", es: "Varios días", val: 1 }, { en: "More than half the days", es: "Más de la mitad de los días", val: 2 }, { en: "Nearly every day", es: "Casi todos los días", val: 3 }]
  },
  {
    q_en: "Over the last 2 weeks: Face involuntarily flushed or burning.", q_es: "Durante las ÚLTIMAS 2 SEMANAS: Cara ruborizada o ardiendo involuntariamente.",
    opts: [{ en: "Not at all", es: "Para nada", val: 0 }, { en: "Several days", es: "Varios días", val: 1 }, { en: "More than half the days", es: "Más de la mitad de los días", val: 2 }, { en: "Nearly every day", es: "Casi todos los días", val: 3 }]
  },
  {
    q_en: "Over the last 2 weeks: Night sweats disrupting sleep.", q_es: "Durante las ÚLTIMAS 2 SEMANAS: Sudores nocturnos que interrumpen el sueño.",
    opts: [{ en: "Not at all", es: "Para nada", val: 0 }, { en: "Several days", es: "Varios días", val: 1 }, { en: "More than half the days", es: "Más de la mitad de los días", val: 2 }, { en: "Nearly every day", es: "Casi todos los días", val: 3 }]
  },
  {
    q_en: "Over the last 2 weeks: Difficulty concentrating on simple tasks.", q_es: "Durante las ÚLTIMAS 2 SEMANAS: Dificultad para concentrarse en tareas simples.",
    opts: [{ en: "Not at all", es: "Para nada", val: 0 }, { en: "Several days", es: "Varios días", val: 1 }, { en: "More than half the days", es: "Más de la mitad de los días", val: 2 }, { en: "Nearly every day", es: "Casi todos los días", val: 3 }]
  },
  {
    q_en: "Over the last 2 weeks: Mind going entirely blank under slight pressure.", q_es: "Durante las ÚLTIMAS 2 SEMANAS: Mente quedándose totalmente en blanco bajo leve presión.",
    opts: [{ en: "Not at all", es: "Para nada", val: 0 }, { en: "Several days", es: "Varios días", val: 1 }, { en: "More than half the days", es: "Más de la mitad de los días", val: 2 }, { en: "Nearly every day", es: "Casi todos los días", val: 3 }]
  },
];

export const MOOD_QUESTIONS = [
  // PHQ-9 + WHO-5 based: 2-week baseline requirement applied
  {
    q_en: "Over the last 2 weeks: Little interest or pleasure in doing things you usually enjoy.", q_es: "Durante las ÚLTIMAS 2 SEMANAS: Poco interés o placer en hacer las cosas que usualmente disfrutas.",
    opts: [{ en: "Not at all", es: "Para nada", val: 0 }, { en: "Several days", es: "Varios días", val: 1 }, { en: "More than half the days", es: "Más de la mitad de los días", val: 2 }, { en: "Nearly every day", es: "Casi todos los días", val: 3 }]
  },
  {
    q_en: "Over the last 2 weeks: Feeling down, depressed, or hopeless.", q_es: "Durante las ÚLTIMAS 2 SEMANAS: Sentirse desanimado/a, deprimido/a o sin esperanza.",
    opts: [{ en: "Not at all", es: "Para nada", val: 0 }, { en: "Several days", es: "Varios días", val: 1 }, { en: "More than half the days", es: "Más de la mitad de los días", val: 2 }, { en: "Nearly every day", es: "Casi todos los días", val: 3 }]
  },
  {
    q_en: "Over the last 2 weeks: Trouble falling/staying asleep, or sleeping entirely too much.", q_es: "Durante las ÚLTIMAS 2 SEMANAS: Dificultad para dormir o dormir en exceso.",
    opts: [{ en: "Not at all", es: "Para nada", val: 0 }, { en: "Several days", es: "Varios días", val: 1 }, { en: "More than half the days", es: "Más de la mitad de los días", val: 2 }, { en: "Nearly every day", es: "Casi todos los días", val: 3 }]
  },
  {
    q_en: "Over the last 2 weeks: Feeling exhausted or having inexplicably low energy.", q_es: "Durante las ÚLTIMAS 2 SEMANAS: Sentirse agotado/a o con energía inexplicablemente baja.",
    opts: [{ en: "Not at all", es: "Para nada", val: 0 }, { en: "Several days", es: "Varios días", val: 1 }, { en: "More than half the days", es: "Más de la mitad de los días", val: 2 }, { en: "Nearly every day", es: "Casi todos los días", val: 3 }]
  },
  {
    q_en: "Over the last 2 weeks: Poor appetite or resorting to overeating.", q_es: "Durante las ÚLTIMAS 2 SEMANAS: Falta de apetito o recurrir a comer en exceso.",
    opts: [{ en: "Not at all", es: "Para nada", val: 0 }, { en: "Several days", es: "Varios días", val: 1 }, { en: "More than half the days", es: "Más de la mitad de los días", val: 2 }, { en: "Nearly every day", es: "Casi todos los días", val: 3 }]
  },
  {
    q_en: "Over the last 2 weeks: Feeling bad about yourself, or that you have failed yourself/family.", q_es: "Durante las ÚLTIMAS 2 SEMANAS: Sentirse mal consigo mismo/a, o sentir que te has fallado a ti o a tu familia.",
    opts: [{ en: "Not at all", es: "Para nada", val: 0 }, { en: "Several days", es: "Varios días", val: 1 }, { en: "More than half the days", es: "Más de la mitad de los días", val: 2 }, { en: "Nearly every day", es: "Casi todos los días", val: 3 }]
  },
  {
    q_en: "Over the last 2 weeks: Trouble concentrating on things, like reading or working.", q_es: "Durante las ÚLTIMAS 2 SEMANAS: Dificultad para concentrarse en cosas como leer o trabajar.",
    opts: [{ en: "Not at all", es: "Para nada", val: 0 }, { en: "Several days", es: "Varios días", val: 1 }, { en: "More than half the days", es: "Más de la mitad de los días", val: 2 }, { en: "Nearly every day", es: "Casi todos los días", val: 3 }]
  },
  {
    q_en: "Over the last 2 weeks: Moving/speaking so slowly (or being so fidgety) that others notice.", q_es: "Durante las ÚLTIMAS 2 SEMANAS: Moverse/hablar tan despacio (o estar tan agitado) que otros lo notan.",
    opts: [{ en: "Not at all", es: "Para nada", val: 0 }, { en: "Several days", es: "Varios días", val: 1 }, { en: "More than half the days", es: "Más de la mitad de los días", val: 2 }, { en: "Nearly every day", es: "Casi todos los días", val: 3 }]
  },
  {
    q_en: "Over the last 2 weeks: Thoughts that you would be better off dead or hurting yourself.", q_es: "Durante las ÚLTIMAS 2 SEMANAS: Pensamientos de que estarías mejor muerto/a o lastimándote.",
    opts: [{ en: "Not at all", es: "Para nada", val: 0 }, { en: "Several days", es: "Varios días", val: 1 }, { en: "More than half the days", es: "Más de la mitad de los días", val: 2 }, { en: "Nearly every day", es: "Casi todos los días", val: 3 }]
  },
  {
    q_en: "Over the last 2 weeks: I have felt cheerful and in good spirits.", q_es: "Durante las ÚLTIMAS 2 SEMANAS: Me he sentido alegre y de buen humor.",
    opts: [{ en: "Never", es: "Nunca", val: 3 }, { en: "Rarely", es: "Raramente", val: 2 }, { en: "Sometimes", es: "A veces", val: 1 }, { en: "Often", es: "A menudo", val: 0 }]
  },
  {
    q_en: "Over the last 2 weeks: I have felt calm and relaxed.", q_es: "Durante las ÚLTIMAS 2 SEMANAS: Me he sentido calmado/a y relajado/a.",
    opts: [{ en: "Never", es: "Nunca", val: 3 }, { en: "Rarely", es: "Raramente", val: 2 }, { en: "Sometimes", es: "A veces", val: 1 }, { en: "Often", es: "A menudo", val: 0 }]
  },
  {
    q_en: "Over the last 2 weeks: I have felt active and vigorous.", q_es: "Durante las ÚLTIMAS 2 SEMANAS: Me he sentido activo/a y vigoroso/a.",
    opts: [{ en: "Never", es: "Nunca", val: 3 }, { en: "Rarely", es: "Raramente", val: 2 }, { en: "Sometimes", es: "A veces", val: 1 }, { en: "Often", es: "A menudo", val: 0 }]
  },
  {
    q_en: "Over the last 2 weeks: I woke up feeling fresh and rested.", q_es: "Durante las ÚLTIMAS 2 SEMANAS: Me desperté sintiéndome fresco/a y descansado/a.",
    opts: [{ en: "Never", es: "Nunca", val: 3 }, { en: "Rarely", es: "Raramente", val: 2 }, { en: "Sometimes", es: "A veces", val: 1 }, { en: "Often", es: "A menudo", val: 0 }]
  },
  {
    q_en: "Over the last 2 weeks: My daily life has been filled with things that interest me.", q_es: "Durante las ÚLTIMAS 2 SEMANAS: Mi vida diaria ha estado llena de cosas que me interesan.",
    opts: [{ en: "Never", es: "Nunca", val: 3 }, { en: "Rarely", es: "Raramente", val: 2 }, { en: "Sometimes", es: "A veces", val: 1 }, { en: "Often", es: "A menudo", val: 0 }]
  },
  {
    q_en: "Over the last 2 weeks: I felt I was dealing with problems well.", q_es: "Durante las ÚLTIMAS 2 SEMANAS: Sentí que estaba manejando bien mis problemas.",
    opts: [{ en: "Never", es: "Nunca", val: 3 }, { en: "Rarely", es: "Raramente", val: 2 }, { en: "Sometimes", es: "A veces", val: 1 }, { en: "Often", es: "A menudo", val: 0 }]
  },
  {
    q_en: "Over the last 2 weeks: I have been thinking clearly.", q_es: "Durante las ÚLTIMAS 2 SEMANAS: He estado pensando con claridad.",
    opts: [{ en: "Never", es: "Nunca", val: 3 }, { en: "Rarely", es: "Raramente", val: 2 }, { en: "Sometimes", es: "A veces", val: 1 }, { en: "Often", es: "A menudo", val: 0 }]
  },
  {
    q_en: "Over the last 2 weeks: I have felt good about myself.", q_es: "Durante las ÚLTIMAS 2 SEMANAS: Me he sentido bien conmigo mismo/a.",
    opts: [{ en: "Never", es: "Nunca", val: 3 }, { en: "Rarely", es: "Raramente", val: 2 }, { en: "Sometimes", es: "A veces", val: 1 }, { en: "Often", es: "A menudo", val: 0 }]
  },
  {
    q_en: "Over the last 2 weeks: I have felt close to other people.", q_es: "Durante las ÚLTIMAS 2 SEMANAS: Me he sentido cercano/a a otras personas.",
    opts: [{ en: "Never", es: "Nunca", val: 3 }, { en: "Rarely", es: "Raramente", val: 2 }, { en: "Sometimes", es: "A veces", val: 1 }, { en: "Often", es: "A menudo", val: 0 }]
  },
  {
    q_en: "Over the last 2 weeks: I have felt confident in my abilities.", q_es: "Durante las ÚLTIMAS 2 SEMANAS: Me he sentido seguro/a de mis habilidades.",
    opts: [{ en: "Never", es: "Nunca", val: 3 }, { en: "Rarely", es: "Raramente", val: 2 }, { en: "Sometimes", es: "A veces", val: 1 }, { en: "Often", es: "A menudo", val: 0 }]
  },
  {
    q_en: "Over the last 2 weeks: I felt able to make up my own mind about things.", q_es: "Durante las ÚLTIMAS 2 SEMANAS: Fui capaz de tomar mis propias decisiones sobre las cosas.",
    opts: [{ en: "Never", es: "Nunca", val: 3 }, { en: "Rarely", es: "Raramente", val: 2 }, { en: "Sometimes", es: "A veces", val: 1 }, { en: "Often", es: "A menudo", val: 0 }]
  },
  {
    q_en: "Over the last 2 weeks: I have felt loved and appreciated.", q_es: "Durante las ÚLTIMAS 2 SEMANAS: Me he sentido amado/a y apreciado/a.",
    opts: [{ en: "Never", es: "Nunca", val: 3 }, { en: "Rarely", es: "Raramente", val: 2 }, { en: "Sometimes", es: "A veces", val: 1 }, { en: "Often", es: "A menudo", val: 0 }]
  },
  {
    q_en: "Over the last 2 weeks: I have felt a sense of purpose.", q_es: "Durante las ÚLTIMAS 2 SEMANAS: He sentido un sentido de propósito.",
    opts: [{ en: "Never", es: "Nunca", val: 3 }, { en: "Rarely", es: "Raramente", val: 2 }, { en: "Sometimes", es: "A veces", val: 1 }, { en: "Often", es: "A menudo", val: 0 }]
  },
  {
    q_en: "Over the last 2 weeks: I have been feeling optimistic about the future.", q_es: "Durante las ÚLTIMAS 2 SEMANAS: Me he sentido optimista sobre el futuro.",
    opts: [{ en: "Never", es: "Nunca", val: 3 }, { en: "Rarely", es: "Raramente", val: 2 }, { en: "Sometimes", es: "A veces", val: 1 }, { en: "Often", es: "A menudo", val: 0 }]
  },
  {
    q_en: "Over the last 2 weeks: I have had something to look forward to.", q_es: "Durante las ÚLTIMAS 2 SEMANAS: He tenido algo que esperar con ilusión.",
    opts: [{ en: "Never", es: "Nunca", val: 3 }, { en: "Rarely", es: "Raramente", val: 2 }, { en: "Sometimes", es: "A veces", val: 1 }, { en: "Often", es: "A menudo", val: 0 }]
  },
  {
    q_en: "Over the last 2 weeks: I have felt at peace with myself.", q_es: "Durante las ÚLTIMAS 2 SEMANAS: Me he sentido en paz conmigo mismo/a.",
    opts: [{ en: "Never", es: "Nunca", val: 3 }, { en: "Rarely", es: "Raramente", val: 2 }, { en: "Sometimes", es: "A veces", val: 1 }, { en: "Often", es: "A menudo", val: 0 }]
  },
];

export const MBTI_QUESTIONS = [
  // E vs I (Energy & Attention)
  {
    q_en: "When you are completely exhausted from a long, stressful week, what genuinely recharges your battery?", q_es: "Cuando estás completamente exhausto por una semana larga y estresante, ¿qué recarga genuinamente tu batería?",
    opts: [{ en: "Being alone with zero social obligations or interruptions.", es: "Estar solo sin cero obligaciones sociales ni interrupciones.", val: 1, dim: 'I' }, { en: "Going out and doing something fun or engaging with people.", es: "Salir y hacer algo divertido o interactuar con personas.", val: 1, dim: 'E' }]
  },
  {
    q_en: "If your phone rings unexpectedly from an unknown number, your involuntary reaction is usually...", q_es: "Si tu teléfono suena inesperadamente de un número desconocido, tu reacción involuntaria suele ser...",
    opts: [{ en: "To ignore it and wait for a text or voicemail.", es: "Ignorarlo y esperar un mensaje de texto o de voz.", val: 1, dim: 'I' }, { en: "To answer it right away to see who it is.", es: "Contestar de inmediato para ver quién es.", val: 1, dim: 'E' }]
  },
  {
    q_en: "In a group setting where you don't know anyone, what is your historical track record?", q_es: "En un entorno grupal donde no conoces a nadie, ¿cuál es tu historial histórico?",
    opts: [{ en: "I wait for others to approach me or stick to the edges.", es: "Espero a que otros se me acerquen o me quedo en los bordes.", val: 1, dim: 'I' }, { en: "I take the initiative to introduce myself and break the ice.", es: "Tomo la iniciativa de presentarme y romper el hielo.", val: 1, dim: 'E' }]
  },
  {
    q_en: "When you have a complex problem to solve, do you process it better by...", q_es: "Cuando tienes un problema complejo que resolver, ¿lo procesas mejor al...",
    opts: [{ en: "Thinking it through silently in your own head first.", es: "Pensarlo en silencio en tu propia cabeza primero.", val: 1, dim: 'I' }, { en: "Talking it out loud with someone else to hear your own thoughts.", es: "Hablarlo en voz alta con alguien más para escuchar tus propios pensamientos.", val: 1, dim: 'E' }]
  },
  {
    q_en: "After a highly stimulating and noisy event, you typically feel...", q_es: "Después de un evento altamente estimulante y ruidoso, típicamente te sientes...",
    opts: [{ en: "Drained, needing a quiet sanctuary to recover.", es: "Agotado, necesitando un santuario tranquilo para recuperarte.", val: 1, dim: 'I' }, { en: "Energized, feeling like you could keep going.", es: "Lleno de energía, sintiendo que podrías seguir adelante.", val: 1, dim: 'E' }]
  },

  // S vs N (Information gathering)
  {
    q_en: "When assembling a new piece of furniture, your default instinct is to...", q_es: "Al armar un mueble nuevo, tu instinto por defecto es...",
    opts: [{ en: "Follow the instruction manual step-by-step.", es: "Seguir el manual de instrucciones paso a paso.", val: 1, dim: 'S' }, { en: "Look at the picture and figure it out as you go.", es: "Mirar la foto e ir descifrándolo sobre la marcha.", val: 1, dim: 'N' }]
  },
  {
    q_en: "If you have to describe an event, do you tend to...", q_es: "Si tienes que describir un evento, tiendes a...",
    opts: [{ en: "List the specific details, facts, and what actually happened.", es: "Listar los detalles específicos, hechos y lo que realmente pasó.", val: 1, dim: 'S' }, { en: "Summarize the overall theme, meaning, or 'vibe' of the event.", es: "Resumir el tema general, el significado o la 'vibra' del evento.", val: 1, dim: 'N' }]
  },
  {
    q_en: "When listening to someone explain a concept, you get frustrated if they...", q_es: "Al escuchar a alguien explicar un concepto, te frustras si ellos...",
    opts: [{ en: "Are too abstract and don't give concrete, real-world examples.", es: "Son demasiado abstractos y no dan ejemplos concretos del mundo real.", val: 1, dim: 'S' }, { en: "Get bogged down in specific details and miss the bigger picture.", es: "Se enredan en detalles específicos y pierden la visión general.", val: 1, dim: 'N' }]
  },
  {
    q_en: "You naturally trust...", q_es: "Naturalmente confías en...",
    opts: [{ en: "Past experience and proven methods.", es: "La experiencia pasada y los métodos probados.", val: 1, dim: 'S' }, { en: "Gut instinct and future possibilities.", es: "El instinto y las posibilidades futuras.", val: 1, dim: 'N' }]
  },
  {
    q_en: "When you read a book or watch a movie, you are mostly drawn to...", q_es: "Cuando lees un libro o ves una película, te atrae más...",
    opts: [{ en: "The vivid world-building, realistic actions, and facts.", es: "La construcción vívida del mundo, las acciones realistas y los hechos.", val: 1, dim: 'S' }, { en: "The hidden symbols, metaphors, and underlying meaning.", es: "Los símbolos ocultos, las metáforas y el significado subyacente.", val: 1, dim: 'N' }]
  },

  // T vs F (Decision Making)
  {
    q_en: "When a friend comes to you with a personal problem, your involuntary first response is to...", q_es: "Cuando un amigo acude a ti con un problema personal, tu primera respuesta involuntaria es...",
    opts: [{ en: "Offer practical solutions and fix the root cause.", es: "Ofrecer soluciones prácticas y arreglar la causa raíz.", val: 1, dim: 'T' }, { en: "Offer emotional support, validation, and comfort.", es: "Ofrecer apoyo emocional, validación y consuelo.", val: 1, dim: 'F' }]
  },
  {
    q_en: "In a heated argument, you consider it a worse offense to be...", q_es: "En una discusión acalorada, consideras que es una ofensa peor ser...",
    opts: [{ en: "Illogical, inconsistent, or factually incorrect.", es: "Ilógico, inconsistente o fácticamente incorrecto.", val: 1, dim: 'T' }, { en: "Cruel, dismissive, or emotionally hurtful.", es: "Cruel, despectivo o emocionalmente hiriente.", val: 1, dim: 'F' }]
  },
  {
    q_en: "When you have to make a tough decision at work, you primarily base it on...", q_es: "Cuando tienes que tomar una decisión difícil en el trabajo, te basas principalmente en...",
    opts: [{ en: "Objective metrics, fairness, and what makes the most logical sense.", es: "Métricas objetivas, justicia y lo que tiene más sentido lógico.", val: 1, dim: 'T' }, { en: "How it will impact the people involved and maintaining harmony.", es: "Cómo impactará a las personas involucradas y mantener la armonía.", val: 1, dim: 'F' }]
  },
  {
    q_en: "You are more likely to be accused by others of being...", q_es: "Es más probable que otros te acusen de ser...",
    opts: [{ en: "Too blunt, cold, or insensitive.", es: "Demasiado directo, frío o insensible.", val: 1, dim: 'T' }, { en: "Too sensitive, emotional, or taking things personally.", es: "Demasiado sensible, emocional o de tomar las cosas personales.", val: 1, dim: 'F' }]
  },
  {
    q_en: "If forced to choose a compliment, you would rather be called...", q_es: "Si te vieras obligado a elegir un cumplido, preferirías que te llamaran...",
    opts: [{ en: "Highly competent, sharp, and rational.", es: "Altamente competente, agudo y racional.", val: 1, dim: 'T' }, { en: "Highly empathetic, kind, and supportive.", es: "Altamente empático, amable y solidario.", val: 1, dim: 'F' }]
  },

  // J vs P (Lifestyle / Execution)
  {
    q_en: "When planning a trip, your habitual behavior is to...", q_es: "Al planear un viaje, tu comportamiento habitual es...",
    opts: [{ en: "Book accommodations and create a clear itinerary in advance.", es: "Reservar alojamiento y crear un itinerario claro con anticipación.", val: 1, dim: 'J' }, { en: "Leave things open-ended and decide what to do day-by-day.", es: "Dejar las cosas abiertas y decidir qué hacer día a día.", val: 1, dim: 'P' }]
  },
  {
    q_en: "Your physical workspace or computer desktop is typically...", q_es: "Tu espacio de trabajo físico o escritorio de la computadora es típicamente...",
    opts: [{ en: "Organized, categorized, and clear of clutter.", es: "Organizado, categorizado y libre de desorden.", val: 1, dim: 'J' }, { en: "A bit chaotic, but you know where everything is.", es: "Un poco caótico, pero sabes dónde está todo.", val: 1, dim: 'P' }]
  },
  {
    q_en: "When working on a deadline, your historical pattern is...", q_es: "Al trabajar con una fecha límite, tu patrón histórico es...",
    opts: [{ en: "To start early and finish ahead of time to avoid stress.", es: "Empezar temprano y terminar antes de tiempo para evitar estrés.", val: 1, dim: 'J' }, { en: "To rely on a burst of last-minute adrenaline to get it done.", es: "Depender de una racha de adrenalina de último minuto para terminar.", val: 1, dim: 'P' }]
  },
  {
    q_en: "You feel more anxiety when...", q_es: "Sientes mayor ansiedad cuando...",
    opts: [{ en: "Things are left undecided, vague, or up in the air.", es: "Las cosas se dejan sin decidir, vagas o en el aire.", val: 1, dim: 'J' }, { en: "You are locked into a strict commitment with no flexibility.", es: "Estás atrapado en un compromiso estricto sin flexibilidad.", val: 1, dim: 'P' }]
  },
  {
    q_en: "In your day-to-day life, you prefer...", q_es: "En tu vida diaria, prefieres...",
    opts: [{ en: "Routine, structure, and knowing what to expect.", es: "Rutina, estructura y saber qué esperar.", val: 1, dim: 'J' }, { en: "Spontaneity, variety, and keeping your options open.", es: "Espontaneidad, variedad y mantener tus opciones abiertas.", val: 1, dim: 'P' }]
  }
];

export const PsyTestModal: React.FC<PsyTestModalProps> = ({
  visible, onClose, lang, colors, psyProfile,
  psyStep, setPsyStep, psyAnswers, setPsyAnswers, activeTest, scoreTest,
  savedResults, onRetake, onAiDescription,
}) => {
  const [localResults, setLocalResults] = useState<any>(null);
  const initializedRef = useRef(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  useEffect(() => {
    if (!initializedRef.current && savedResults && savedResults.type === activeTest) {
      setLocalResults(savedResults);
      setPsyStep(getQuestions().length);
      initializedRef.current = true;
    }
  }, [savedResults, activeTest]);

  const handleRetake = () => {
    setLocalResults(null);
    setPsyStep(0);
    setPsyAnswers([]);
    initializedRef.current = false;
    onRetake?.();
  };

  const buildAiPrompt = () => {
    if (!localResults) return '';
    const r = localResults;
    switch (r.type) {
      case 'ocean': {
        const scores = r.scores as Record<string, number>;
        const dims = Object.entries(scores)
          .filter(([k]) => ['O', 'C', 'E', 'A', 'N', 'D', 'L'].includes(k))
          .map(([k, v]) => `${k}: ${Math.round(v * 100)}%`)
          .join(', ');
        return lang === 'es'
          ? `Analiza este perfil psicométrico OCEAN+ y describe la personalidad en 2-3 párrafos, destacando fortalezas, debilidades, entornos ideales y consejo de crecimiento. Resultados: ${dims}.`
          : `Analyze this OCEAN+ psychometric profile and describe the personality in 2-3 paragraphs, highlighting strengths, weaknesses, ideal environments and growth advice. Results: ${dims}.`;
      }
      case 'mbti': {
        const type = r.mbtiType || 'UNKNOWN';
        return lang === 'es'
          ? `Analiza el tipo de personalidad MBTI ${type} y describe en 2-3 párrafos sus fortalezas, debilidades, estilo de comunicación, entornos ideales y consejo de crecimiento.`
          : `Analyze MBTI personality type ${type} and describe in 2-3 paragraphs its strengths, weaknesses, communication style, ideal environments and growth advice.`;
      }
      case 'aptitude': {
        const pct = Math.round(r.score * 100);
        return lang === 'es'
          ? `Analiza este resultado de test de aptitudes (${pct}%) y describe en 2-3 párrafos las fortalezas cognitivas, áreas a mejorar, carreras ideales y consejos de estudio.`
          : `Analyze this aptitude test result (${pct}%) and describe in 2-3 paragraphs cognitive strengths, areas to improve, ideal careers and study advice.`;
      }
      case 'vocational': {
        const top = (r.topTypes as string[] || []).join(', ');
        return lang === 'es'
          ? `Analiza este código Holland/RIASEC (${top}) y describe en 2-3 párrafos las fortalezas vocacionales, entornos de trabajo ideales, trayectorias sugeridas y consejo de desarrollo profesional.`
          : `Analyze this Holland/RIASEC code (${top}) and describe in 2-3 paragraphs vocational strengths, ideal work environments, suggested trajectories and professional development advice.`;
      }
      case 'anxiety': {
        const level = r.level || 'unknown';
        const pct = Math.round(r.score * 100);
        return lang === 'es'
          ? `Analiza este resultado de balance emocional (nivel: ${level}, ${pct}%) y describe en 2-3 párrafos qué indica, recomendaciones prácticas y cuándo buscar ayuda profesional.`
          : `Analyze this emotional balance result (level: ${level}, ${pct}%) and describe in 2-3 paragraphs what it indicates, practical recommendations and when to seek professional help.`;
      }
      case 'mood': {
        const pct = Math.round(r.score * 100);
        return lang === 'es'
          ? `Analiza este resultado de bienestar emocional (${pct}%) y describe en 2-3 párrafos el estado actual, factores que lo afectan y pasos concretos para mejorarlo.`
          : `Analyze this emotional well-being result (${pct}%) and describe in 2-3 paragraphs the current state, factors affecting it and concrete steps to improve it.`;
      }
      default:
        return '';
    }
  };

  const handleAiDescription = async () => {
    if (!onAiDescription || isAiLoading) return;
    const prompt = buildAiPrompt();
    if (!prompt) return;
    setIsAiLoading(true);
    setAiError(null);
    try {
      await onAiDescription(prompt);
    } catch (e) {
      setAiError(lang === 'es'
        ? 'No se pudo generar la descripción. Asegúrate de que la IA esté cargada y en modo Profundo o Creativo.'
        : 'Could not generate description. Make sure the AI is loaded and in Deep or Creative mode.');
    } finally {
      setIsAiLoading(false);
    }
  };

  const getQuestions = () => {
    switch (activeTest) {
      case 'aptitude': return APTITUDE_QUESTIONS;
      case 'vocational': return VOCATIONAL_QUESTIONS;
      case 'anxiety': return ANXIETY_QUESTIONS;
      case 'mood': return MOOD_QUESTIONS;
      case 'mbti': return MBTI_QUESTIONS;
      default: return PSY_QUESTIONS;
    }
  };
  const questions = getQuestions();
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
          .filter(([k]) => ['O', 'C', 'E', 'A', 'N', 'D', 'L'].includes(k))
          .map(([key, val]) => {
            const m = OCEAN_META[key];
            return `<tr><td style="padding:8px;font-weight:bold;">${m?.emoji} ${lang === 'es' ? m?.label_es : m?.label_en} (${key})</td>
              <td style="padding:8px;"><div style="background:#e5e7eb;border-radius:6px;height:14px;overflow:hidden;">
              <div style="width:${Math.round(val * 100)}%;height:14px;background:${m?.color};border-radius:6px;"></div></div></td>
              <td style="padding:8px;font-weight:bold;color:${m?.color};">${Math.round(val * 100)}%</td></tr>`;
          }).join('');
        html = `<html><head><style>body{font-family:sans-serif;padding:32px;color:#222;}h1{color:#7c3aed;}table{width:100%;border-collapse:collapse;}</style></head>
          <body><h1>🧠 ${lang === 'es' ? 'Perfil OCEAN+' : 'OCEAN+ Profile'}</h1>
          <p>${lang === 'es' ? 'Fecha' : 'Date'}: ${new Date().toLocaleDateString()}</p>
          <table>${rows}</table></body></html>`;

      } else if (localResults.type === 'mbti') {
        const arch = MBTI_ARCHETYPES[localResults.mbtiType] || {};
        html = `<html><head><style>body{font-family:sans-serif;padding:32px;}.badge{font-size:52px;font-weight:900;letter-spacing:8px;color:#fff;background:#ec4899;padding:16px 32px;border-radius:12px;display:inline-block;}</style></head>
          <body><h1>🎭 ${lang === 'es' ? 'Perfil MBTI (16r)' : 'MBTI (16r) Profile'}</h1>
          <p>${lang === 'es' ? 'Fecha' : 'Date'}: ${new Date().toLocaleDateString()}</p>
          <div class="badge">${localResults.mbtiType}</div>
          <h2>${(arch as any).emoji || ''} ${lang === 'es' ? (arch as any).es || '' : (arch as any).en || ''}</h2>
          <p>${lang === 'es' ? (arch as any).desc_es || '' : (arch as any).desc_en || ''}</p></body></html>`;

      } else if (localResults.type === 'aptitude') {
        html = `<html><head><style>body{font-family:sans-serif;padding:32px;}.score{font-size:72px;font-weight:900;color:#3b82f6;}</style></head>
          <body><h1>💡 ${lang === 'es' ? 'Reporte de Aptitudes' : 'Aptitude Report'}</h1>
          <p>${lang === 'es' ? 'Fecha' : 'Date'}: ${new Date().toLocaleDateString()}</p>
          <div class="score">${Math.round(localResults.score * 100)}%</div>
          <p>${lang === 'es' ? 'Razonamiento lógico, numérico, verbal y espacial.' : 'Logical, numerical, verbal and spatial reasoning.'}</p></body></html>`;

      } else if (localResults.type === 'vocational') {
        const topLabels = (localResults.topTypes as string[]).map((t, idx) => {
          const h = HOLLAND_LABELS[t];
          return `<li style="margin:10px 0;${idx === 0 ? 'font-size:18px;' : 'font-size:15px;'}">${h?.emoji} <strong>${lang === 'es' ? h?.es : h?.en}</strong>${idx === 0 ? ` <span style="background:#f59e0b;color:#000;padding:2px 8px;border-radius:4px;font-size:11px;">${lang === 'es' ? 'DOMINANTE' : 'DOMINANT'}</span>` : ''}
            <br><small style="color:#666;">${lang === 'es' ? h?.careers_es : h?.careers_en}</small></li>`;
        }).join('');
        html = `<html><head><style>body{font-family:sans-serif;padding:32px;}</style></head>
          <body><h1>🎯 ${lang === 'es' ? 'Reporte Vocacional (Holland)' : 'Vocational Report (Holland)'}</h1>
          <p>${lang === 'es' ? 'Fecha' : 'Date'}: ${new Date().toLocaleDateString()}</p>
          <ul>${topLabels}</ul></body></html>`;

      } else {
        const pct = Math.round(localResults.score * 100);
        const isAnxiety = localResults.type === 'anxiety';
        const levelMap: Record<string, { en: string; es: string }> = {
          minimal: { en: 'Minimal', es: 'Mínimo' }, mild: { en: 'Mild', es: 'Leve' },
          moderate: { en: 'Moderate', es: 'Moderado' }, severe: { en: 'Severe', es: 'Severo' },
        };
        const levelLabel = localResults.level ? (lang === 'es' ? levelMap[localResults.level]?.es : levelMap[localResults.level]?.en) || '' : '';
        html = `<html><head><style>body{font-family:sans-serif;padding:32px;}.score{font-size:72px;font-weight:900;color:#10b981;}</style></head>
          <body><h1>${isAnxiety ? '🌊' : '🌿'} ${lang === 'es' ? (isAnxiety ? 'Balance Emocional' : 'Bienestar Emocional') : (isAnxiety ? 'Emotional Balance' : 'Emotional Well-being')}</h1>
          <p>${lang === 'es' ? 'Fecha' : 'Date'}: ${new Date().toLocaleDateString()}</p>
          <div class="score">${pct}%</div>
          ${levelLabel ? `<p><strong>${lang === 'es' ? 'Nivel' : 'Level'}:</strong> ${levelLabel}</p>` : ''}
          </body></html>`;
      }

      const Print = await import('expo-print');
      const Sharing = await import('expo-sharing');
      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri);
    } catch (e) { console.error('[PDF_RESULTS]', e); }
  };

  // ── Results screen renderer ─────────────────────────────────────────────────
  const renderResults = () => {
    if (!localResults) return null;
    const accentColor = activeTest === 'ocean' ? '#a855f7' : activeTest === 'aptitude' ? '#3b82f6' :
      activeTest === 'vocational' ? '#f59e0b' : activeTest === 'mbti' ? '#ec4899' :
        activeTest === 'anxiety' ? '#06b6d4' : '#10b981';

    return (
      <>
        {/* ── Header ── */}
        <View style={{ alignItems: 'center', paddingTop: 4, paddingBottom: 8 }}>
          <Text style={{ fontSize: 38, marginBottom: 2 }}>✨</Text>
          <Text style={{ color: accentColor, fontSize: 19, fontWeight: 'bold', textAlign: 'center' }}>
            Ψ {lang === 'es' ? 'Análisis Completado' : 'Analysis Complete'}
          </Text>
          <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 3, textAlign: 'center' }}>
            {lang === 'es' ? 'Resultados guardados en tu perfil.' : 'Results saved to your profile.'}
          </Text>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} bounces={false} overScrollMode="never"
          style={{ flex: 1, marginTop: 10 }} contentContainerStyle={{ paddingBottom: 8 }}>

          {/* ══ OCEAN ══ */}
          {localResults.type === 'ocean' && (
            <View style={{ backgroundColor: colors.surfaceSecondary, borderRadius: 16, padding: 18 }}>
              <Text style={{ color: colors.textPrimary, fontWeight: 'bold', fontSize: 16, marginBottom: 16, textAlign: 'center' }}>
                🧠 {lang === 'es' ? 'Perfil OCEAN+' : 'OCEAN+ Profile'}
              </Text>
              {Object.entries(localResults.scores as Record<string, number>).map(([key, val], i) => {
                const meta = OCEAN_META[key]; if (!meta) return null;
                return (
                  <View key={key} style={{ marginBottom: 14 }}>
                    <AnimatedBar label={lang === 'es' ? meta.label_es : meta.label_en}
                      emoji={meta.emoji} value={val} color={meta.color} colors={colors} delay={i * 70} />
                    <Text style={{ color: colors.textSecondary, fontSize: 11, textAlign: 'center', marginTop: 3, lineHeight: 15 }}>
                      {lang === 'es' ? meta.desc_es : meta.desc_en}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}

          {/* ══ MBTI ══ */}
          {localResults.type === 'mbti' && (() => {
            const arch = MBTI_ARCHETYPES[localResults.mbtiType] ||
              { emoji: '🎭', en: localResults.mbtiType, es: localResults.mbtiType, desc_en: '', desc_es: '' };
            return (
              <View style={{ alignItems: 'center' }}>
                <View style={{
                  backgroundColor: '#12002a', borderRadius: 20, padding: 24, marginBottom: 12,
                  alignItems: 'center', width: '100%', borderWidth: 1, borderColor: '#ec4899'
                }}>
                  <Text style={{ fontSize: 36, marginBottom: 6 }}>{arch.emoji}</Text>
                  <View style={{
                    backgroundColor: '#ec4899', paddingHorizontal: 24, paddingVertical: 10,
                    borderRadius: 12, marginBottom: 14,
                    shadowColor: '#ec4899', shadowOpacity: 0.5, shadowRadius: 10, elevation: 8
                  }}>
                    <Text style={{ color: '#fff', fontSize: 36, fontWeight: '900', letterSpacing: 6 }}>
                      {localResults.mbtiType}
                    </Text>
                  </View>
                  <Text style={{ color: '#fff', fontSize: 17, fontWeight: 'bold', marginBottom: 6 }}>
                    {lang === 'es' ? arch.es : arch.en}
                  </Text>
                  <Text style={{ color: '#bbb', fontSize: 13, textAlign: 'center', lineHeight: 20 }}>
                    {lang === 'es' ? arch.desc_es : arch.desc_en}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
                  {['E/I', 'S/N', 'T/F', 'J/P'].map(pair => {
                    const [a, b] = pair.split('/');
                    const letter = localResults.mbtiType?.includes(a) ? a : b;
                    return (
                      <View key={pair} style={{
                        backgroundColor: colors.surfaceSecondary, borderRadius: 10,
                        paddingHorizontal: 14, paddingVertical: 10, alignItems: 'center',
                        borderWidth: 1, borderColor: '#ec4899'
                      }}>
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
            const lv = pct >= 85 ? { label_en: 'Exceptional', label_es: 'Excepcional', emoji: '🏆', color: '#f59e0b', desc_en: 'Outstanding reasoning across logic, math, verbal and spatial domains. You process complex patterns rapidly and solve abstract problems with ease. Careers in STEM, law, data science or strategic planning align with your analytical strengths.', desc_es: 'Razonamiento excepcional en lógica, matemáticas, verbal y espacial. Procesas patrones complejos rápidamente y resuelves problemas abstractos con facilidad. Carreras en STEM, derecho, ciencia de datos o planificación estratégica se alinean con tus fortalezas analíticas.' }
              : pct >= 70 ? { label_en: 'Advanced', label_es: 'Avanzado', emoji: '🌟', color: '#3b82f6', desc_en: 'Strong reasoning abilities across multiple domains. You grasp new concepts efficiently and think critically under pressure. Continued practice will further sharpen your analytical edge for advanced roles.', desc_es: 'Fuertes habilidades de razonamiento en múltiples dominios. Captas conceptos nuevos eficientemente y piensas críticamente bajo presión. La práctica continuada afilará aún más tu edge analítico.' }
                : pct >= 55 ? { label_en: 'Solid', label_es: 'Sólido', emoji: '💪', color: '#10b981', desc_en: 'Reliable foundational reasoning skills. You understand logical structures and solve most standard problems with moderate effort. Targeted practice in pattern recognition and verbal reasoning will strengthen your analytical toolkit over time.', desc_es: 'Habilidades de razonamiento fundamentales fiables. Entiendes estructuras lógicas y resuelves la mayoría de problemas estándar con esfuerzo moderado. La práctica dirigida fortalecerá tu toolkit analítico con el tiempo.' }
                  : { label_en: 'Developing', label_es: 'En Desarrollo', emoji: '📈', color: '#f97316', desc_en: 'Your reasoning skills are still forming. Focus on breaking problems into smaller steps, practicing logic puzzles, and reading analytically. Growth comes from consistent mental exercise and patience with yourself.', desc_es: 'Tus habilidades de razonamiento aún se están formando. Concéntrate en descomponer problemas en pasos pequeños, practicar rompecabezas lógicos y leer analíticamente. El crecimiento viene del ejercicio mental constante y la paciencia.' };
            return (
              <View style={{ backgroundColor: colors.surfaceSecondary, borderRadius: 16, padding: 18, alignItems: 'center' }}>
                <Text style={{ fontSize: 36, marginBottom: 4 }}>{lv.emoji}</Text>
                <GaugeIndicator score={localResults.score} color={lv.color}
                  label={lang === 'es' ? lv.label_es : lv.label_en} colors={colors} />
                <Text style={{ color: colors.textSecondary, fontSize: 13, textAlign: 'center', marginTop: 4, lineHeight: 18 }}>
                  {lang === 'es' ? 'Razonamiento lógico, numérico, verbal y espacial.' : 'Logical, numerical, verbal and spatial reasoning.'}
                </Text>
                <Text style={{ color: colors.textSecondary, fontSize: 12, textAlign: 'center', marginTop: 8, lineHeight: 17 }}>
                  {lang === 'es' ? lv.desc_es : lv.desc_en}
                </Text>
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 14, flexWrap: 'wrap', justifyContent: 'center' }}>
                  {[{ l: lang === 'es' ? 'Lógica' : 'Logic', e: '🔗' }, { l: lang === 'es' ? 'Numérica' : 'Numerical', e: '🔢' },
                  { l: lang === 'es' ? 'Verbal' : 'Verbal', e: '💬' }, { l: lang === 'es' ? 'Espacial' : 'Spatial', e: '🧩' }].map(s => (
                    <View key={s.l} style={{
                      backgroundColor: colors.surface, borderRadius: 10,
                      paddingHorizontal: 12, paddingVertical: 8, alignItems: 'center',
                      borderWidth: 1, borderColor: '#3b82f6'
                    }}>
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
                  🎯 {lang === 'es' ? 'Tu Código Holland (RIASEC)' : 'Your Holland Code (RIASEC)'}
                </Text>
                {topTypes.map((t, idx) => {
                  const h = HOLLAND_LABELS[t]; if (!h) return null;
                  const highlight = idx === 0;
                  return (
                    <View key={t} style={{
                      backgroundColor: highlight ? colors.surface : 'transparent',
                      borderRadius: 12, padding: 14, marginBottom: 10,
                      borderWidth: highlight ? 1.5 : 1, borderColor: highlight ? '#f59e0b' : colors.border
                    }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <Text style={{ fontSize: 26 }}>{h.emoji}</Text>
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            <Text style={{ color: highlight ? '#f59e0b' : colors.textPrimary, fontWeight: 'bold', fontSize: 15 }}>
                              {lang === 'es' ? h.es : h.en}
                            </Text>
                            {highlight && (
                              <View style={{ backgroundColor: '#f59e0b', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 }}>
                                <Text style={{ color: '#000', fontSize: 10, fontWeight: 'bold' }}>
                                  {lang === 'es' ? 'DOMINANTE' : 'DOMINANT'}
                                </Text>
                              </View>
                            )}
                          </View>
                          <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 3 }}>
                            📌 {lang === 'es' ? h.careers_es : h.careers_en}
                          </Text>
                          <Text style={{ color: colors.textSecondary, fontSize: 11, marginTop: 4, lineHeight: 15 }}>
                            {lang === 'es' ? h.desc_es : h.desc_en}
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
            const levelData: Record<string, { en: string; es: string; emoji: string; color: string; adv_en: string; adv_es: string }> = {
              minimal: { en: 'Minimal', es: 'Mínimo', emoji: '🌿', color: '#10b981', adv_en: 'Very low anxiety. Keep up healthy habits! You handle stress with resilience and emotional balance. Continue exercising, sleeping well, and nurturing social connections to maintain this positive state. Periodic self-check-ins help you catch early warning signs before they grow.', adv_es: 'Ansiedad muy baja. ¡Mantén tus hábitos saludables! Manejas el estrés con resiliencia y equilibrio emocional. Continúa ejercitándote, durmiendo bien y nutriendo conexiones sociales para mantener este estado positivo.' },
              mild: { en: 'Mild', es: 'Leve', emoji: '😌', color: '#3b82f6', adv_en: 'Mild signs detected. Mindfulness meditation, regular physical activity, and consistent sleep can significantly reduce these symptoms. Talking to trusted friends or journaling may help you process worries before they escalate. Consider setting aside 10 minutes daily for worry-time containment.', adv_es: 'Señales leves detectadas. La meditación mindfulness, la actividad física regular y el sueño consistente pueden reducir estos síntomas significativamente. Hablar con amigos de confianza o escribir un diario puede ayudarte a procesar preocupaciones antes de que escalen.' },
              moderate: { en: 'Moderate', es: 'Moderado', emoji: '🌊', color: '#f59e0b', adv_en: 'Noticeable anxiety is affecting your daily life. You may experience physical tension, racing thoughts, or avoidance behaviors. Professional support from a therapist or counselor can provide effective tools like CBT or structured breathing techniques. Regular exercise, sleep hygiene, and limiting caffeine are evidence-based strategies to implement now.', adv_es: 'Ansiedad notable está afectando tu vida diaria. Puedes experimentar tensión física, pensamientos acelerados o conductas de evitación. El apoyo profesional de un terapeuta puede proporcionar herramientas efectivas como TCC o técnicas de respiración estructuradas.' },
              severe: { en: 'Severe', es: 'Severo', emoji: '⚠️', color: '#ef4444', adv_en: 'High anxiety is significantly impairing your functioning. Please reach out to a mental health professional promptly. Therapy, medication, or support groups can make a profound difference. You do not have to manage this alone. Crisis lines and trusted confidants are available. Your well-being is the absolute priority right now.', adv_es: 'Alta ansiedad está perjudicando significativamente tu funcionamiento. Por favor contacta a un profesional de salud mental de inmediato. La terapia, medicación o grupos de apoyo pueden marcar una diferencia profunda. No tienes que manejar esto solo/a.' },
            };
            const lv = levelData[localResults.level] || levelData.minimal;
            return (
              <View style={{ backgroundColor: colors.surfaceSecondary, borderRadius: 16, padding: 18, alignItems: 'center' }}>
                <Text style={{ fontSize: 36, marginBottom: 2 }}>{lv.emoji}</Text>
                <Text style={{ color: lv.color, fontSize: 20, fontWeight: 'bold', marginBottom: 2 }}>
                  {lang === 'es' ? lv.es : lv.en}
                </Text>
                <GaugeIndicator score={localResults.score} color={lv.color}
                  label={lang === 'es' ? 'Balance Emocional' : 'Emotional Balance'} colors={colors} />
                <View style={{
                  backgroundColor: colors.surface, borderRadius: 12, padding: 14,
                  borderWidth: 1, borderColor: lv.color, marginTop: 4
                }}>
                  <Text style={{ color: colors.textSecondary, fontSize: 13, textAlign: 'center', lineHeight: 20 }}>
                    {lang === 'es' ? lv.adv_es : lv.adv_en}
                  </Text>
                </View>
              </View>
            );
          })()}

          {/* ══ Mood (Bienestar) ══ */}
          {localResults.type === 'mood' && (() => {
            const pct = Math.round(localResults.score * 100);
            const moodColor = pct >= 75 ? '#10b981' : pct >= 50 ? '#3b82f6' : pct >= 30 ? '#f59e0b' : '#ef4444';
            const moodLabel = pct >= 75 ? { en: 'Flourishing', es: 'Floreciendo', emoji: '🌸', desc_en: 'You are experiencing high psychological well-being. You feel engaged, optimistic, and socially connected. Leverage this positive state toward meaningful goals, strengthen relationships, and practice gratitude. Maintain healthy routines and notice what sustains this flourishing state so you can return to it during harder times.', desc_es: 'Estás experimentando alto bienestar psicológico. Te sientes comprometido, optimista y socialmente conectado. Aprovecha este estado positivo hacia metas significativas, fortalece relaciones y practica la gratitud.' }
              : pct >= 50 ? { en: 'Balanced', es: 'Equilibrado', emoji: '🌿', desc_en: 'Your mood is generally stable with occasional fluctuations. You function well in most areas but have room for growth. Regular exercise, social interaction, and creative outlets can lift your baseline. Tracking small daily wins and gratitude moments may help build momentum toward greater well-being.', desc_es: 'Tu ánimo es generalmente estable con fluctuaciones ocasionales. Funcionas bien en la mayoría de áreas pero tienes espacio para crecer. El ejercicio regular, interacción social y salidas creativas pueden elevar tu base.' }
                : pct >= 30 ? { en: 'Struggling', es: 'Con Dificultades', emoji: '🌦️', desc_en: 'You are facing some emotional challenges. Low motivation, social withdrawal, or negative thoughts may be present. Small actionable steps like a short walk, consistent sleep schedule, or reaching out to one trusted person can create positive ripple effects. Be patient with yourself — recovery is incremental and every small step counts.', desc_es: 'Estás enfrentando algunos retos emocionales. Pueden estar presentes baja motivación, aislamiento social o pensamientos negativos. Pequeños pasos como una caminata corta, horario de sueño consistente o contactar a una persona de confianza pueden crear efectos positivos.' }
                  : { en: 'Needs Attention', es: 'Necesita Atención', emoji: '🆘', desc_en: 'Your well-being score suggests significant distress. Low energy, persistent sadness, or hopelessness may be present. Please consider speaking with a mental health professional. Even small acts of self-care — hydration, fresh air, or a brief call to someone you trust — can be starting points. You deserve support and things can improve with the right help.', desc_es: 'Tu puntaje de bienestar sugiere malestar significativo. Pueden estar presentes baja energía, tristeza persistente o desesperanza. Por favor considera hablar con un profesional de salud mental. Incluso pequeños actos de autocuidado pueden ser puntos de partida.' };
            return (
              <View style={{ backgroundColor: colors.surfaceSecondary, borderRadius: 16, padding: 18, alignItems: 'center' }}>
                <Text style={{ fontSize: 36, marginBottom: 2 }}>{moodLabel.emoji}</Text>
                <Text style={{ color: moodColor, fontSize: 20, fontWeight: 'bold', marginBottom: 2 }}>
                  {lang === 'es' ? moodLabel.es : moodLabel.en}
                </Text>
                <GaugeIndicator score={localResults.score} color={moodColor}
                  label={lang === 'es' ? 'Bienestar Emocional' : 'Emotional Well-being'} colors={colors} />
                <Text style={{ color: colors.textSecondary, fontSize: 12, textAlign: 'center', marginTop: 8, lineHeight: 17 }}>
                  {lang === 'es' ? moodLabel.desc_es : moodLabel.desc_en}
                </Text>
                <View style={{ flexDirection: 'row', gap: 10, justifyContent: 'center', marginTop: 8 }}>
                  {['😔', '😐', '🙂', '😊', '🌟'].map((e, i) => {
                    const active = Math.min(4, Math.round(pct / 25)) === i;
                    return (
                      <Text key={i} style={{
                        fontSize: 26, opacity: active ? 1 : 0.3,
                        transform: [{ scale: active ? 1.3 : 1 }]
                      }}>{e}</Text>
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
            style={{
              backgroundColor: '#0d2b1a', borderRadius: 12, padding: 14,
              alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8,
              borderWidth: 1, borderColor: '#10b981'
            }}
            onPress={handleExportResults}
          >
            <Text style={{ fontSize: 18 }}>📄</Text>
            <Text style={{ color: '#10b981', fontWeight: 'bold', fontSize: 14 }}>
              {lang === 'es' ? 'EXPORTAR RESULTADOS (PDF)' : 'EXPORT RESULTS (PDF)'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={{
              backgroundColor: colors.surfaceSecondary, borderRadius: 12, padding: 14,
              alignItems: 'center', borderWidth: 1, borderColor: '#6366f1'
            }}
            onPress={handleAiDescription}
            disabled={isAiLoading}
          >
            <Text style={{ color: '#6366f1', fontWeight: 'bold', fontSize: 14 }}>
              {isAiLoading
                ? (lang === 'es' ? '⏳ Generando descripción...' : '⏳ Generating description...')
                : (lang === 'es' ? '🤖  DESCRIPCIÓN POR IA' : '🤖  AI DESCRIPTION')}
            </Text>
          </TouchableOpacity>
          {aiError && (
            <Text style={{ color: '#ef4444', fontSize: 11, textAlign: 'center', marginTop: 2 }}>
              {aiError}
            </Text>
          )}
          <Text style={{ color: colors.textSecondary, fontSize: 10, textAlign: 'center', marginTop: 2, lineHeight: 14 }}>
            {lang === 'es'
              ? 'Ver que te dice la IA puede ser tardado, aun asi se recomienda que este en el modo Profundo o Creativo para que te de mejor respuesta. Puedes volver aqui y presionar el boton.'
              : 'Seeing what the AI tells you can take a while, even so it is recommended to be in Deep or Creative mode for a better response. You can return here and press the button.'}
          </Text>

          <TouchableOpacity
            style={{
              backgroundColor: '#3b1c1c', borderRadius: 12, padding: 14,
              alignItems: 'center', borderWidth: 1, borderColor: '#ef4444'
            }}
            onPress={handleRetake}
          >
            <Text style={{ color: '#ef4444', fontWeight: 'bold', fontSize: 14 }}>
              {lang === 'es' ? '🔄  TOMA DE NUEVO EL TEST' : '🔄  RETAKE THE TEST'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={{
              backgroundColor: colors.surfaceSecondary, borderRadius: 12, padding: 14,
              alignItems: 'center', borderWidth: 1, borderColor: colors.border
            }}
            onPress={onClose}
          >
            <Text style={{ color: colors.textPrimary, fontWeight: 'bold', fontSize: 14 }}>
              {lang === 'es' ? '✓  CERRAR' : '✓  CLOSE'}
            </Text>
          </TouchableOpacity>
        </View>
      </>
    );
  };

  // ── Question screen ─────────────────────────────────────────────────────────
  const testTitle: Record<TestType, string> = {
    ocean: lang === 'es' ? 'Test OCEAN+' : 'OCEAN+ Test',
    aptitude: lang === 'es' ? 'Test de Aptitudes' : 'Aptitude Test',
    vocational: lang === 'es' ? 'Test Vocacional' : 'Vocational Test',
    anxiety: lang === 'es' ? 'Test de Balance Emocional' : 'Emotional Balance Test',
    mood: lang === 'es' ? 'Test de Bienestar' : 'Well-being Test',
    mbti: lang === 'es' ? 'Test de Personalidad 16 tipos' : 'Personality 16 types Test',
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
                  <View style={{
                    backgroundColor: colors.primary, height: 4, borderRadius: 2,
                    width: `${((psyStep + 1) / totalQuestions) * 100}%`
                  }} />
                </View>

                <ScrollView showsVerticalScrollIndicator={false} bounces={false} overScrollMode="never"
                  style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 20 }}>
                  <Text style={{
                    color: colors.textPrimary, fontSize: 18, fontWeight: 'bold',
                    marginBottom: 25, textAlign: 'center', lineHeight: 26
                  }}>
                    {lang === 'es' ? questions[psyStep].q_es : questions[psyStep].q_en}
                  </Text>
                  {questions[psyStep].opts.map((opt: any, idx: number) => (
                    <TouchableOpacity key={idx}
                      style={{
                        padding: 16, borderWidth: 1, borderColor: colors.border,
                        borderRadius: 10, marginBottom: 12, backgroundColor: colors.surfaceSecondary
                      }}
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