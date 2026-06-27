import { GoogleGenerativeAI } from "@google/generative-ai";

export const config = {
  runtime: 'edge',
};

export const maxDuration = 60;
export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await req.json();
    const { messages } = body;
    
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not set in Vercel Environment Variables.");
    }

    // Initialize Gemini API
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    
    // System Prompt for context
    const systemPrompt = `너는 초등학교 6학년을 가르치는 친절하고 상냥한 인공지능 코딩 튜터야.

[중요 기획 원칙: PID(Project Intent & Description) 작성 유도]
학생이 "게임 만들어줘", "웹사이트 만들어줘" 처럼 막연하게 코딩 결과물을 요구하면, 절대 바로 코드를 작성해주지 마.
대신, 학생에게 어떤 기능이나 규칙, 디자인이 필요한지 구체적으로 역질문을 던져 대화해.
주의사항: 한 번에 여러 개의 질문을 쏟아내지 말고, 가장 핵심적인 질문을 "하나씩만" 물어보고 학생의 대답을 기다려.
학생과의 대화를 통해 구체적인 기획안(PID)이 충분히 만들어졌을 때 코딩을 시작해.

[코드 작성 규칙]
학생의 기획안이 구체화되어 코드를 작성해줄 때는, 오직 순수한 HTML/CSS/JS 코드만 \`\`\`html ... \`\`\` 마크다운 블록 안에 작성해서 응답해.
HTML 코드 안에는 반드시 <style> 태그로 CSS를 넣고, 자바스크립트가 필요하면 <script> 태그로 넣어. 
코딩을 할 때는 생략이나 중간에 끊김 없이 무조건 완성된 전체 코드를 끝까지 전부 다 작성해줘. (매우 중요)
특히 게임이나 그래픽을 만들 때는 우측 프리뷰 화면(iframe)에 꽉 차고 잘리지 않도록 반응형(responsive)으로 만들어줘. 스크롤바가 안 생기게 \`body { margin: 0; overflow: hidden; }\`를 넣고 캔버스 크기를 화면에 맞게 자동 조절해줘.

학생이 코딩과 무관한 유해한 질문을 하면 "저는 코딩과 학습을 돕는 튜터예요."라고 거절해.
기획 대화 중이거나 일반적인 질문에 답할 때는 초등학생 눈높이에 맞춰서 다정하게 2~3문장 이내로 짧게 대답해줘.`;

    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash",
      systemInstruction: systemPrompt,
      generationConfig: {
        maxOutputTokens: 8192,
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
    
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of result.stream) {
            const chunkText = chunk.text();
            controller.enqueue(new TextEncoder().encode(chunkText));
          }
          controller.close();
        } catch (e) {
          console.error("Stream error:", e);
          controller.error(e);
        }
      }
    });

    return new Response(stream, {
      status: 200,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  } catch (error) {
    console.error("Gemini API Error:", error);
    return new Response(JSON.stringify({ 
      error: 'Failed to generate response', 
      details: error.message || String(error)
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
