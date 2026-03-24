/**
 * Módulo de Sanatización Ara DNA
 * Aplica reglas de estilo periodístico y limpieza de contenido para Saladillo Vivo.
 */

const FORBIDDEN_WORDS = ['viste', 'che', 'pibe'];
const RELATIVE_DATES = ['hoy', 'ayer', 'mañana'];

export const sanitizationService = {
  /**
   * Limpia el texto de palabras prohibidas y ajusta fechas relativas.
   */
  sanitize(text: string, referenceDate?: string): string {
    if (!text) return '';

    let cleanedText = text;

    // 1. Eliminar palabras prohibidas (case insensitive, palabra completa)
    FORBIDDEN_WORDS.forEach(word => {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      cleanedText = cleanedText.replace(regex, '');
    });

    // 2. Ajustar fechas relativas (Hoy -> Fecha Real)
    if (referenceDate) {
      const date = new Date(referenceDate);
      const options: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'long' };
      const formattedDate = date.toLocaleDateString('es-AR', options);
      
      const yesterday = new Date(date);
      yesterday.setDate(yesterday.getDate() - 1);
      const formattedYesterday = yesterday.toLocaleDateString('es-AR', options);

      // Reemplazos básicos de fechas relativas
      cleanedText = cleanedText.replace(/\bhoy\b/gi, `este ${formattedDate}`);
      cleanedText = cleanedText.replace(/\bayer\b/gi, `el pasado ${formattedYesterday}`);
      cleanedText = cleanedText.replace(/\bmañana\b/gi, 'próximamente');
    }

    // 3. Limpieza de espacios múltiples y tabulaciones residuales
    cleanedText = cleanedText.replace(/\s+/g, ' ').trim();

    // 4. Asegurar primera letra en mayúscula si se perdió en el reemplazo
    if (cleanedText.length > 0) {
      cleanedText = cleanedText.charAt(0).toUpperCase() + cleanedText.slice(1);
    }

    return cleanedText;
  },

  /**
   * Limpia y optimiza el título.
   */
  sanitizeTitle(title: string): string {
    if (!title) return '';
    let cleanTitle = title.replace(/\s+/g, ' ').trim();
    
    // Quitar "viste", "che", "pibe" del título también
    FORBIDDEN_WORDS.forEach(word => {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      cleanTitle = cleanTitle.replace(regex, '');
    });

    return cleanTitle.charAt(0).toUpperCase() + cleanTitle.slice(1);
  }
};
