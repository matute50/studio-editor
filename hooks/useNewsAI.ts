import { useState } from 'react';
import { generateProfessionalNews } from '../services/gemini';

export const useNewsAI = () => {
    const [isProcessingAI, setIsProcessingAI] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const rewriteNews = async (title: string, text: string) => {
        if (!title.trim() && !text.trim()) {
            setError("Ingresa al menos una idea o borrador para reescribir.");
            return null;
        }

        setIsProcessingAI(true);
        setError(null);

        try {
            const result = await generateProfessionalNews(`${title} ${text}`);

            if (!result.title || !result.body) {
                throw new Error("La IA no devolvió contenido. Intentá de nuevo.");
            }

            return result;
        } catch (err: any) {
            console.error("Error AI Redaction:", err);
            setError(err.message || "Error al conectar con la Agencia AI.");
            return null;
        } finally {
            setIsProcessingAI(false);
        }
    };

    return {
        rewriteNews,
        isProcessingAI,
        aiError: error,
        clearAIError: () => setError(null)
    };
};
