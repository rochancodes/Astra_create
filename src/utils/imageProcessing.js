// Background removal utility using Canvas API
// This is a simplified version that uses color-based detection
// For production, integrate with remove.bg API or rembg backend

export async function removeBackground(imageElement, options = {}) {
    const {
        threshold = 30,      // Color difference threshold
        edgeBlur = 2,        // Edge softening
        backgroundColor = null, // Auto-detect if null
    } = options;

    return new Promise((resolve) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        canvas.width = imageElement.naturalWidth || imageElement.width;
        canvas.height = imageElement.naturalHeight || imageElement.height;

        ctx.drawImage(imageElement, 0, 0);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        // Detect background color from corners
        let bgColor = backgroundColor;
        if (!bgColor) {
            bgColor = detectBackgroundColor(data, canvas.width, canvas.height);
        }

        // Remove background
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];

            const diff = colorDifference(r, g, b, bgColor.r, bgColor.g, bgColor.b);

            if (diff < threshold) {
                // Make transparent
                data[i + 3] = 0;
            } else if (diff < threshold * 2) {
                // Feather edges
                data[i + 3] = Math.floor((diff / (threshold * 2)) * 255);
            }
        }

        ctx.putImageData(imageData, 0, 0);

        // Apply edge blur for smoother result
        if (edgeBlur > 0) {
            applyEdgeBlur(ctx, canvas.width, canvas.height, edgeBlur);
        }

        resolve(canvas.toDataURL('image/png'));
    });
}

function detectBackgroundColor(data, width, height) {
    // Sample corners and edges
    const samples = [];
    const samplePoints = [
        [0, 0], [width - 1, 0], [0, height - 1], [width - 1, height - 1],
        [Math.floor(width / 2), 0], [0, Math.floor(height / 2)],
        [width - 1, Math.floor(height / 2)], [Math.floor(width / 2), height - 1],
    ];

    for (const [x, y] of samplePoints) {
        const idx = (y * width + x) * 4;
        samples.push({
            r: data[idx],
            g: data[idx + 1],
            b: data[idx + 2],
        });
    }

    // Average the samples
    const avg = samples.reduce(
        (acc, c) => ({ r: acc.r + c.r, g: acc.g + c.g, b: acc.b + c.b }),
        { r: 0, g: 0, b: 0 }
    );

    return {
        r: Math.floor(avg.r / samples.length),
        g: Math.floor(avg.g / samples.length),
        b: Math.floor(avg.b / samples.length),
    };
}

function colorDifference(r1, g1, b1, r2, g2, b2) {
    return Math.sqrt(
        Math.pow(r1 - r2, 2) +
        Math.pow(g1 - g2, 2) +
        Math.pow(b1 - b2, 2)
    );
}

function applyEdgeBlur(ctx, width, height, radius) {
    // Simple box blur for edge smoothing
    ctx.filter = `blur(${radius}px)`;
    ctx.drawImage(ctx.canvas, 0, 0);
    ctx.filter = 'none';
}

// Utility to resize image maintaining aspect ratio
export function resizeImage(imageElement, maxWidth, maxHeight) {
    return new Promise((resolve) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        let width = imageElement.naturalWidth || imageElement.width;
        let height = imageElement.naturalHeight || imageElement.height;

        const ratio = Math.min(maxWidth / width, maxHeight / height);

        if (ratio < 1) {
            width = Math.floor(width * ratio);
            height = Math.floor(height * ratio);
        }

        canvas.width = width;
        canvas.height = height;

        ctx.drawImage(imageElement, 0, 0, width, height);

        resolve({
            dataUrl: canvas.toDataURL('image/png'),
            width,
            height,
        });
    });
}

// Compress image to target size
export async function compressImage(canvas, targetSizeKB = 500, format = 'jpeg') {
    let quality = 0.9;
    let blob;

    while (quality > 0.1) {
        const dataUrl = canvas.toDataURL(`image/${format}`, quality);
        const response = await fetch(dataUrl);
        blob = await response.blob();

        if (blob.size <= targetSizeKB * 1024) {
            break;
        }

        quality -= 0.1;
    }

    return blob;
}
