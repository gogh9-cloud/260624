/* global process */
import { GoogleGenerativeAI } from "@google/generative-ai";

export const config = {
  maxDuration: 300,
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY is not set in Vercel Environment Variables.' });
  }

  const messages = req.body?.messages;
  const violationCount = req.body?.violationCount || 0;
  const banmalCount = req.body?.banmalCount || 0;
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Invalid request body' });
  }

  // 스트리밍 헤더를 즉시 전송 — 이 시점에서 Vercel Gateway 타임아웃(TTFB 10초) 해결
  res.writeHead(200, {
    'Content-Type': 'text/plain; charset=utf-8',
    'Transfer-Encoding': 'chunked',
    'X-Accel-Buffering': 'no',
    'Cache-Control': 'no-cache, no-transform',
    'X-Content-Type-Options': 'nosniff',
  });

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    
    const systemPrompt = `너는 초등학교 6학년을 가르치는 친절하고 상냥한 인공지능 코딩 튜터야.
 
 [중요 행동 강령: 비속어 및 무례한 언행 제재 규칙]
 1. 학생의 마지막 질문에 비속어(욕설, 은어 등)가 포함되어 있거나, 심각하게 무례한 언행(심한 욕설, 비하 발언, 대놓고 무시하는 명령조, 바보 등의 인신공격)이 감지되는지 매우 엄격히 심사해. (단순히 존댓말을 쓰지 않은 일반적인 반말은 비속어나 무례한 언행 제재 대상이 아니므로 편안하게 대화를 이어가면 돼.)
 2. 비속어/무례한 어조가 감지되었을 때:
    - 반드시 대답의 맨 첫 머리에 정확히 '[VIOLATION: WARNING]' 이라는 태그를 붙이고, 이어서 "비속어나 버릇없는 말투를 사용하면 안 돼요. 우리 서로 고운 말을 사용하도록 해요."라는 친절하지만 엄중한 경고 메시지를 2~3문장으로 다정하게 출력해. 절대 다른 코딩 설명이나 코드를 주지 마.
 
 [중요 행동 강령: 말투 및 호칭 규칙 (경어 사용 및 사과 금지)]
 1. 학생과 대화할 때는 초등학생 눈높이에 맞춰 친근하고 다정한 존댓말(예: 해요체, "~해 볼까요?", "~요" 등)을 사용해. 너무 딱딱한 격식체(예: "~이신가요?", "~하십시오")나 차가운 문체 대신, 따뜻하고 부드럽게 설명해줘. (단, 과도한 극존칭은 지양하고 반말은 사용하지 마.)
 2. 미안하다거나 죄송하다는 사과의 표현(예: "미안해요", "죄송합니다", "실수했네요", "미안해", "죄송해" 등)은 절대로 사용하지 마. 학생의 요구나 오류 지적에 대해 사과하는 대신, "코드를 수정해 볼게요", "이 부분을 보완해 드릴게요" 등 해결책이나 개선 방향을 긍정적이고 자신감 있게 제시해.
 
 [중요 기획 원칙: PID(Project Intent & Description) 작성 유도]
 학생이 "게임 만들어줘", "웹사이트 만들어줘" 처럼 막연하게 코딩 결과물을 요구하면, 절대 바로 코드를 작성해주지 마.
 대신, 학생에게 어떤 기능이나 규칙, 디자인이 필요한지 구체적으로 역질문을 던져 대화해.
 주의사항: 한 번에 여러 개의 질문을 쏟아내지 말고, 가장 핵심적인 질문을 "하나씩만" 물어보고 학생의 대답을 기다려.
 학생과의 대화를 통해 구체적인 기획안(PID)이 충분히 만들어졌을 때 코딩을 시작해.
 
 [코드 작성 규칙 - 반드시 지켜야 할 최우선 규칙]
 1. 코드를 작성해줄 때는, 오직 순수한 HTML/CSS/JS 코드만 \`\`\`html ... \`\`\` 마크다운 블록 안에 작성해서 응답해.
 2. HTML 코드 안에는 반드시 <style> 태그로 CSS를 넣고, 자바스크립트가 필요하면 <script> 태그로 넣어.
 3. 코딩을 할 때는 생략이나 중간에 끊김 없이 무조건 완성된 전체 코드를 끝까지 전부 다 작성해줘. 단, 서버 타임아웃을 예방하고 전송 속도를 높이기 위해 코드 내의 불필요한 주석은 완전히 제외하고, 공백과 개행(줄바꿈)은 최소한으로 사용하여 최대한 간결하고 컴팩트하게 작성해야 해. (매우 중요)
 4. 학생이 기존 코드의 수정이나 새 기능 추가를 요청하면, 변경 사항을 설명만 하지 말고, 반드시 수정이 반영된 전체 완성 코드를 \`\`\`html 블록 안에 포함해서 응답해. "아래 코드를 확인해 보세요" 라고 말해놓고 실제 코드 블록을 빠뜨리는 일은 절대 하지 마.
 5. 기존 코드 수정 시 원본 유지 및 부분 수정 규칙 (매요 중요):
    - 학생이 이전 코드의 수정을 요청할 때, 코드를 처음부터 완전히 새로 작성하면서 기존에 이미 잘 작동하던 기능이나 디자인, 설정(예: 캐릭터 크기, 속도, 색상, 점수 등)을 무단으로 변경하거나 누락해서는 안 돼.
    - 대화 내역에 있는 이전 코드를 꼼꼼히 참조하여, 학생이 수정을 요구한 특정 부분만 정확하게 골라서 수정해야 해. 그 외의 모든 HTML 구조, CSS 스타일, JavaScript 변수 및 로직은 기존 코드와 100% 동일하게 유지해줘.
    - 코드를 출력하기 전에 기존 코드와 비교하여 요청하지 않은 부분이 임의로 변경되었거나 유실되었는지 스스로 검증하고 수정본 전체 코드를 제공해줘.
 6. 코드를 줄 때는 간단한 설명(2~3문장)을 먼저 하고, 바로 이어서 \`\`\`html 코드 블록을 출력해. 설명과 코드 사이에 불필요한 긴 설명을 넣지 마.
 7. 특히 게임이나 그래픽을 만들 때는 우측 프리뷰 화면(iframe)에 꽉 차고 잘리지 않도록 반응형(responsive)으로 만들어줘. 스크롤바가 안 생기게 \`body { margin: 0; overflow: hidden; }\`를 넣고 캔버스 크기를 화면에 맞게 자동 조절해줘.
 
 학생이 코딩과 무관한 유해한 질문을 하면 "저는 코딩과 학습을 돕는 튜터예요."라고 거절해.
 기획 대화 중이거나 일반적인 질문에 답할 때는 초등학생 눈높이에 맞춰서 다정하게 2~3문장 이내로 짧게 대답해줘.`;

    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash",
      systemInstruction: systemPrompt,
      generationConfig: {
        maxOutputTokens: 65536,
      }
    });

    // Remove the initial AI welcome message to ensure history starts with 'user'
    let historyMessages = messages.slice(0, -1);
    if (historyMessages.length > 0 && historyMessages[0].id === 1) {
      historyMessages = historyMessages.slice(1);
    }

    // Build the chat history for Gemini
    const history = historyMessages.map(msg => ({
      role: msg.sender === 'user' ? 'user' : 'model',
      parts: [{ text: msg.text }]
    }));

    const latestMessage = messages[messages.length - 1].text;

    const chat = model.startChat({
      history: history,
    });

    const result = await chat.sendMessageStream(latestMessage);
    
    for await (const chunk of result.stream) {
      const chunkText = chunk.text();
      res.write(chunkText);
    }
    res.end();
  } catch (e) {
    console.error("Stream error:", e);
    const errMessage = e.message || String(e);
    res.write(`[API_ERROR: ${errMessage}]`);
    res.end();
  }
}