/**
 * Helper to enable gzip or deflate response compression in Supabase Edge Functions (Deno).
 * Automatically negotiates compression format with the client via the `Accept-Encoding` header.
 * Avoids double compression and checks payload size thresholds.
 */
export async function withCompression(req: Request, res: Response): Promise<Response> {
  try {
    // 1. Negotiate encoding format
    const acceptEncoding = req.headers.get('accept-encoding') || '';
    let compressionFormat: 'gzip' | 'deflate' | null = null;
    
    if (acceptEncoding.includes('gzip')) {
      compressionFormat = 'gzip';
    } else if (acceptEncoding.includes('deflate')) {
      compressionFormat = 'deflate';
    }

    if (!compressionFormat) {
      return res;
    }

    // 2. Avoid double compression (check if already encoded)
    if (res.headers.has('Content-Encoding')) {
      return res;
    }

    // 3. Only compress JSON, text, and other compressible types
    const contentType = res.headers.get('Content-Type') || '';
    const isCompressible = 
      contentType.includes('application/json') ||
      contentType.includes('text/') ||
      contentType.includes('application/javascript') ||
      contentType.includes('application/xml') ||
      contentType.includes('image/svg+xml');

    if (!isCompressible) {
      return res;
    }

    // 4. Ensure there is a body to compress
    if (!res.body) {
      return res;
    }

    // 5. Read body to verify size threshold (e.g., >= 1024 bytes)
    // Clone or consume body to inspect size.
    // If the body is large, we compress it.
    const bodyBytes = new Uint8Array(await res.arrayBuffer());
    const THRESHOLD = 1024; // 1 KB

    if (bodyBytes.byteLength < THRESHOLD) {
      // Return a new response with original bytes to avoid consuming the original body stream
      return new Response(bodyBytes, {
        status: res.status,
        statusText: res.statusText,
        headers: res.headers,
      });
    }

    // 6. Compress the bytes using CompressionStream
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(bodyBytes);
        controller.close();
      }
    });

    // CompressionStream is supported natively in Deno
    const compressedStream = stream.pipeThrough(new CompressionStream(compressionFormat));

    // 7. Clone and update headers
    const headers = new Headers(res.headers);
    headers.set('Content-Encoding', compressionFormat);
    headers.delete('Content-Length'); // Content-length changes after compression
    
    // Vary header signals to CDN/caches that client Accept-Encoding matters
    const existingVary = headers.get('Vary');
    if (existingVary) {
      if (!existingVary.includes('Accept-Encoding')) {
        headers.set('Vary', `${existingVary}, Accept-Encoding`);
      }
    } else {
      headers.set('Vary', 'Accept-Encoding');
    }

    return new Response(compressedStream, {
      status: res.status,
      statusText: res.statusText,
      headers,
    });
  } catch (err) {
    console.error('[Compression Error]', err);
    // Fallback to original response on any error to prevent API failure
    return res;
  }
}
