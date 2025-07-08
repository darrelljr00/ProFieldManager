import sharp from "sharp";
import path from "path";
import { format } from "date-fns";

export interface TimestampOptions {
  enableTimestamp: boolean;
  timestampFormat: string;
  includeGpsCoords: boolean;
  timestampPosition: string;
  gpsLatitude?: number;
  gpsLongitude?: number;
  customText?: string;
}

export interface TimestampOverlayResult {
  success: boolean;
  outputPath: string;
  error?: string;
}

/**
 * Add timestamp overlay to an image using Sharp
 */
export async function addTimestampToImage(
  inputPath: string,
  outputPath: string,
  options: TimestampOptions
): Promise<TimestampOverlayResult> {
  try {
    if (!options.enableTimestamp) {
      return { success: false, outputPath: inputPath, error: "Timestamp not enabled" };
    }

    // Get current date and format it
    const currentDate = new Date();
    let timestampText = format(currentDate, options.timestampFormat || "MM/dd/yyyy hh:mm a");

    // Add GPS coordinates if enabled and available
    if (options.includeGpsCoords && options.gpsLatitude && options.gpsLongitude) {
      const latString = options.gpsLatitude.toFixed(6);
      const lonString = options.gpsLongitude.toFixed(6);
      timestampText += `\nGPS: ${latString}, ${lonString}`;
    }

    // Add custom text if provided
    if (options.customText) {
      timestampText += `\n${options.customText}`;
    }

    // Get image metadata to determine dimensions
    const imageInfo = await sharp(inputPath).metadata();
    const imageWidth = imageInfo.width || 1920;
    const imageHeight = imageInfo.height || 1080;

    // Calculate font size based on image dimensions (responsive sizing)
    const baseFontSize = Math.min(imageWidth, imageHeight) * 0.025; // 2.5% of smallest dimension
    const fontSize = Math.max(16, Math.min(48, baseFontSize)); // Between 16px and 48px

    // Calculate text box dimensions (approximate)
    const textLines = timestampText.split('\n');
    const maxLineLength = Math.max(...textLines.map(line => line.length));
    const textWidth = maxLineLength * (fontSize * 0.6); // Approximate character width
    const textHeight = textLines.length * (fontSize * 1.4); // Line height

    // Calculate position based on timestamp position setting
    let x = 20; // Default left margin
    let y = 20; // Default top margin

    switch (options.timestampPosition) {
      case "bottom-right":
        x = imageWidth - textWidth - 20;
        y = imageHeight - textHeight - 20;
        break;
      case "bottom-left":
        x = 20;
        y = imageHeight - textHeight - 20;
        break;
      case "top-right":
        x = imageWidth - textWidth - 20;
        y = 20;
        break;
      case "top-left":
      default:
        x = 20;
        y = 20;
        break;
    }

    // Ensure coordinates are not negative
    x = Math.max(10, x);
    y = Math.max(10, y);

    // Create a text overlay using SVG
    const textSvg = `
      <svg width="${imageWidth}" height="${imageHeight}">
        <defs>
          <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="2" dy="2" stdDeviation="2" flood-color="black" flood-opacity="0.8"/>
          </filter>
        </defs>
        <text 
          x="${x}" 
          y="${y}" 
          font-family="Arial, sans-serif" 
          font-size="${fontSize}" 
          font-weight="bold"
          fill="white" 
          filter="url(#shadow)"
        >
          ${textLines.map((line, index) => 
            `<tspan x="${x}" dy="${index === 0 ? '0' : '1.4em'}">${line}</tspan>`
          ).join('')}
        </text>
      </svg>
    `;

    // Apply the timestamp overlay to the image
    await sharp(inputPath)
      .composite([
        {
          input: Buffer.from(textSvg),
          top: 0,
          left: 0,
        }
      ])
      .jpeg({ quality: 95 }) // High quality to preserve image details
      .toFile(outputPath);

    return { success: true, outputPath };

  } catch (error) {
    console.error('Error adding timestamp to image:', error);
    return { 
      success: false, 
      outputPath: inputPath, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Process uploaded image with timestamp if project has it enabled
 */
export async function processImageWithTimestamp(
  inputPath: string,
  projectId: number,
  gpsLatitude?: number,
  gpsLongitude?: number,
  customText?: string
): Promise<TimestampOverlayResult> {
  try {
    // This function will be called from routes.ts with project settings
    // For now, return success with original path - will be implemented in routes
    return { success: false, outputPath: inputPath };
  } catch (error) {
    return { 
      success: false, 
      outputPath: inputPath, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Generate timestamped filename
 */
export function generateTimestampedFilename(originalFilename: string): string {
  const timestamp = format(new Date(), "yyyyMMdd-HHmmss");
  const ext = path.extname(originalFilename);
  const name = path.basename(originalFilename, ext);
  return `${name}-${timestamp}${ext}`;
}