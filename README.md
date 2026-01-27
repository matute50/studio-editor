
# Saladillo Vivo - Editor & VozArgentina AI Studio

Panel de administración profesional y estudio de generación multimedia para **[Saladillo Vivo](https://www.saladillovivo.com.ar)**.

## ⚠️ CONFIGURACIÓN OBLIGATORIA DE R2 (CORS)

Para que el navegador permita subir archivos directamente a Cloudflare R2 (Error `Failed to fetch`), debes configurar la política CORS en tu bucket exactamente así:

1. Ve al panel de **Cloudflare** -> **R2**.
2. Selecciona el bucket `saladillovivo-media`.
3. Ve a la pestaña **Settings** (Configuración).
4. Busca la sección **CORS Policy** y haz clic en **Add CORS Policy**.
5. Pega este JSON (Actualizado para AWS SDK v3):

```json
[
  {
    "AllowedOrigins": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD", "OPTIONS"],
    "AllowedHeaders": [
      "Content-Type", 
      "Authorization", 
      "x-amz-content-sha256", 
      "x-amz-date", 
      "x-amz-user-agent",
      "x-amz-target",
      "amz-sdk-invocation-id",
      "amz-sdk-request",
      "x-amz-decoded-content-length"
    ],
    "ExposeHeaders": ["ETag", "Location", "Content-Length", "x-amz-request-id", "x-amz-id-2"],
    "MaxAgeSeconds": 3600
  }
]
```
*Nota: Si prefieres seguridad total en producción, reemplaza `"*"` en `AllowedOrigins` por tu dominio `https://www.saladillovivo.com.ar`.*

## 🚀 Módulos Principales

### 🎙️ VozArgentina AI (Studio)
Módulo dedicado para la persona responsable de la generación de contenido audiovisual.
- **Yeísmo Rehilado (Sheísmo)**: Calibración específica para el sonido 'SH' de la 'LL' e 'Y'.
- **Voces Locales**: Catálogo de voces con acento argentino.
- **Redacción Asistida**: Optimización de guiones para locución con voseo.

### 📰 Editor de Noticias Inteligente
- **Gestión Jerárquica**: Portada, Secundarias y Terciarias.
- **Edición de Imágenes**: Recorte y filtros integrados para 1080p.
- **Thumbnail Automático**: Genera una miniatura del slide al masterizar video.

## 🛠️ Stack Tecnológico
- **Frontend**: React 19, Tailwind CSS.
- **Backend**: Supabase.
- **Storage**: Cloudflare R2 (S3 Compatible).
- **IA**: Google Gemini API (Modelos 2.5 y 3 Flash).

---
© 2025 Saladillo Vivo.
