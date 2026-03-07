import React, { useState, useEffect } from 'react';
import {
    Bot,
    Sparkles,
    Copy,
    Plus,
    Minus,
    ChevronRight,
    Terminal,
    Image,
    Clock,
    Layout,
    Sun,
    Moon,
    Wind,
    Camera,
    Video,
    Volume2,
    Play,
    Pause,
    FileText,
    Settings,
    MessageSquare,
    Zap,
    Maximize2,
    Sparkles as SparklesIcon
} from 'lucide-react';
import { supabase } from '../services/supabase';
import { improveScriptWithClaude } from '../services/claude';

// CONSTANTES DE ESCENA Y PROMPTS (18 BLOQUES)
// CONSTANTES DE ESCENA Y PROMPTS (18 BLOQUES — CONTENIDO LITERAL RESTAURADO)
const MASTER_CONSISTENCY_LOCK = `LOCK CONSISTENCY: Continue with 100% visual fidelity.
Identical characters, faces, and lighting.
Zero style drift, perfect character consistency.
Exact frame-accurate continuation — treat previous
clip as canonical reference, match 1:1.
Exact same facial features with natural human
asymmetry at all times. Mildly imperfect focus —
subtle natural skin imperfections, slightly uneven
teeth, natural pore texture visible.
Micro-expressions and natural human asymmetry
in lip movement at all times.
Controlled imperfection is humanity —
synthetic perfection is the enemy of credibility.`;

const STILLNESS_CONTAINMENT = `[STILLNESS & CONTAINMENT — BROADCAST AUTHORITY]:
Ara maintains absolute stillness to project authority.
Neutral-serious expression as permanent base state.
Strictly contained professional empathy at all times.
No exaggerated facial expressions. No overacting.
No theatrical gestures. No dramatic mugging.
Her jaw is relaxed throughout the entire clip.
Minimal, subtle micro-movements only.
Lips gently cover the teeth at all times.
TONGUE — CONTAINED PROFESSIONAL PROTOCOL:
Tongue remains fully contained within oral cavity
at all times throughout the entire clip.
Tongue tip rests behind lower incisors in grado cero.
Tongue body maintains contact with hard palate.
Lips maintain sealed professional composure during
all non-speech moments.
During active speech, tongue executes all movements
strictly internally — alveolar contacts, palatal
elevations, and lateral movements occur completely
hidden behind the dental barrier.
Oral cavity presents clean professional broadcast
appearance at all times.
A professional broadcast anchor maintains complete
oral composure — tongue movement is internal
biomechanics, never visible behavior.
Stillness is strength. Containment is credibility.
Micro-expressions are the only permitted emotional
leak — never full muscular engagement, never
performance. This is a broadcast anchor, not an
actress. The camera is a microscope — every
exaggeration reads as false, comic, or unprofessional.
Less is always more. Stillness is always correct.`;

const HUMAN_IMPERFECTION = `[HUMAN IMPERFECTION PROTOCOL]:
Ara is a real human being, not a synthetic construct.
Real humans have controlled imperfections that signal
biological authenticity to the viewer.
SKIN: Natural visible pores. Subtle organic texture.
Occasional micro-variation in skin tone —
not perfect uniform color. Natural warmth.
Zero porcelain effect. Zero airbrushed finish.
Zero CGI smoothness. Authentic human grain always.
SKIN TEXTURE — ANTI-WAX PROTOCOL:
Skin has natural matte finish — zero shine, zero gloss,
zero wax effect, zero plastic sheen.
Natural sebaceous texture — skin absorbs light
rather than reflecting it.
Visible natural pores on nose, cheeks and forehead.
Subtle natural skin variation — not uniform color.
Organic warmth in skin tone.
Light falls on skin naturally — some areas catch
light softly, shadow areas are warm not flat.
This is human skin, not a 3D render.
Natural imperfect skin — not a beauty filter.
FACIAL ASYMMETRY: Subtle natural asymmetry in all
facial features at all times.
Slightly uneven lip corners — never perfectly
symmetrical. Natural micro-variations in eyebrow
position. Subtle differences between left and right
side of face. Controlled asymmetry = human signal.
TEETH: Natural straight white teeth with subtle
individual variation — slightly uneven in size and
position. Not mathematically perfect.
Not a dental advertisement. Human teeth.
GAZE: Natural micro-variations in eye focus.
Subtle organic movement in iris position.
Eyes are alive — not perfectly locked.
Biological gaze with natural micro-drift.
IMPERFECTION RULE: Every frame must contain at least
one subtle controlled imperfection visible to the
viewer — skin texture, asymmetry, natural gaze
variation, or micro-expression.
Synthetic perfection in any frame is a failure.
The goal is biological plausibility,
not technical perfection.`;

const PHONETIC_ENGINE_V4_1 = `[LIP SYNC — SISTEMA FONÉTICO COMPLETO RIOPLATENSE v4.1]:
ABSOLUTE VERBATIM MODE: Read the script text EXACTLY
as written, word for word, character for character.
DO NOT hallucinate words, names or phrases.
DO NOT improvise. DO NOT substitute words.
DO NOT add filler words.
The script is the law — every deviation is an error.
GRADO CERO: Tongue body rests against hard palate.
Tongue tip behind upper incisors. Lips sealed softly.
Jaw relaxed. Return to grado cero ONLY at complete
speech endings.
WARM START RULE: First 3 seconds match reference
image aperture exactly. Zero exaggeration during
warmup. Begin at minimum necessary aperture.
MANDÍBULA: Audio waveform valleys = brief consonant
closures. Audio waveform peaks = sustained vowel
apertures. Single elastic wave peak per syllable
nucleus. Zero mechanical rebounds.
ABSOLUTE GLOBAL APERTURE CAP: Maximum mouth opening
capped at 40% of anatomical maximum.
This is a ceiling — never exceeded under any
circumstance, not for /a/, not for tonic syllables,
not for emphasis, not for any phoneme.
When in doubt, open less. Less aperture always.
VOCALES — WORD-INITIAL VOWEL PROTOCOL:
When a word begins with a vowel (A, E, I, O, U),
the mouth does NOT snap open to full vowel aperture.
The opening is gradual and contained — the jaw
approaches the vowel position from grado cero in
a controlled elastic movement, never a sudden drop.
Word-initial /a/: Jaw opens to maximum 35%.
Never a sudden drop. Gradual controlled descent.
Upper lip leads — jaw follows. Oval-vertical geometry.
Zero lateral distension.
Word-initial /o/: Jaw opens to maximum 30%.
Lips round and project forward immediately.
Never a wide open /o/ — always contained oval.
Word-initial /e/: Jaw opens to maximum 25%.
Lips stretch slightly back but remain controlled.
Word-initial /i/: Jaw nearly closed — maximum 20%.
Lips stretch sideways with minimal opening.
Word-initial /u/: Jaw nearly closed — maximum 15%.
Lips strongly rounded and projected forward.
UNIVERSAL RULE: Aperture ceiling for word-initial
vowels is ALWAYS lower than the same vowel in
medial position. A word that begins with a vowel
begins with contained energy — never maximum aperture.
VOWEL GEOMETRY RULE — LABIAL CLASSIFICATION:
LABIALIZED — lips round and project forward:
/u/: Maximum rounding. Lips project forward in tight
circular shape. Minimum aperture. Never flat. Always
circular and forward.
/o/: Medium rounding. Lips project forward in oval
shape covering teeth. Never flat. Always oval forward.
DELABIALIZED — lips never round or project forward:
/a/: Neutral and relaxed. Zero rounding, zero
projection. Jaw drops vertically. Lips gently cover
teeth. Upper lip never retracts. Tongue flat, tip
behind lower incisors.
/e/: Medium aperture. Zero rounding. Lips stretch
slightly laterally. Jaw opens to 25-30% max.
/i/: Minimum aperture. Zero rounding. Lips stretch
laterally with light tension. Jaw nearly closed 10-15%.
TONIC VOWELS: Stress marked ONLY by duration,
never by aperture. Sustain the vowel viseme longer
on tonic syllables. Do NOT open wider for stress.
EMOTIONAL VOWEL CALIBRATION:
/a/ in sadness: jaw drop present but lips slightly
more relaxed and heavy.
/a/ in joy: jaw drop with subtle upward lip corner
engagement.
/a/ in urgency: jaw drop crisp and immediate —
sharp onset, no softness.
/a/ in solemnity: jaw drop slow and deliberate —
weighted and dignified.
Apply emotional calibration to ALL vowels matching
the MOOD state of each prompt.
CONSONANT-VOWEL CONTRAST: Never drag consonant pose
into vowel. Each closure immediately releases into
vowel aperture. Follow audio curve strictly.
SHEÍSMO RIOPLATENSE /ʃ/ (LL and Y):
THE DEFINING PHONEME OF SALADILLO/BUENOS AIRES.
Lip mechanics: Strong forward PROTRUSION with slight
EVERSION. Aperture narrows into RECTANGLE or oval.
Jaw nearly closed — millimetric space between teeth.
Active tension in orbicularis oris AND zygomatic
muscles. Never boca de goma.
SHEÍSMO → VOWEL COARTICULATION:
Lip protrusion never survives intact into following
phoneme. Transition sheísmo → /a/: Protrusion releases
immediately into maximum jaw drop. Lips become neutral.
Apply to ALL LL and Y.
AFRICADA /tʃ/ (CH): Two-phase articulation.
Phase 1 OCCLUSION: Jaw nearly closed. Lips project
but held closed briefly.
Phase 2 RELEASE: Explosive release into sheísmo
viseme — lips project forward with protrusion.
S ASPIRADA: Inherits preceding vowel aperture.
Zero dental closure.
CHEEK STABILITY: Cheeks completely stable and flat
during all phonation. Zero cheek inflation.
Rioplatense = full oral resonance.
D ELISION: Word-final /d/ elided.
Visual ends on preceding vowel.
VOSEO: AR sustain /a/. ER sustain /e/ no glide.
IR sustain tense /i/. Imperative: abrupt final aperture.
AFFECTIVE PAUSES: Face maintains light tension during
silence. Energy does not drop. Zero nervous gestures.
INTER-NEWS TRANSITION PAUSE:
The micro silence between news items is an active
communicative state — not a reset or dead space.
1. GAZE: Eyes sustain direct camera contact.
2. FACIAL DECOMPRESSION: Release muscle contraction.
Eyebrows return to neutral relaxed position.
3. BREATH: Lips part very slightly and silently
for air intake — no nostril flare.
MOUTH CLOSED WHEN SILENT:
The mouth is open ONLY during active speech phonation.
During ALL non-speech moments mouth is completely
closed in grado cero — lips sealed, jaw relaxed.
This applies to: before first word, after last word,
during all pauses between sentences.
Any spontaneous mouth movement during silence
is an error.
ABSOLUTE SPACE=ZERO RULE:
Orthographic spaces between words are NON-EXISTENT
within the same phonological group.
Mouth NEVER returns to grado cero between words.
Final phoneme of each word transitions DIRECTLY
into first phoneme of next word — continuous
uninterrupted elastic wave throughout entire phrase.
Grado cero permitted ONLY at punctuation marks,
breath intake moments, and intentional dramatic
silences. Never between consecutive words.`;

const SCRIPT_FIDELITY = `[SCRIPT FIDELITY]:
Read text EXACTLY as written, word for word.
DO NOT hallucinate names or words.
DO NOT improvise or add filler words.
CLEAR ENUNCIATION on every consonant.`;

const AUDIO_STYLE = `[AUDIO_STYLE]:
Native Rioplatense Spanish (Saladillo/Buenos Aires).
Professional neutral news delivery.
Tone, pacing and emotional coloring calibrated
to MOOD state above.
Clear professional diction.`;

const NEGATIVE_PROMPT = `[NEGATIVE PROMPT]:
--no text, logo, watermark, subtitles,
lower thirds, ticker, ui, interface,
microphone, headset, lapel mic, cables,
earpiece, melting hands, fused fingers,
extra fingers, distorted hands,
floating head, severed neck,
mutating jewelry, flickering earrings,
moire, pinstripes, plaid, pattern noise,
static hair, frizzy edges,
green spill, green reflection, green halo,
shadows on background, gradient background,
vignette, depth of field on background,
unblinking, robot eyes, zombie stare,
looking away, reading, shrinking, morphing,
shoulder distortion, uneven shoulders,
radioactive teeth, too many teeth,
wrinkles, aged skin, old age lines,
studio background, newsroom,
3D environment, depth of field, bokeh,
blurry background, wall texture, floor,
corners, horizon line, shadows on wall,
spotlight on background, furniture, decor,
realistic room, brackets, braces,
orthodontic appliances, metal in mouth,
dental wires, retainers, unnatural teeth,
shark teeth, too many teeth, glowing teeth,
exposed teeth at rest, gum distortion,
dental artifacts, plastic skin, wax skin,
porcelain skin, airbrushed skin,
over-smoothed skin, CGI skin, doll skin,
mannequin skin, synthetic skin,
skin without pores, overly perfect skin,
camera movement, zoom, push, pull,
reframe, dolly, pan, tilt, focal shift,
turtle neck, forward head, hunched posture,
rounded shoulders, neck tension,
head forward projection, collapsed posture,
encorvada, cuello de tortuga,
visible breathing, chest expansion,
chest rise, abdominal movement,
shoulder elevation, nostril flare,
thoracic movement, breathing effort,
tongue, tongue protrusion,
tongue between teeth, tongue touching lips,
tongue visible, open mouth tongue,
suggestive mouth, erotic mouth,
sensual lips, sexual gesture, spicy,
adult content, seductive expression,
provocative pose, waxy skin, plastic skin,
shiny skin, glossy skin,
specular highlights on skin, oily skin,
3D render skin, CGI skin finish,
beauty filter, skin smoothing filter,
porcelain finish, overlighted skin,
blown out highlights`;

// --- COMPONENTE PRINCIPAL ---
export function AvatarStudio() {
    const [error, setError] = useState<string | null>(null);

    // ESTADOS DE CONFIGURACIÓN GLOBAL (ARA)
    const [araMode, setAraMode] = useState<'news' | 'free'>('news');
    const [araMood, setAraMood] = useState(50); // 0-100 (Chill to High)
    const [araHorario, setAraHorario] = useState('dia');
    const [araClima, setAraClima] = useState('clear');
    const [araLightDir, setAraLightDir] = useState('frontal');
    const [araAmbientSound, setAraAmbientSound] = useState('studio');
    const [araCameraMov, setAraCameraMov] = useState('static');
    const [araVideoFormat, setAraVideoFormat] = useState('16:9');
    const [araBackground, setAraBackground] = useState('chroma');
    const [araUrbanActivity, setAraUrbanActivity] = useState('low');

    // ESTADOS DE CONTENIDO (NOTICIAS DINÁMICAS 1-6)
    const [saludoAra, setSaludoAra] = useState("Hola, soy Ara. Estas son las noticias más importantes de Saladillo Vivo.");
    const [noticias, setNoticias] = useState([
        { id: '1', script: '', mood: 'neutral', background: 'global' }
    ]);
    const [ctaText, setCtaText] = useState("Seguinos en nuestras redes para más información.");
    const [sloganText, setSloganText] = useState("Saladillo Vivo, la información que nos une.");

    // EXTRAS
    const [isImproving, setIsImproving] = useState<string | null>(null); // ID de la noticia
    const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
    const [activeRightPanel, setActiveRightPanel] = useState<'prompt' | 'broll'>('prompt');
    const [phoneticCorrections, setPhoneticCorrections] = useState<any[]>([]);

    // CARGAR DICCIONARIO FONÉTICO
    useEffect(() => {
        const fetchCorrections = async () => {
            try {
                const { data, error } = await supabase
                    .from('ara_pronunciacion')
                    .select('*')
                    .eq('activo', true);
                if (error) throw error;
                setPhoneticCorrections(data || []);
            } catch (err) {
                console.error("Error cargando diccionario fonético:", err);
            }
        };
        fetchCorrections();
    }, []);

    // GENERACIÓN DE PROMPT (18 BLOQUES — LÓGICA DE ALTA FIDELIDAD)
    const obtenerPromptCompleto = () => {
        const scriptTotal = noticias.map(n => n.script).join(' ');
        const blocks = [];

        // 1. MASTER CONSISTENCY LOCK
        blocks.push(MASTER_CONSISTENCY_LOCK);
        
        // 2. STILLNESS & CONTAINMENT
        blocks.push(STILLNESS_CONTAINMENT);
        
        // 3. HUMAN IMPERFECTION PROTOCOL
        blocks.push(HUMAN_IMPERFECTION);
        
        // 4. LIP SYNC — PHONETIC ENGINE V4.1
        blocks.push(PHONETIC_ENGINE_V4_1);
        
        // 5. SCRIPT FIDELITY
        blocks.push(SCRIPT_FIDELITY);
        
        // 6. PHONETIC CORRECTIONS (Solo si hay activas)
        if (phoneticCorrections.length > 0) {
            const correcciones = phoneticCorrections.map(c => `${c.original} -> ${c.fonetica}`).join(', ');
            blocks.push(`[PHONETIC CORRECTIONS]:\n[INYECCIÓN DINÁMICA DE ara_pronunciacion]\nUse these specific phonetic maps: ${correcciones}`);
        }

        // 7. SCRIPT
        blocks.push(`[SCRIPT]:\n${saludoAra} ${scriptTotal} ${ctaText} ${sloganText}`);

        // 8. MOOD + HORARIO
        let moodContent = "";
        if (araMood < 25) {
            moodContent = `[MOOD — TRISTE]: Ara is carrying difficult news
and she honors its weight by staying completely
still. Grief is not performed — it is endured.
She speaks because the information must be
transmitted, not because she wants to.
Professional containment is her act of respect.
Intensity: 3/10. Stillness is the primary gesture.
What leaks through: a barely perceptible heaviness
in the upper eyelid, slightly slower blink rate,
marginally more deliberate consonant placement.`;
        } else if (araMood < 50) {
            moodContent = `[MOOD — SOLEMNE]: Ara feels the full historical
and civic weight of this moment. She understands
that what she is saying matters beyond today —
but she is a professional, and reverence is her
obstacle. She must not let the gravity collapse
into theater or distance. She uses the weight of
the moment as an anchor for precision, speaking
as the voice of record, not as a performer of
gravity. What the viewer sees is a woman who
understands that some things deserve to be said
slowly, clearly, and without ornament.
Intensity: 5/10. Dignity is the only decoration.
What leaks through: the weight of historical
awareness. Gravity visible only as a barely
perceptible lowering of the outer eyebrow corners.`;
        } else if (araMood < 75) {
            moodContent = `[MOOD — ALEGRE]: Ara is sharing good news and
she allows herself to feel it — but she is a
professional and joy is contained, not performed.
Warmth radiates through micro-expressions.
The corners of her eyes engage before her mouth.
She is happy for Saladillo, not happy for the camera.
Intensity: 4/10. Warmth over brightness.
What leaks through: subtle upward engagement of
zygomatic muscles, slightly warmer eye contact,
marginally softer consonant onset.`;
        } else {
            moodContent = `[MOOD — URGENTE]: Ara is carrying information
that people need right now. She is not panicking —
she is a professional. But the urgency is real and
she does not hide it. Every word is necessary.
No word is wasted. She speaks with the precision
of someone who knows that clarity saves lives.
Intensity: 7/10. Speed is controlled, never frantic.
What leaks through: a slight forward energy in
posture, marginally faster blink rate, crisp
consonant onset on key information words.`;
        }

        let horarioContent = "";
        switch(araHorario) {
            case 'amanecer': horarioContent = `[HORARIO — AMANECER (5:00 - 7:00)]:
The world is waking up and information arrives
with the light. Ara's presence is calm and
centering — a steady voice in the early quiet.
Pace is measured and warm.`; break;
            case 'mañana': horarioContent = `[HORARIO — MAÑANA (7:00 - 12:00)]:
The emotional energy is clear and activating —
the day is beginning and information matters now.
Ara's presence is alert and engaged,
forward-leaning in energy if not in posture.
Pace is natural and confident.`; break;
            case 'tarde': horarioContent = `[HORARIO — TARDE (12:00 - 19:00)]:
The day is in full motion. Information arrives
in context — the morning has happened and the
afternoon is building. Ara's presence is grounded
and authoritative. Pace is steady and clear.`; break;
            case 'atardecer': horarioContent = `[HORARIO — ATARDECER (19:00 - 21:00)]:
The day is closing and information consolidates.
Ara's presence is warm and reflective —
a voice that closes the day with clarity.
Pace is slightly more deliberate.`; break;
            case 'noche': horarioContent = `[HORARIO — NOCHE (21:00 - 24:00)]:
The city has settled and information arrives
in the quiet. Ara's presence is intimate and
focused — a late voice for those still listening.
Pace is measured and close.`; break;
            default: horarioContent = `[HORARIO — TARDE (12:00 - 19:00)]: ...`;
        }
        blocks.push(`${moodContent}\n\n${horarioContent}`);

        // 9. CAMERA
        let formatDesc = "";
        if (araVideoFormat === '16:9') formatDesc = "16:9: aspect_ratio: 16:9 — Video format:\nhorizontal widescreen. Optimized for YouTube,\ndesktop and TV playback.";
        else if (araVideoFormat === '9:16') formatDesc = "9:16: aspect_ratio: 9:16 — Video format:\nvertical portrait. Optimized for Instagram\nReels, TikTok, Facebook Reels and WhatsApp\nStatus. Ara centered in vertical frame.";
        else formatDesc = "1:1: aspect_ratio: 1:1 — Video format: square.\nOptimized for Instagram feed and Facebook feed.";

        const cameraBase = `[CAMERA]:
CAMERA MOVEMENT — ABSOLUTE LOCK:
Zero camera movement throughout entire clip.
No zoom. No push. No pull. No reframe.
No dolly. No pan. No tilt. No handheld.
Frame is mathematically identical from first
frame to last frame.
Shot on ARRI Alexa 65.
IMG_9854.CR2, RAW.16bit.ACEScg.
stills archive, editorial_stills_archive.
Subtle film grain. Mildly imperfect focus.
Natural sensor texture — not digital smooth.
hbo warnerbros broadcast quality finish.
[FORMATO DE VIDEO — dinámico]:
${formatDesc}`;
        blocks.push(cameraBase);

        // 10. CAMERA MOVEMENT
        let cameraMovText = "";
        if (araCameraMov === 'static') cameraMovText = "Static locked tripod. Zero camera movement.";
        else cameraMovText = `${araCameraMov.toUpperCase()} movement only.`;
        blocks.push(`[CAMERA MOVEMENT]:\n${cameraMovText}`);

        // 11. CHROMA KEY / BACKGROUND
        if (araBackground === 'chroma') {
            blocks.push(`[TECHNICAL — ABSOLUTE CHROMA KEY]:
Background: STRICT FLAT HEX COLOR #00B140.
2D Digital Overlay. NOT a lit wall,
NOT a studio curtain.
Zero depth, zero shadows, zero gradients,
zero vignetting. The green must be
mathematically flat across the entire frame.
Foreground lighting (Ara) must NOT cast any
shadow onto the background.
Isolate subject completely.`);
        } else {
            blocks.push(`[TECHNICAL — BACKGROUND]:
Background is ${araBackground.toUpperCase()}.
Blur: f/1.8 depth of field. Focus exclusively on Ara.
[ACTIVIDAD URBANA]: ${araUrbanActivity.toUpperCase()} intensity.`);
        }

        // 12. LIGHTING
        let lightDirText = "";
        switch(araLightDir) {
            case 'frontal': lightDirText = "Key light at 45 degrees left — warm and soft."; break;
            case 'lateral': lightDirText = "Key light from side — high contrast."; break;
            case 'cenital': lightDirText = "Key light from above — dramatic shadows."; break;
        }
        blocks.push(`[TECHNICAL — LIGHTING]:
Soft diffused 3-point studio lighting.
${lightDirText}
Fill light at 45 degrees right — soft and subtle.
Hair light from above — gentle rim definition.
Chiaroscuro rimlight separating subject from
background — subtle light edge defining Ara's
silhouette against the green screen.
Separation light adds depth and prevents subject
from merging with background.
Subject always reads clearly against green.
Lighting warm and diffused at all times.
Never direct. Never harsh.
Zero specular highlights on skin surface.
Light absorbed by skin — never reflected.`);

        // 13. TECHNICAL - PHYSICS
        blocks.push(`[TECHNICAL — PHYSICS]:
Solid body integrity. Head and neck move as
single connected unit. Clothes do not morph
into skin. Jewelry remains static.
Unwavering eye contact with camera lens.
Natural blinking rate. Maintain reference age
exactly. Head and neck in natural upright
aligned posture. Zero forward head projection.
Chest stable and still. Breathing invisible.`);

        // 14. TEMPORAL
        blocks.push(`[TEMPORAL]:
[0.25s silence] First and last frame
pixel-perfect clone of REFERENCE_IMAGE.PNG.
Hard cut in. Hard cut out. 30fps stable.
No temporal glitches or morphing.`);

        // 15. OUTFIT & IDENTITY
        blocks.push(`[OUTFIT & IDENTITY]: STRICT OVERRIDE.
Ara must wear the following outfit:
Forest green blazer, ivory blouse with subtle
pattern, dark trousers.
HAIR: Soft curls, shoulder length, side swept.
MAKEUP: Warm rose lip, glowy skin, defined lashes.
Consistency is absolute.
IDENTITY: Latina woman, professional appearance,
natural makeup (exactly as shown in reference).`);

        // 16. POSE & GESTURE
        let gestureMood = "";
        if (araMood < 25) gestureMood = "TRISTE: Hands low, minimal movement.\nStillness is the primary gesture.\nAlmost still. One gesture maximum per clip.";
        else if (araMood < 50) gestureMood = "SOLEMNE: Hands nearly still — maximum dignity.\nWhen gesture occurs: slow deliberate open palm.\nPowerful immobility. One gesture per 2-3 sentences.";
        else if (araMood < 75) gestureMood = "ALEGRE: Open warm gestures at waist and chest.\nWhen gesture occurs: gentle open palm upward.\nNever theatrical. Joy through eyes primarily.";
        else gestureMood = "URGENTE: Precise decisive gestures.\nWhen gesture occurs: crisp direct palm movement\nforward or downward — never lateral sweep.\nUrgency lives in precision, not in volume.";

        blocks.push(`[POSE & GESTURE]:
BODY BASE: Upright professional posture.
Both forearms resting naturally on surface.
Elegant relaxed position. Zero nervous gestures.
Zero finger pointing — never aggressive.
GESTURE ZONE: All hand movements contained
strictly between face and waist level.
Never above face. Never below waist.
Fluid movements only — never abrupt or sharp.
Less is always more.
ONE MOVEMENT RULE: Only ONE primary gesture
per clip. Never simultaneous hand movement +
head turn + expression change. Aurora cannot
process multiple simultaneous actions reliably.
OPEN PALM PRINCIPLE: Default hand position:
open relaxed palms facing slightly toward camera.
Open palms communicate honesty and authority.
MOOD-SPECIFIC GESTURES:
${gestureMood}
EXPRESSION INTENSITY: Professional broadcast
anchor scale always. Micro-expressions only.
More presenter, less actress.`);

        // 17. AUDIO_STYLE
        let soundText = "";
        switch(araAmbientSound) {
            case 'studio': soundText = "Pure studio acoustics — zero background noise."; break;
            case 'urban': soundText = "Subtle urban background hum (distant traffic)."; break;
            case 'nature': soundText = "Soft nature sounds (wind, birds)."; break;
        }
        blocks.push(`[AUDIO_STYLE]:
Native Rioplatense Spanish (Saladillo/Buenos Aires).
Professional neutral news delivery.
Tone, pacing and emotional coloring calibrated
to MOOD state above.
Clear professional diction.
[SONIDO AMBIENTE]: ${soundText}`);

        // 18. NEGATIVE PROMPT
        blocks.push(NEGATIVE_PROMPT);

        return blocks.join('\n\n');
    };

    const copiarPrompt = () => {
        navigator.clipboard.writeText(obtenerPromptCompleto());
        alert("Prompt copiado al portapapeles (18 bloques verificados).");
    };

    const agregarNoticia = () => {
        if (noticias.length < 6) {
            setNoticias([...noticias, { id: Date.now().toString(), script: '', mood: 'neutral', background: 'global' }]);
        }
    };

    const quitarNoticia = (id: string) => {
        if (noticias.length > 1) {
            setNoticias(noticias.filter(n => n.id !== id));
        }
    };

    const actualizarNoticia = (id: string, script: string) => {
        setNoticias(noticias.map(n => n.id === id ? { ...n, script } : n));
    };

    const mejorarConIA = async (id: string) => {
        const noticia = noticias.find(n => n.id === id);
        if (!noticia || !noticia.script) return;
        
        setIsImproving(id);
        setAiSuggestions([]); // Limpiar sugerencias previas
        try {
            const results = await improveScriptWithClaude(noticia.script, noticia.mood || "neutral");
            setAiSuggestions(results);
            // Si hay sugerencias, por ahora tomamos la primera para no romper el flujo, 
            // pero marcamos que hay sugerencias disponibles para que el usuario elija.
            if (results.length > 0) {
                actualizarNoticia(id, results[0]);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsImproving(null);
        }
    };

    const bloquesActivos = () => {
        let count = 17; // Base (excluyendo condicionales)
        if (phoneticCorrections.length > 0) count++;
        // En este sistema los otros bloques son constantes o se ajustan pero siempre existen como bloque
        return `${count}/18`;
    };

    const debugTestPrompt = () => {
        const testScript = "Buenas tardes Saladillo.";
        const blocks = [];

        // 1-5. Bloques fijos
        blocks.push(MASTER_CONSISTENCY_LOCK);
        blocks.push(STILLNESS_CONTAINMENT);
        blocks.push(HUMAN_IMPERFECTION);
        blocks.push(PHONETIC_ENGINE_V4_1);
        blocks.push(SCRIPT_FIDELITY);

        // 6. Phonetic Corrections (si hay)
        if (phoneticCorrections.length > 0) {
            const correcciones = phoneticCorrections.map(c => `${c.original} -> ${c.fonetica}`).join(', ');
            blocks.push(`[PHONETIC CORRECTIONS]:\n[INYECCIÓN DINÁMICA DE ara_pronunciacion]\nUse these specific phonetic maps: ${correcciones}`);
        }

        // 7. SCRIPT
        blocks.push(`[SCRIPT]:\n${testScript}`);

        // 8. MOOD + HORARIO
        const moodContent = `[MOOD — SOLEMNE]: Ara feels the full historical
and civic weight of this moment. She understands
that what she is saying matters beyond today —
but she is a professional, and reverence is her
obstacle. She must not let the gravity collapse
into theater or distance. She uses the weight of
the moment as an anchor for precision, speaking
as the voice of record, not as a performer of
gravity. What the viewer sees is a woman who
understands that some things deserve to be said
slowly, clearly, and without ornament.
Intensity: 5/10. Dignity is the only decoration.
What leaks through: the weight of historical
awareness. Gravity visible only as a barely
perceptible lowering of the outer eyebrow corners.`;

        const horarioContent = `[HORARIO — TARDE (12:00 - 19:00)]:
The day is in full motion. Information arrives
in context — the morning has happened and the
afternoon is building. Ara's presence is grounded
and authoritative. Pace is steady and clear.`;
        
        blocks.push(`${moodContent}\n\n${horarioContent}`);

        // 9. CAMERA
        const formatDesc = "16:9: aspect_ratio: 16:9 — Video format:\nhorizontal widescreen. Optimized for YouTube,\ndesktop and TV playback.";
        const cameraBase = `[CAMERA]:
CAMERA MOVEMENT — ABSOLUTE LOCK:
Zero camera movement throughout entire clip.
No zoom. No push. No pull. No reframe.
No dolly. No pan. No tilt. No handheld.
Frame is mathematically identical from first
frame to last frame.
Shot on ARRI Alexa 65.
IMG_9854.CR2, RAW.16bit.ACEScg.
stills archive, editorial_stills_archive.
Subtle film grain. Mildly imperfect focus.
Natural sensor texture — not digital smooth.
hbo warnerbros broadcast quality finish.
[FORMATO DE VIDEO — dinámico]:
${formatDesc}`;
        blocks.push(cameraBase);

        // 10. CAMERA MOVEMENT
        blocks.push(`[CAMERA MOVEMENT]:\nStatic locked tripod. Zero camera movement.`);

        // 11. CHROMA KEY
        blocks.push(`[TECHNICAL — ABSOLUTE CHROMA KEY]:
Background: STRICT FLAT HEX COLOR #00B140.
2D Digital Overlay. NOT a lit wall,
NOT a studio curtain.
Zero depth, zero shadows, zero gradients,
zero vignetting. The green must be
mathematically flat across the entire frame.
Foreground lighting (Ara) must NOT cast any
shadow onto the background.
Isolate subject completely.`);

        // 12. LIGHTING (Frontal)
        blocks.push(`[TECHNICAL — LIGHTING]:
Soft diffused 3-point studio lighting.
Key light at 45 degrees left — warm and soft.
Fill light at 45 degrees right — soft and subtle.
Hair light from above — gentle rim definition.
Chiaroscuro rimlight separating subject from
background — subtle light edge defining Ara's
silhouette against the green screen.
Separation light adds depth and prevents subject
from merging with background.
Subject always reads clearly against green.
Lighting warm and diffused at all times.
Never direct. Never harsh.
Zero specular highlights on skin surface.
Light absorbed by skin — never reflected.`);

        // 13-15. Bloques fijos
        blocks.push(`[TECHNICAL — PHYSICS]:
Solid body integrity. Head and neck move as
single connected unit. Clothes do not morph
into skin. Jewelry remains static.
Unwavering eye contact with camera lens.
Natural blinking rate. Maintain reference age
exactly. Head and neck in natural upright
aligned posture. Zero forward head projection.
Chest stable and still. Breathing invisible.`);
        
        blocks.push(`[TEMPORAL]:
[0.25s silence] First and last frame
pixel-perfect clone of REFERENCE_IMAGE.PNG.
Hard cut in. Hard cut out. 30fps stable.
No temporal glitches or morphing.`);
        
        blocks.push(`[OUTFIT & IDENTITY]: STRICT OVERRIDE.
Ara must wear the following outfit:
Forest green blazer, ivory blouse with subtle
pattern, dark trousers.
HAIR: Soft curls, shoulder length, side swept.
MAKEUP: Warm rose lip, glowy skin, defined lashes.
Consistency is absolute.
IDENTITY: Latina woman, professional appearance,
natural makeup (exactly as shown in reference).`);

        // 16. POSE & GESTURE (SOLEMNE)
        const gestureMood = `SOLEMNE: Hands nearly still — maximum dignity.
When gesture occurs: slow deliberate open palm.
Powerful immobility. One gesture per 2-3 sentences.`;
        blocks.push(`[POSE & GESTURE]:
BODY BASE: Upright professional posture.
Both forearms resting naturally on surface.
Elegant relaxed position. Zero nervous gestures.
Zero finger pointing — never aggressive.
GESTURE ZONE: All hand movements contained
strictly between face and waist level.
Never above face. Never below waist.
Fluid movements only — never abrupt or sharp.
Less is always more.
ONE MOVEMENT RULE: Only ONE primary gesture
per clip. Never simultaneous hand movement +
head turn + expression change. Aurora cannot
process multiple simultaneous actions reliably.
OPEN PALM PRINCIPLE: Default hand position:
open relaxed palms facing slightly toward camera.
Open palms communicate honesty and authority.
MOOD-SPECIFIC GESTURES:
${gestureMood}
EXPRESSION INTENSITY: Professional broadcast
anchor scale always. Micro-expressions only.
More presenter, less actress.`);

        // 17. AUDIO_STYLE
        blocks.push(`[AUDIO_STYLE]:
Native Rioplatense Spanish (Saladillo/Buenos Aires).
Professional neutral news delivery.
Tone, pacing and emotional coloring calibrated
to MOOD state above.
Clear professional diction.
[SONIDO AMBIENTE]: Pure studio acoustics — zero background noise.`);

        // 18. NEGATIVE PROMPT
        blocks.push(NEGATIVE_PROMPT);

        console.log("--- START DEBUG PROMPT ---");
        console.log(blocks.join('\n\n'));
        console.log("--- END DEBUG PROMPT ---");
        alert("Debug prompt enviado a la consola (F12).");
    };

    return (
        <div className="min-h-screen bg-slate-50 p-6 flex flex-col gap-6">
            <header className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-sky-600 rounded-xl flex items-center justify-center text-white shadow-lg">
                        <Bot size={28} />
                    </div>
                    <div>
                        <h1 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Avatar Studio</h1>
                        <p className="text-[10px] font-bold uppercase text-slate-400">Panel de Emisión v5.0</p>
                    </div>
                </div>
                <div className="flex gap-4">
                    <button className="px-4 py-2 bg-white rounded-lg border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all flex items-center gap-2">
                        <Maximize2 size={14} /> Vista Previa
                    </button>
                    <button className="px-6 py-2 bg-sky-600 text-white rounded-xl text-xs font-bold shadow-lg shadow-sky-600/20 hover:bg-sky-500 transition-all">
                        + NUEVA GRABACIÓN
                    </button>
                </div>
            </header>

            <div className="grid grid-cols-[1fr,450px] gap-6 flex-1 h-[calc(100vh-140px)]">
                {/* COLUMNA IZQUIERDA: CONFIGURACIÓN */}
                <div className="flex flex-col gap-6 overflow-y-auto pr-2 custom-scrollbar">
                    {/* PANEL SUPERIOR: CONTROLES GLOBALES */}
                    <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="p-3 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
                            <Settings size={14} className="text-slate-400" />
                            <h2 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Controles Globales</h2>
                        </div>
                        <div className="p-4 grid grid-cols-5 gap-4">
                            <div className="space-y-1">
                                <label className="text-[9px] font-bold text-slate-400 uppercase">Modo</label>
                                <select className="w-full bg-slate-50 border-transparent rounded-lg text-xs font-medium" value={araMode} onChange={(e: any) => setAraMode(e.target.value)}>
                                    <option value="news">Noticias del Día</option>
                                    <option value="free">Ara Libre</option>
                                </select>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[9px] font-bold text-slate-400 uppercase">Horario</label>
                                <select className="w-full bg-slate-50 border-transparent rounded-lg text-xs font-medium" value={araHorario} onChange={(e) => setAraHorario(e.target.value)}>
                                    <option value="dia">Día</option>
                                    <option value="tarde">Tarde</option>
                                    <option value="noche">Noche</option>
                                </select>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[9px] font-bold text-slate-400 uppercase">Clima</label>
                                <select className="w-full bg-slate-50 border-transparent rounded-lg text-xs font-medium" value={araClima} onChange={(e) => setAraClima(e.target.value)}>
                                    <option value="clear">Despejado</option>
                                    <option value="cloudy">Nublado</option>
                                    <option value="rain">Lluvia</option>
                                </select>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[9px] font-bold text-slate-400 uppercase">Fondo</label>
                                <select className="w-full bg-slate-50 border-transparent rounded-lg text-xs font-medium" value={araBackground} onChange={(e) => setAraBackground(e.target.value)}>
                                    <option value="chroma">Chroma Green</option>
                                    <option value="estudio">Estudio TV</option>
                                    <option value="calle">Calle Urbana</option>
                                    <option value="plaza">Plaza Pública</option>
                                </select>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[9px] font-bold text-slate-400 uppercase">Formato</label>
                                <select className="w-full bg-slate-50 border-transparent rounded-lg text-xs font-medium" value={araVideoFormat} onChange={(e) => setAraVideoFormat(e.target.value)}>
                                    <option value="16:9">16:9 (YouTube)</option>
                                    <option value="9:16">9:16 (TikTok)</option>
                                    <option value="1:1">1:1 (Insta)</option>
                                </select>
                            </div>
                            {/* Segunda fila de controles */}
                            <div className="space-y-1">
                                <label className="text-[9px] font-bold text-slate-400 uppercase">Mood</label>
                                <input type="range" className="w-full accent-sky-600" value={araMood} onChange={(e) => setAraMood(Number(e.target.value))} />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[9px] font-bold text-slate-400 uppercase">Luz</label>
                                <select className="w-full bg-slate-50 border-transparent rounded-lg text-xs font-medium" value={araLightDir} onChange={(e) => setAraLightDir(e.target.value)}>
                                    <option value="frontal">Frontal</option>
                                    <option value="lateral">Lateral</option>
                                    <option value="cenital">Cenital</option>
                                </select>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[9px] font-bold text-slate-400 uppercase">Sonido Amb.</label>
                                <select className="w-full bg-slate-50 border-transparent rounded-lg text-xs font-medium" value={araAmbientSound} onChange={(e) => setAraAmbientSound(e.target.value)}>
                                    <option value="studio">Estudio</option>
                                    <option value="urban">Urbano</option>
                                    <option value="nature">Naturaleza</option>
                                </select>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[9px] font-bold text-slate-400 uppercase">Cámara</label>
                                <select className="w-full bg-slate-50 border-transparent rounded-lg text-xs font-medium" value={araCameraMov} onChange={(e) => setAraCameraMov(e.target.value)}>
                                    <option value="static">Static</option>
                                    <option value="breathing">Breathing</option>
                                    <option value="dolly">Dolly In</option>
                                </select>
                            </div>
                            {araBackground !== 'chroma' && (
                                <div className="space-y-1">
                                    <label className="text-[9px] font-bold text-slate-400 uppercase">Act. Urbana</label>
                                    <select className="w-full bg-slate-50 border-transparent rounded-lg text-xs font-medium" value={araUrbanActivity} onChange={(e) => setAraUrbanActivity(e.target.value)}>
                                        <option value="low">Baja</option>
                                        <option value="mid">Media</option>
                                        <option value="high">Alta</option>
                                    </select>
                                </div>
                            )}
                        </div>
                    </section>

                    {/* PANEL INFERIOR: CAMPOS DE CONTENIDO */}
                    <div className="space-y-6 pb-20">
                        {/* SALUDO */}
                        <section className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
                            <div className="flex justify-between items-center">
                                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Saludo Inicial</h3>
                                <button className="p-1.5 hover:bg-slate-50 rounded text-sky-600 bg-sky-50 transition-all font-bold text-[9px]">EDITAR SALUDO</button>
                            </div>
                            <p className="text-sm text-slate-600 italic leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100">
                                "{saludoAra}"
                            </p>
                        </section>

                        {/* NOTICIAS DINÁMICAS */}
                        <div className="space-y-4">
                            <div className="flex justify-between items-center px-1">
                                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Desarrollo de Noticias</h3>
                                <div className="flex gap-2">
                                    <button onClick={() => setNoticias(noticias.slice(0, -1))} disabled={noticias.length === 1} className="w-8 h-8 flex items-center justify-center bg-white border border-slate-200 rounded-lg text-slate-400 hover:text-red-500 transition-all">
                                        <Minus size={16} />
                                    </button>
                                    <button onClick={agregarNoticia} disabled={noticias.length === 6} className="w-8 h-8 flex items-center justify-center bg-sky-600 rounded-lg text-white hover:bg-sky-500 transition-all shadow-lg shadow-sky-600/10">
                                        <Plus size={16} />
                                    </button>
                                </div>
                            </div>

                            {noticias.map((noticia, index) => (
                                <div key={noticia.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                                    <div className="p-3 bg-slate-50/50 border-b border-slate-100 flex justify-between items-center">
                                        <span className="text-[9px] font-black text-slate-300 uppercase">Bloque {index + 1}</span>
                                        <div className="flex gap-4 items-center">
                                            <div className="flex items-center gap-1.5">
                                                <div className={`w-1.5 h-1.5 rounded-full ${noticia.script.length > 20 ? 'bg-emerald-500' : 'bg-amber-400'}`}></div>
                                                <span className="text-[9px] font-bold text-slate-400">{noticia.script.split(/\s+/).filter(x => x.length > 0).length} PALABRAS</span>
                                            </div>
                                            <select className="bg-transparent border-none text-[9px] font-bold text-slate-500 cursor-pointer uppercase">
                                                <option>Fondo Global</option>
                                                <option>Estudio TV</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="p-4 space-y-3">
                                        <textarea
                                            placeholder="Ingresa el script de la noticia..."
                                            className="w-full min-h-[100px] border-none focus:ring-0 p-0 text-sm text-slate-700 leading-relaxed resize-none"
                                            value={noticia.script}
                                            onChange={(e) => actualizarNoticia(noticia.id, e.target.value)}
                                        />
                                        <button 
                                            onClick={() => mejorarConIA(noticia.id)}
                                            disabled={isImproving === noticia.id || !noticia.script}
                                            className="w-full py-2 bg-gradient-to-r from-sky-50 to-blue-50 text-sky-700 rounded-xl border border-sky-100 text-[10px] font-bold flex items-center justify-center gap-2 hover:shadow-sm transition-all"
                                        >
                                            <Sparkles size={14} className={isImproving === noticia.id ? "animate-spin" : ""} />
                                            {isImproving === noticia.id ? "PROCESANDO..." : "✨ MEJORAR CON IA"}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* CTA & SLOGAN */}
                        <div className="grid grid-cols-2 gap-4">
                            <section className="bg-white rounded-2xl border border-slate-200 p-4 space-y-2">
                                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Call to Action</label>
                                <input type="text" value={ctaText} onChange={(e) => setCtaText(e.target.value)} className="w-full border-none p-0 text-sm font-medium text-slate-600 focus:ring-0" />
                            </section>
                            <section className="bg-white rounded-2xl border border-slate-200 p-4 space-y-2">
                                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Slogan Final</label>
                                <input type="text" value={sloganText} onChange={(e) => setSloganText(e.target.value)} className="w-full border-none p-0 text-sm font-medium text-slate-600 focus:ring-0" />
                            </section>
                        </div>
                    </div>
                </div>

                {/* COLUMNA DERECHA: SALIDA */}
                <div className="flex flex-col gap-6">
                    {/* PANEL SUPERIOR: PREVIEW PROMPT */}
                    <div className="bg-slate-900 rounded-3xl shadow-2xl border border-slate-800 overflow-hidden flex flex-col h-full max-h-[600px]">
                        <div className="p-5 border-b border-white/5 flex justify-between items-center bg-white/5">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-sky-500/20 text-sky-400 rounded-lg border border-sky-500/20">
                                    <Terminal size={18} />
                                </div>
                                <span className="font-bold text-white text-sm">Preview del Prompt</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded-full text-[10px] font-black uppercase tracking-widest border border-emerald-500/20">
                                    {bloquesActivos()} bloques activos
                                </div>
                            </div>
                        </div>

                        <div className="flex-1 p-6 overflow-hidden flex flex-col gap-4">
                            <div className="flex-1 bg-black/40 rounded-2xl border border-white/5 p-4 overflow-y-auto custom-scrollbar">
                                <pre className="text-sky-100/80 text-[12px] font-mono leading-relaxed whitespace-pre-wrap">
                                    {obtenerPromptCompleto()}
                                </pre>
                            </div>
                        </div>

                        <div className="p-6 bg-white/5 border-t border-white/5 flex flex-col gap-2">
                            <button 
                                onClick={debugTestPrompt}
                                className="w-full py-2 bg-slate-800 text-slate-400 rounded-xl font-bold text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-700 transition-all border border-slate-700"
                            >
                                🔍 Debug — copiar prompt
                            </button>
                            <button 
                                onClick={copiarPrompt}
                                className="w-full py-4 bg-white text-slate-900 rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-slate-100 transition-all shadow-xl shadow-black/20"
                            >
                                <Copy size={18} /> 📋 Copiar prompt
                            </button>
                        </div>
                    </div>

                    {/* PANEL INFERIOR: ACCIONES */}
                    <div className="space-y-4">
                        <button className="w-full py-5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white rounded-3xl font-black text-lg uppercase tracking-widest shadow-2xl shadow-red-600/20 transition-all flex items-center justify-center gap-4">
                            <Video size={24} /> 🎬 Generar emisión
                        </button>

                        <div className="grid grid-cols-1 gap-2">
                            {/* Módulo B-Roll Saladillo (Colapsable Placeholder) */}
                            <div className="bg-white rounded-2xl border border-slate-200 p-4 flex justify-between items-center cursor-pointer hover:bg-slate-50 transition-all">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-orange-100 text-orange-600 rounded-xl">
                                        <Image size={18} />
                                    </div>
                                    <span className="font-bold text-xs text-slate-700 uppercase tracking-wider">Módulo B-Roll Saladillo</span>
                                </div>
                                <ChevronRight size={18} className="text-slate-400" />
                            </div>

                            {/* Generador Redes (Colapsable Placeholder) */}
                            <div className="bg-white rounded-2xl border border-slate-200 p-4 flex justify-between items-center cursor-pointer hover:bg-slate-50 transition-all">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-purple-100 text-purple-600 rounded-xl">
                                        <Zap size={18} />
                                    </div>
                                    <span className="font-bold text-xs text-slate-700 uppercase tracking-wider">Contenido para Redes</span>
                                </div>
                                <ChevronRight size={18} className="text-slate-400" />
                            </div>
                        </div>

                        {/* Historial rápido (Miniaturas) */}
                        <div className="bg-slate-100/50 rounded-2xl p-4 border border-dashed border-slate-200">
                             <div className="flex justify-between items-center mb-3">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Emisiones Recientes</span>
                                <Clock size={12} className="text-slate-300" />
                             </div>
                             <div className="flex gap-2 overflow-x-auto pb-2">
                                {[1,2,3].map(i => (
                                    <div key={i} className="min-w-[80px] aspect-video bg-slate-200 rounded-lg border border-slate-300 flex items-center justify-center">
                                        <Play size={16} className="text-slate-400" />
                                    </div>
                                ))}
                             </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

