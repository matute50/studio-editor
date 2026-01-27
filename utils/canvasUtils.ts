
export const createImage = async (url: string): Promise<HTMLImageElement> => {
  const isRemote = !url.startsWith('data:') && !url.startsWith('blob:');
  const isOurMedia = url.includes('media.saladillovivo.com.ar') || url.includes('pub-5b294f92f42e4cbda687d0122e15bc72.r2.dev');
  const isWebP = url.toLowerCase().includes('.webp');
  
  let finalUrl = url;

  if (isRemote) {
    try {
      // Intento 1: Carga directa con headers específicos para WebP y otros formatos modernos
      const response = await fetch(url, {
        mode: 'cors',
        credentials: 'omit',
        headers: {
          'Accept': 'image/webp,image/apng,image/avif,image/*,*/*;q=0.8'
        }
      });

      if (!response.ok) throw new Error(`HTTP Error ${response.status}`);
      
      const blob = await response.blob();
      finalUrl = URL.createObjectURL(blob);
    } catch (err) {
      console.warn("Fallo fetch directo para .webp o CORS, usando Proxy Weserv con bypass:", err);
      
      // Intento 2: Proxy de Imágenes Weserv
      // Forzamos la salida a webp o jpg para garantizar que el proxy procese el stream
      if (!isOurMedia) {
        try {
          // Usamos 'images.weserv.nl' que es excelente manejando .webp y saltando bloqueos de referer/CORS
          const proxyUrl = `https://images.weserv.nl/?url=${encodeURIComponent(url)}&output=webp&default=${encodeURIComponent(url)}`;
          
          const proxyResponse = await fetch(proxyUrl, {
            headers: { 'Accept': 'image/webp,image/*' }
          });

          if (proxyResponse.ok) {
            const proxyBlob = await proxyResponse.blob();
            finalUrl = URL.createObjectURL(proxyBlob);
          } else {
            throw new Error("Proxy no pudo procesar la imagen.");
          }
        } catch (proxyErr) {
          console.error("Fallo crítico en todos los métodos de carga:", proxyErr);
        }
      }
    }
  }

  return new Promise((resolve, reject) => {
    const image = new Image();
    
    // Si logramos obtener un Blob local, ya no necesitamos crossOrigin anonymous
    // porque el recurso es local al origen de la app (blob:).
    // De lo contrario, lo activamos como último recurso.
    if (isRemote && !finalUrl.startsWith('blob:')) {
      image.setAttribute('crossOrigin', 'anonymous');
    }

    image.addEventListener('load', () => resolve(image));

    image.addEventListener('error', () => {
      console.error("Error final al cargar imagen:", url);
      reject(new Error(
        `No pudimos procesar la imagen .webp remota.\n\nEl servidor de origen (ej: ahorasaladillo) tiene protecciones estrictas contra accesos automatizados.\n\nSOLUCIÓN: Haga clic derecho en la imagen original, elija "Guardar imagen como..." y luego use la opción "Subir Archivo" en este panel.`
      ));
    });

    image.src = finalUrl;
  });
};

export function getRadianAngle(degreeValue: number) {
  return (degreeValue * Math.PI) / 180;
}

function applyConvolution(imageData: ImageData, kernel: number[]) {
  const sw = imageData.width;
  const sh = imageData.height;
  const src = imageData.data;
  const output = new ImageData(new Uint8ClampedArray(src.length), sw, sh);
  const dst = output.data;

  const side = Math.round(Math.sqrt(kernel.length));
  const halfSide = Math.floor(side / 2);

  for (let y = 0; y < sh; y++) {
    for (let x = 0; x < sw; x++) {
      const dstOff = (y * sw + x) * 4;
      let r = 0, g = 0, b = 0;

      for (let cy = 0; cy < side; cy++) {
        for (let cx = 0; cx < side; cx++) {
          const scy = y + cy - halfSide;
          const scx = x + cx - halfSide;

          if (scy >= 0 && scy < sh && scx >= 0 && scx < sw) {
            const srcOff = (scy * sw + scx) * 4;
            const wt = kernel[cy * side + cx];
            r += src[srcOff] * wt;
            g += src[srcOff + 1] * wt;
            b += src[srcOff + 2] * wt;
          }
        }
      }

      dst[dstOff] = r;
      dst[dstOff + 1] = g;
      dst[dstOff + 2] = b;
      dst[dstOff + 3] = src[dstOff + 3];
    }
  }
  return output;
}

export interface ImageAdjustments {
  brightness: number;
  contrast: number;
  saturation: number;
  sharpen: number;
}

/**
 * Escala y mejora la imagen para 1080p (FHD)
 */
export async function getProcessedImage(
  imageSrc: string,
  pixelCrop: { x: number; y: number; width: number; height: number } | null,
  rotation = 0,
  adjustments: ImageAdjustments,
  autoEnhance: boolean = false
): Promise<{ file: File; url: string }> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });

  if (!ctx) throw new Error('No se pudo inicializar el motor gráfico.');

  const crop = pixelCrop || { x: 0, y: 0, width: image.width, height: image.height };

  const maxSize = Math.max(image.width, image.height);
  const safeArea = 2 * ((maxSize / 2) * Math.sqrt(2));
  canvas.width = safeArea;
  canvas.height = safeArea;

  ctx.translate(safeArea / 2, safeArea / 2);
  ctx.rotate(getRadianAngle(rotation));
  ctx.translate(-image.width / 2, -image.height / 2);
  ctx.drawImage(image, 0, 0);

  const safeX = Math.max(0, Math.min(canvas.width - crop.width, safeArea / 2 - image.width / 2 + crop.x));
  const safeY = Math.max(0, Math.min(canvas.height - crop.height, safeArea / 2 - image.height / 2 + crop.y));

  const croppedData = ctx.getImageData(
    safeX,
    safeY,
    crop.width,
    crop.height
  );

  const targetWidth = 1920; 
  const aspectRatio = crop.width / crop.height;
  const targetHeight = Math.round(targetWidth / aspectRatio);

  canvas.width = targetWidth;
  canvas.height = targetHeight;
  ctx.clearRect(0, 0, targetWidth, targetHeight);

  let b = adjustments.brightness;
  let c = adjustments.contrast;
  let s = adjustments.saturation;
  let sh = adjustments.sharpen;

  if (autoEnhance) {
    b = 105;
    c = 115;
    s = 120;
    sh = Math.max(sh, 70);
  }

  ctx.filter = `brightness(${b}%) contrast(${c}%) saturate(${s}%)`;
  
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = crop.width;
  tempCanvas.height = crop.height;
  const tempCtx = tempCanvas.getContext('2d');
  if (!tempCtx) throw new Error('Error en el búfer temporal.');
  tempCtx.putImageData(croppedData, 0, 0);

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(tempCanvas, 0, 0, targetWidth, targetHeight);
  ctx.filter = 'none';

  if (sh > 0) {
    try {
      const imageData = ctx.getImageData(0, 0, targetWidth, targetHeight);
      const kernel = [0, -1, 0, -1, 5, -1, 0, -1, 0];
      const sharpenedData = applyConvolution(imageData, kernel);
      
      const factor = sh / 100;
      if (factor < 1) {
        for (let i = 0; i < imageData.data.length; i += 4) {
          sharpenedData.data[i] = imageData.data[i] * (1 - factor) + sharpenedData.data[i] * factor;
          sharpenedData.data[i+1] = imageData.data[i+1] * (1 - factor) + sharpenedData.data[i+1] * factor;
          sharpenedData.data[i+2] = imageData.data[i+2] * (1 - factor) + sharpenedData.data[i+2] * factor;
        }
      }
      ctx.putImageData(sharpenedData, 0, 0);
    } catch (e) {
      console.warn('Fallo en filtro de nitidez.');
    }
  }

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) return reject(new Error('No se pudo generar el archivo.'));
        const file = new File([blob], `noticia_${Date.now()}.jpg`, { type: 'image/jpeg' });
        resolve({ file, url: URL.createObjectURL(blob) });
      },
      'image/jpeg',
      0.90
    );
  });
}
