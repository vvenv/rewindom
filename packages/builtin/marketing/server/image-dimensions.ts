/**
 * 从图片文件头读出像素尺寸。
 *
 * 只读头部几十个字节，不解码像素——媒体库要的是「这张图多大」，不是图像处理。
 * 为此引一个原生依赖（sharp）不划算：它会把 Docker 镜像和构建时间都拖上一截，
 * 而这里唯一的用途是在选图器里显示一行 `1200 × 630`、以及提醒分享图尺寸不合适。
 *
 * 认不出来就返回 `null`（如 SVG——矢量图本就没有固有像素尺寸），调用方存 0。
 */
export interface ImageDimensions {
  width: number;
  height: number;
}

export function readImageDimensions(buffer: Buffer): ImageDimensions | null {
  return (
    readPng(buffer) ?? readGif(buffer) ?? readWebp(buffer) ?? readJpeg(buffer)
  );
}

function readPng(buffer: Buffer): ImageDimensions | null {
  // 8 字节签名 + 4 长度 + "IHDR" + width/height 各 4 字节
  if (buffer.length < 24) return null;
  if (buffer.readUInt32BE(0) !== 0x89504e47) return null;
  if (buffer.toString("ascii", 12, 16) !== "IHDR") return null;
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

function readGif(buffer: Buffer): ImageDimensions | null {
  if (buffer.length < 10) return null;
  if (buffer.toString("ascii", 0, 3) !== "GIF") return null;
  return { width: buffer.readUInt16LE(6), height: buffer.readUInt16LE(8) };
}

function readWebp(buffer: Buffer): ImageDimensions | null {
  if (buffer.length < 30) return null;
  if (buffer.toString("ascii", 0, 4) !== "RIFF") return null;
  if (buffer.toString("ascii", 8, 12) !== "WEBP") return null;

  const format = buffer.toString("ascii", 12, 16);
  // 有损：VP8 关键帧头里宽高各 14 位
  if (format === "VP8 ") {
    return {
      width: buffer.readUInt16LE(26) & 0x3fff,
      height: buffer.readUInt16LE(28) & 0x3fff,
    };
  }
  // 无损：14 位宽高紧挨着打包在 4 字节里
  if (format === "VP8L") {
    const bits = buffer.readUInt32LE(21);
    return {
      width: (bits & 0x3fff) + 1,
      height: ((bits >> 14) & 0x3fff) + 1,
    };
  }
  // 扩展格式：24 位「减一」的宽高
  if (format === "VP8X") {
    return {
      width: (buffer.readUIntLE(24, 3) & 0xffffff) + 1,
      height: (buffer.readUIntLE(27, 3) & 0xffffff) + 1,
    };
  }
  return null;
}

/**
 * JPEG 得顺着 segment 链走到 SOFn 才有宽高——它不像 PNG 那样固定在头部。
 *
 * 跳过 SOF0–SOF15 里的 DHT/DRI 等非 SOF 段；遇到 SOS（图像数据开始）就放弃，
 * 那之后不会再有尺寸信息，继续扫等于把整个文件读一遍。
 */
function readJpeg(buffer: Buffer): ImageDimensions | null {
  if (buffer.length < 4 || buffer.readUInt16BE(0) !== 0xffd8) return null;

  let offset = 2;
  while (offset + 9 < buffer.length) {
    if (buffer[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    const marker = buffer[offset + 1]!;
    // SOS：后面是压缩数据，不再有段头
    if (marker === 0xda) return null;
    const length = buffer.readUInt16BE(offset + 2);
    const isSof =
      marker >= 0xc0 &&
      marker <= 0xcf &&
      // C4=DHT、C8=JPG、CC=DAC 挤在同一段区间里，但不是 SOF
      marker !== 0xc4 &&
      marker !== 0xc8 &&
      marker !== 0xcc;
    if (isSof) {
      return {
        height: buffer.readUInt16BE(offset + 5),
        width: buffer.readUInt16BE(offset + 7),
      };
    }
    offset += 2 + length;
  }
  return null;
}
