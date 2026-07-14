/**
 * 찬양 곡 시드 데이터 등록 스크립트
 *
 * 사용법:
 *   npx tsx --env-file=.env.local scripts/seed-songs.ts
 *
 * 필요 환경변수:
 *   GEMINI_API_KEY, NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY
 */

import { addSong, type SongKnowledge } from "../src/lib/rag";

const SEED_SONGS: SongKnowledge[] = [
  {
    title: "주님은 좋은 분",
    composer: "이영훈",
    key: "G",
    bpm: 75,
    tempo: "느리게",
    styles: ["워십", "발라드"],
    themes: ["감사", "고백", "은혜"],
    seasons: ["일반"],
    notes: "잔잔한 워십곡. 예배 시작이나 기도 시간에 적합. 한국 교회에서 매우 널리 불리는 곡.",
  },
  {
    title: "감사해",
    composer: "돈 모엔 (Don Moen)",
    key: "D",
    bpm: 130,
    tempo: "빠르게",
    styles: ["워십", "팝"],
    themes: ["감사", "기쁨", "찬양"],
    seasons: ["추수감사절", "일반"],
    notes: "밝고 경쾌한 감사 찬양. 업템포로 예배 분위기를 고조시킬 때 좋음.",
  },
  {
    title: "여호와는 나의 목자시니",
    composer: "마커스워십",
    key: "A",
    bpm: 68,
    tempo: "느리게",
    styles: ["워십"],
    themes: ["위로", "신뢰", "고백"],
    seasons: ["일반"],
    notes: "시편 23편 기반. 위로와 안식이 필요한 예배에 적합.",
  },
  {
    title: "주 품에 품으소서",
    composer: "워십 (전통 찬양)",
    key: "Bb",
    bpm: 65,
    tempo: "느리게",
    styles: ["워십", "발라드"],
    themes: ["간구", "위로", "은혜"],
    seasons: ["사순절", "일반"],
    notes: "깊은 간구와 헌신의 곡. 기도회나 새벽예배에 자주 사용.",
  },
  {
    title: "이 땅에 오셔서",
    composer: "소원 (Sowon)",
    key: "E",
    bpm: 72,
    tempo: "느리게",
    styles: ["워십", "CCM"],
    themes: ["경배", "성육신", "감사"],
    seasons: ["성탄절", "일반"],
    notes: "성탄절 워십곡이지만 평소 예배에서도 경배곡으로 사용 가능.",
  },
  {
    title: "살아 계신 주",
    composer: "제이어스 (J-US)",
    key: "G",
    bpm: 140,
    tempo: "빠르게",
    styles: ["워십", "록"],
    themes: ["찬양", "선포", "기쁨"],
    seasons: ["부활절", "일반"],
    notes: "강렬한 선포적 찬양. 부활절이나 활기찬 예배에 적합.",
  },
  {
    title: "나 같은 죄인 살리신 (Amazing Grace)",
    composer: "존 뉴턴 (John Newton)",
    key: "G",
    bpm: 80,
    tempo: "보통",
    styles: ["찬송가", "가스펠"],
    themes: ["은혜", "고백", "감사"],
    seasons: ["사순절", "일반"],
    notes: "전 세계적으로 사랑받는 찬송가. 은혜와 구원을 주제로 한 예배에 필수.",
  },
  {
    title: "소리쳐 찬양해",
    composer: "힐송 (Hillsong) / 한국어 번안",
    key: "A",
    bpm: 150,
    tempo: "빠르게",
    styles: ["워십", "팝", "록"],
    themes: ["찬양", "기쁨", "경배"],
    seasons: ["일반"],
    notes: "Hillsong 'Shout to the Lord' 한국어 버전. 강력한 찬양으로 예배를 여는 데 적합.",
  },
  {
    title: "주의 사랑이 나를",
    composer: "더워십 (The Worship)",
    key: "C",
    bpm: 70,
    tempo: "느리게",
    styles: ["워십", "발라드"],
    themes: ["사랑", "은혜", "위로"],
    seasons: ["일반"],
    notes: "하나님의 사랑을 고백하는 잔잔한 워십곡. 중보 기도 시간에 좋음.",
  },
  {
    title: "예수 우리 왕이여",
    composer: "마커스워십",
    key: "E",
    bpm: 128,
    tempo: "빠르게",
    styles: ["워십", "팝"],
    themes: ["경배", "찬양", "선포"],
    seasons: ["일반"],
    notes: "예수님의 왕 되심을 선포하는 파워풀한 워십곡.",
  },
  {
    title: "은혜 (Grace)",
    composer: "박주원",
    key: "F",
    bpm: 66,
    tempo: "느리게",
    styles: ["CCM", "발라드"],
    themes: ["은혜", "감사", "고백"],
    seasons: ["일반"],
    notes: "깊은 감사와 은혜를 고백하는 CCM. 간증이나 헌금 시간에 어울림.",
  },
  {
    title: "주를 높이며",
    composer: "어노인팅 (Anointing)",
    key: "D",
    bpm: 90,
    tempo: "보통",
    styles: ["워십"],
    themes: ["경배", "찬양"],
    seasons: ["일반"],
    notes: "안정적인 템포의 경배곡. 예배 중반 전환 시 좋은 곡.",
  },
  {
    title: "물 위를 걸으며",
    composer: "힐송 (Hillsong)",
    key: "Bb",
    bpm: 70,
    tempo: "느리게",
    styles: ["워십"],
    themes: ["신뢰", "도전", "믿음"],
    seasons: ["일반"],
    notes: "'Oceans' 한국어 버전. 믿음의 도전과 응답에 대한 예배에 적합.",
  },
  {
    title: "주 하나님 지으신 모든 세계 (How Great Thou Art)",
    composer: "찬송가 79장",
    key: "Bb",
    bpm: 96,
    tempo: "보통",
    styles: ["찬송가"],
    themes: ["경배", "창조", "찬양"],
    seasons: ["추수감사절", "일반"],
    notes: "장엄한 경배 찬송가. 창조주 하나님을 찬양하는 예배에 필수.",
  },
  {
    title: "내 영혼의 그윽히 깊은 데서",
    composer: "찬송가 370장",
    key: "F",
    bpm: 72,
    tempo: "느리게",
    styles: ["찬송가"],
    themes: ["평화", "위로", "안식"],
    seasons: ["일반"],
    notes: "'It Is Well With My Soul'. 환란 중 평안을 노래하는 찬송가.",
  },
  {
    title: "위대하신 주",
    composer: "어노인팅 (Anointing)",
    key: "C",
    bpm: 132,
    tempo: "빠르게",
    styles: ["워십", "록"],
    themes: ["경배", "찬양", "선포"],
    seasons: ["일반"],
    notes: "폭발적인 에너지의 찬양곡. 집회나 부흥회 분위기에 적합.",
  },
  {
    title: "나의 모든 삶의 이유",
    composer: "더워십 (The Worship)",
    key: "G",
    bpm: 74,
    tempo: "느리게",
    styles: ["워십", "발라드"],
    themes: ["헌신", "고백", "사랑"],
    seasons: ["일반"],
    notes: "삶의 헌신을 고백하는 깊은 워십곡. 봉헌 시간에 어울림.",
  },
  {
    title: "전능하신 하나님",
    composer: "제이어스 (J-US)",
    key: "F",
    bpm: 85,
    tempo: "보통",
    styles: ["워십"],
    themes: ["경배", "전능", "찬양"],
    seasons: ["일반"],
    notes: "하나님의 전능하심을 선포. 보통 템포로 경배 분위기를 이끌 때 좋음.",
  },
  {
    title: "나 무엇과도 주님을",
    composer: "워터마크 (Watermark)",
    key: "D",
    bpm: 68,
    tempo: "느리게",
    styles: ["워십", "CCM"],
    themes: ["헌신", "사랑", "고백"],
    seasons: ["일반"],
    notes: "주님에 대한 절대적 헌신을 고백. 결단 시간이나 성찬식에 적합.",
  },
  {
    title: "우리 다시 이 자리에",
    composer: "유진 박",
    key: "E",
    bpm: 78,
    tempo: "보통",
    styles: ["워십", "CCM"],
    themes: ["공동체", "하나됨", "기도"],
    seasons: ["일반"],
    notes: "공동체의 하나됨을 노래하는 곡. 수련회, 연합예배, 환영회에 좋음.",
  },
];

async function seed() {
  console.log(`시드 데이터 등록 시작: ${SEED_SONGS.length}곡\n`);

  let success = 0;
  let fail = 0;

  for (const song of SEED_SONGS) {
    try {
      const result = await addSong(song);
      console.log(`  ✓ "${song.title}" (${result.id})`);
      success++;
    } catch (e: unknown) {
      console.error(`  ✗ "${song.title}": ${(e as Error).message}`);
      fail++;
    }
  }

  console.log(`\n완료: 성공 ${success}건, 실패 ${fail}건`);
}

seed();
