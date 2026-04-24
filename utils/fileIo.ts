// =============================================================================
// File I/O helpers: write-and-share text files, and pick a text file to read.
// Thin wrapper over expo-file-system + expo-sharing + expo-document-picker.
// =============================================================================

import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import * as DocumentPicker from "expo-document-picker";

function inferMimeType(filename: string): string {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".json")) return "application/json";
  if (lower.endsWith(".csv")) return "text/csv";
  return "text/plain";
}

/**
 * Write `content` to a file in the cache directory with the given filename,
 * then open the native share sheet. Returns true on success, false if sharing
 * is unavailable on this device.
 */
export async function shareText(
  filename: string,
  content: string,
  mimeType?: string,
): Promise<boolean> {
  const resolvedMime = mimeType ?? inferMimeType(filename);
  const cacheDir = FileSystem.cacheDirectory;
  if (!cacheDir) {
    throw new Error("Cache directory unavailable on this device.");
  }

  const uri = cacheDir + filename;
  await FileSystem.writeAsStringAsync(uri, content, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  if (!(await Sharing.isAvailableAsync())) {
    return false;
  }

  await Sharing.shareAsync(uri, {
    mimeType: resolvedMime,
    UTI: resolvedMime === "application/json" ? "public.json" : undefined,
    dialogTitle: filename,
  });

  return true;
}

/**
 * Open the native document picker and return the parsed text content of the
 * chosen file. Returns null if the user cancels. Throws if the file can't be
 * read. Accepts .csv / .txt by default.
 */
export async function pickTextFile(): Promise<string | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ["text/csv", "text/plain"],
    copyToCacheDirectory: true,
    multiple: false,
  });

  // Handle both SDK 52+ shape and any legacy "cancel" shape.
  const anyResult = result as unknown as {
    canceled?: boolean;
    type?: string;
    assets?: Array<{ uri: string }> | null;
    uri?: string;
  };

  if (anyResult.canceled === true || anyResult.type === "cancel") {
    return null;
  }

  const uri =
    anyResult.assets && anyResult.assets.length > 0
      ? anyResult.assets[0].uri
      : anyResult.uri;

  if (!uri) {
    return null;
  }

  const content = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  return content;
}
