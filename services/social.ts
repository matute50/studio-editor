export interface SocialPostPayload {
    text: string;           // El copy del post
    image_url?: string;     // URL de la imagen en R2/Supabase
    platforms: ('facebook' | 'instagram')[];
    scheduled_time?: string; // ISO string opcional
}

const MAKE_WEBHOOK_URL = import.meta.env.NEXT_PUBLIC_MAKE_WEBHOOK_URL;

export const publishToSocialMedia = async (payload: SocialPostPayload): Promise<boolean> => {
    if (!MAKE_WEBHOOK_URL) {
        console.error("MAKE_WEBHOOK_URL not configured");
        throw new Error("Webhook de automatización no configurado.");
    }

    try {
        const response = await fetch(MAKE_WEBHOOK_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                ...payload,
                source: 'studio-editor',
                timestamp: new Date().toISOString()
            })
        });

        if (!response.ok) {
            throw new Error(`Error del servidor de automatización: ${response.statusText}`);
        }

        return true;
    } catch (error) {
        console.error("Social Publish Error:", error);
        throw error;
    }
};
