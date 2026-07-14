import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

const MODELS = ["gemini-3.5-flash", "gemini-3.1-flash-lite"] as const;

async function callWithFallback(
  config: { contents: string; config: Record<string, unknown> }
) {
  for (const model of MODELS) {
    try {
      const response = await ai.models.generateContent({ model, ...config });
      return response;
    } catch (e: unknown) {
      const status = (e as { status?: number }).status;
      if (status === 503 || status === 429) continue;
      throw e;
    }
  }
  throw new Error("All models unavailable");
}

export const SONG_SCHEMA = {
  type: "object" as const,
  properties: {
    songs: {
      type: "array" as const,
      items: {
        type: "object" as const,
        properties: {
          title: { type: "string" as const },
          composer: { type: "string" as const },
          key: { type: "string" as const },
          bpm: { type: "number" as const },
          tempo: { type: "string" as const, enum: ["느리게", "보통", "빠르게"] },
          styles: { type: "array" as const, items: { type: "string" as const } },
          reason: { type: "string" as const },
        },
        required: ["title", "composer", "key", "bpm", "tempo", "styles", "reason"],
      },
    },
  },
  required: ["songs"],
};

const SYSTEM_PROMPT = `당신은 한국 기독교 찬양팀의 선곡을 도와주는 전문 AI 도우미입니다.

역할:
- 예배 주제, 절기, 분위기, 템포 등 사용자의 요구에 맞는 찬양곡을 추천합니다
- 한국 교회에서 자주 부르는 찬양, CCM, 찬송가, 워십곡을 폭넓게 알고 있습니다
- 각 곡의 키, BPM, 분위기, 선정 이유를 구체적으로 설명합니다

주의사항:
- 실제로 존재하는 곡만 추천하세요
- BPM은 실제 곡의 일반적인 연주 속도를 기준으로 합니다
- 키는 가장 흔하게 연주되는 키를 추천합니다
- styles 배열에는 "워십", "CCM", "찬송가", "발라드", "록", "팝", "가스펠" 등 장르와 "감사", "찬양", "고백", "간구", "기쁨", "경배", "은혜", "위로" 등 주제 태그를 포함합니다
- [참고 곡 데이터베이스]가 제공된 경우, 해당 곡들을 우선적으로 고려하세요. 곡의 메모/참고 정보가 있다면 추천 이유에 반영하세요. 데이터베이스에 적절한 곡이 없으면 다른 곡도 자유롭게 추천할 수 있습니다.`;

export async function recommendSongs(prompt: string, songCount: number, ragContext = "") {
  const response = await callWithFallback({
    contents: `${prompt}\n\n정확히 ${songCount}곡을 추천해주세요.${ragContext}`,
    config: {
      systemInstruction: SYSTEM_PROMPT,
      responseMimeType: "application/json",
      responseSchema: SONG_SCHEMA,
      temperature: 0.7,
    },
  });

  const text = response.text ?? "";
  return JSON.parse(text);
}

export async function swapSong(
  currentSongs: { title: string; composer: string }[],
  swapIndex: number,
  userRequest: string
) {
  const songList = currentSongs
    .map((s, i) => `${i + 1}. ${s.title} (${s.composer})`)
    .join("\n");

  const swapPrompt = `현재 선곡 목록:
${songList}

사용자 요청: ${swapIndex + 1}번 곡 "${currentSongs[swapIndex].title}"을 교체해주세요.
${userRequest ? `추가 요청: ${userRequest}` : ""}

교체할 1곡만 추천해주세요. 기존 목록에 있는 곡은 제외하세요.`;

  const response = await callWithFallback({
    contents: swapPrompt,
    config: {
      systemInstruction: SYSTEM_PROMPT,
      responseMimeType: "application/json",
      responseSchema: {
        type: "object" as const,
        properties: {
          songs: {
            type: "array" as const,
            items: SONG_SCHEMA.properties.songs.items,
            minItems: 1,
            maxItems: 1,
          },
        },
        required: ["songs"],
      },
      temperature: 0.8,
    },
  });

  const text = response.text ?? "";
  const parsed = JSON.parse(text);
  return parsed.songs[0];
}

export async function chatSwap(
  currentSongs: { title: string; composer: string }[],
  userMessage: string,
  ragContext = ""
) {
  const songList = currentSongs
    .map((s, i) => `${i + 1}. ${s.title} (${s.composer})`)
    .join("\n");

  const chatPrompt = `현재 선곡 목록:
${songList}

사용자 메시지: "${userMessage}"

아래 규칙에 따라 응답하세요:
1. 특정 곡 교체 요청인 경우: action을 "swap"으로, swapIndex에 교체할 곡 번호(0-indexed), newSong에 교체곡 정보를 넣으세요.
2. 새로운 곡 추천 요청인 경우: action을 "recommend"로, newSongs 배열에 추천곡들을 넣으세요.
3. 일반 대화인 경우: action을 "chat"으로 설정하세요.
message에는 항상 사용자에게 보여줄 간단한 안내 메시지를 작성하세요.${ragContext}`;

  const songItemSchema = SONG_SCHEMA.properties.songs.items;

  const response = await callWithFallback({
    contents: chatPrompt,
    config: {
      systemInstruction: SYSTEM_PROMPT,
      responseMimeType: "application/json",
      responseSchema: {
        type: "object" as const,
        properties: {
          action: { type: "string" as const, enum: ["swap", "recommend", "chat"] },
          message: { type: "string" as const },
          swapIndex: { type: "number" as const },
          newSong: {
            type: "object" as const,
            properties: songItemSchema.properties,
            required: songItemSchema.required,
          },
          newSongs: {
            type: "array" as const,
            items: songItemSchema,
          },
        },
        required: ["action", "message"],
      },
      temperature: 0.7,
    },
  });

  const text = response.text ?? "";
  return JSON.parse(text);
}

export async function generateTitle(userMessage: string): Promise<string> {
  try {
    const response = await callWithFallback({
      contents: `찬양 추천 대화의 제목을 만들어주세요.

규칙:
- 5~20자 한국어 제목
- 곡 이름이 있으면 반드시 포함
- 요청의 핵심(템포, 분위기, 절기 등)을 반영
- 제목만 출력 (따옴표, 마침표, 설명 없이)

예시:
요청: "부활절 예배에 맞는 밝은 찬양 3곡 추천해줘"
제목: 부활절 밝은 찬양 추천

요청: "손을 들고 주를 찬양이랑 복음들고 산을 넘는 자들의 발길 이렇게 2곡은 정했어 근데 여기에 느린곡 3개를 추가하고 싶어"
제목: 느린곡 3곡 추가 추천

요청: "주일 저녁예배용 잔잔한 워십곡 5곡"
제목: 저녁예배 잔잔한 워십곡

요청: "${userMessage}"
제목:`,
      config: {
        temperature: 0.2,
        maxOutputTokens: 40,
      },
    });
    const title = (response.text ?? "")
      .trim()
      .replace(/^제목:\s*/i, "")
      .replace(/["""'']/g, "");
    return title.length >= 4 && title.length <= 30 ? title : "";
  } catch {
    return "";
  }
}
