export async function readSseTextWithStatus(
  response: Response,
  onChunk?: (chunk: string, fullText: string) => void,
): Promise<{ fullText: string; completed: boolean }> {
  if (!response.body) return { fullText: "", completed: false };

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let fullText = "";
  let doneSignal = false;

  const handleLine = (rawLine: string): boolean => {
    let line = rawLine;
    if (line.endsWith("\r")) line = line.slice(0, -1);
    if (!line.startsWith("data: ")) return true;

    const jsonText = line.slice(6).trim();
    if (!jsonText) return true;
    if (jsonText === "[DONE]") {
      doneSignal = true;
      return true;
    }

    let parsed: any;
    try {
      parsed = JSON.parse(jsonText);
    } catch {
      return false;
    }

    const chunk = parsed?.choices?.[0]?.delta?.content;
    if (typeof chunk !== "string" || chunk.length === 0) return true;

    fullText += chunk;
    onChunk?.(chunk, fullText);
    return true;
  };

  try {
    while (!doneSignal) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      let idx: number;
      while ((idx = buffer.indexOf("\n")) !== -1) {
        const line = buffer.slice(0, idx);
        buffer = buffer.slice(idx + 1);
        const ok = handleLine(line);
        if (!ok) {
          buffer = line + "\n" + buffer;
          break;
        }
        if (doneSignal) break;
      }
    }

    buffer += decoder.decode();
    if (buffer.trim().length > 0) {
      const trailingLines = buffer.split("\n").filter((line) => line.trim().length > 0);
      for (const line of trailingLines) {
        if (!handleLine(line)) break;
        if (doneSignal) break;
      }
    }

    return { fullText, completed: doneSignal };
  } finally {
    reader.releaseLock();
  }
}

export async function readSseText(
  response: Response,
  onChunk?: (chunk: string, fullText: string) => void,
): Promise<string> {
  const { fullText, completed } = await readSseTextWithStatus(response, onChunk);
  if (!completed) {
    throw new Error("Incomplete SSE stream (missing [DONE])");
  }
  return fullText;
}
