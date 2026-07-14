import { NextResponse } from "next/server";

const spec = {
  openapi: "3.0.3",
  info: {
    title: "STLC 찬양 선곡 도우미 API",
    description: "AI 기반 찬양 추천, 곡 데이터베이스(RAG), 셋리스트 관리 API",
    version: "1.0.0",
  },
  servers: [
    { url: "/", description: "Current server" },
  ],
  paths: {
    "/api/recommend": {
      post: {
        tags: ["AI 추천"],
        summary: "찬양곡 추천",
        description: "예배 주제/절기/분위기를 입력하면 AI가 찬양곡을 추천합니다. RAG 데이터베이스에 등록된 곡을 우선 참고합니다.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["prompt", "songCount"],
                properties: {
                  prompt: {
                    type: "string",
                    description: "예배 주제, 절기, 분위기 등 요청 내용",
                    example: "부활절 예배에 맞는 밝고 감사한 분위기의 찬양",
                  },
                  songCount: {
                    type: "integer",
                    minimum: 3,
                    maximum: 8,
                    description: "추천받을 곡 수",
                    example: 5,
                  },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "추천 곡 목록",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    songs: {
                      type: "array",
                      items: { $ref: "#/components/schemas/Song" },
                    },
                  },
                },
              },
            },
          },
          "400": { description: "잘못된 요청 (prompt 또는 songCount 누락)" },
          "429": { description: "요청 빈도 초과" },
          "500": { description: "서버 오류" },
        },
      },
    },
    "/api/chat": {
      post: {
        tags: ["AI 추천"],
        summary: "채팅 기반 곡 교체/추천/대화",
        description: "현재 선곡 목록을 기반으로 곡 교체, 새 추천, 일반 대화를 처리합니다.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["currentSongs", "message"],
                properties: {
                  currentSongs: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string" },
                        composer: { type: "string" },
                      },
                    },
                    description: "현재 선곡 목록",
                  },
                  message: {
                    type: "string",
                    description: "사용자 메시지",
                    example: "2번 곡을 좀 더 빠른 템포의 곡으로 교체해줘",
                  },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "AI 응답",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ChatResponse" },
              },
            },
          },
          "400": { description: "잘못된 요청" },
          "429": { description: "요청 빈도 초과" },
          "500": { description: "서버 오류" },
        },
      },
    },
    "/api/songs": {
      get: {
        tags: ["곡 데이터베이스 (RAG)"],
        summary: "등록된 곡 목록 조회",
        description: "RAG 데이터베이스에 등록된 모든 곡을 조회합니다.",
        responses: {
          "200": {
            description: "곡 목록",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    songs: {
                      type: "array",
                      items: { $ref: "#/components/schemas/SongKnowledge" },
                    },
                  },
                },
              },
            },
          },
          "500": { description: "서버 오류" },
        },
      },
      post: {
        tags: ["곡 데이터베이스 (RAG)"],
        summary: "곡 등록",
        description: "새 곡을 RAG 데이터베이스에 등록합니다. 자동으로 임베딩이 생성됩니다. 단일 객체 또는 배열로 여러 곡을 한번에 등록할 수 있습니다.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                oneOf: [
                  { $ref: "#/components/schemas/SongKnowledgeInput" },
                  {
                    type: "array",
                    items: { $ref: "#/components/schemas/SongKnowledgeInput" },
                  },
                ],
              },
              examples: {
                single: {
                  summary: "단일 곡 등록",
                  value: {
                    title: "주님은 좋은 분",
                    composer: "이영훈",
                    key: "G",
                    bpm: 75,
                    tempo: "느리게",
                    styles: ["워십", "발라드"],
                    themes: ["감사", "고백"],
                    seasons: ["일반"],
                    notes: "잔잔한 워십곡. 예배 시작에 적합.",
                  },
                },
                batch: {
                  summary: "여러 곡 등록",
                  value: [
                    { title: "곡 A", composer: "작곡가 A", key: "C", styles: ["워십"] },
                    { title: "곡 B", composer: "작곡가 B", key: "D", styles: ["CCM"] },
                  ],
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "등록 결과",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    added: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          id: { type: "string", format: "uuid" },
                          title: { type: "string" },
                        },
                      },
                    },
                    errors: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          title: { type: "string" },
                          error: { type: "string" },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          "400": { description: "title 또는 composer 누락" },
        },
      },
      delete: {
        tags: ["곡 데이터베이스 (RAG)"],
        summary: "곡 삭제",
        description: "RAG 데이터베이스에서 곡을 삭제합니다.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["id"],
                properties: {
                  id: {
                    type: "string",
                    format: "uuid",
                    description: "삭제할 곡의 ID",
                  },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "삭제 완료" },
          "400": { description: "id 누락" },
          "500": { description: "서버 오류" },
        },
      },
    },
    "/api/setlist": {
      post: {
        tags: ["셋리스트"],
        summary: "셋리스트 저장",
        description: "확정된 셋리스트를 Supabase에 저장하고 공유 URL용 ID를 반환합니다.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["prompt", "songs"],
                properties: {
                  prompt: { type: "string", description: "원래 요청 프롬프트" },
                  songs: {
                    type: "array",
                    items: { $ref: "#/components/schemas/Song" },
                  },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "저장 완료",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    id: { type: "string", description: "공유 URL용 셋리스트 ID" },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
  components: {
    schemas: {
      Song: {
        type: "object",
        properties: {
          id: { type: "string" },
          title: { type: "string", example: "주님은 좋은 분" },
          composer: { type: "string", example: "이영훈" },
          key: { type: "string", example: "G" },
          bpm: { type: "number", example: 75 },
          tempo: { type: "string", enum: ["느리게", "보통", "빠르게"] },
          styles: { type: "array", items: { type: "string" }, example: ["워십", "발라드"] },
          reason: { type: "string", example: "잔잔한 워십곡으로 예배 시작에 적합합니다." },
        },
      },
      ChatResponse: {
        type: "object",
        properties: {
          action: { type: "string", enum: ["swap", "recommend", "chat"], description: "응답 유형" },
          message: { type: "string", description: "사용자에게 보여줄 메시지" },
          swapIndex: { type: "integer", description: "swap 시 교체할 곡 인덱스 (0-based)" },
          newSong: { $ref: "#/components/schemas/Song", description: "swap 시 교체곡" },
          newSongs: { type: "array", items: { $ref: "#/components/schemas/Song" }, description: "recommend 시 새 곡 목록" },
        },
      },
      SongKnowledge: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          title: { type: "string" },
          composer: { type: "string" },
          key: { type: "string" },
          bpm: { type: "integer" },
          tempo: { type: "string", enum: ["느리게", "보통", "빠르게"] },
          styles: { type: "array", items: { type: "string" } },
          themes: { type: "array", items: { type: "string" } },
          seasons: { type: "array", items: { type: "string" } },
          notes: { type: "string" },
          created_at: { type: "string", format: "date-time" },
        },
      },
      SongKnowledgeInput: {
        type: "object",
        required: ["title", "composer"],
        properties: {
          title: { type: "string", description: "곡 제목" },
          composer: { type: "string", description: "작곡가/아티스트" },
          key: { type: "string", description: "연주 키 (예: G, Bb)" },
          bpm: { type: "integer", description: "BPM" },
          tempo: { type: "string", enum: ["느리게", "보통", "빠르게"] },
          styles: { type: "array", items: { type: "string" }, description: "장르 태그 (워십, CCM, 찬송가 등)" },
          themes: { type: "array", items: { type: "string" }, description: "주제 태그 (감사, 찬양, 위로 등)" },
          seasons: { type: "array", items: { type: "string" }, description: "절기 태그 (부활절, 성탄절 등)" },
          notes: { type: "string", description: "추가 메모 (언제 부르면 좋은지, 팀 내부 노하우 등)" },
        },
      },
    },
  },
};

export async function GET() {
  return NextResponse.json(spec);
}
