import { GoogleGenerativeAI } from "@google/generative-ai";

export const config = {
  runtime: 'edge',
};

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
학생이 웹페이지, 버튼, 색깔 변경 등 코딩 결과물을 요구하면, 오직 순수한 HTML/CSS/JS 코드만 \`\`\`html ... \`\`\` 마크다운 블록 안에 작성해서 응답해.
HTML 코드 안에는 반드시 <style> 태그로 CSS를 넣고, 자바스크립트가 필요하면 <script> 태그로 넣어. 결과물이 시각적으로 예쁘고 트렌디해야 해.
학생이 코딩과 무관한 유해한 질문을 하면 "저는 코딩과 학습을 돕는 튜터예요. 다른 코딩 질문이 있나요?"라고 거절해.
코딩을 요구하지 않은 일반적인 질문에는 초등학생 눈높이에 맞춰 친절하게 설명해주되, 절대 길게 설명하지 말고 핵심만 2~3문장 이내로 짧고 쉽게 대답해줘.`;

    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.5-pro",
      systemInstruction: systemPrompt 
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
      generationConfig: {
        maxOutputTokens: 1000,
      },
    });

    const result = await chat.sendMessage(latestMessage);
    const responseText = await result.response.text();

    return new Response(JSON.stringify({ text: responseText }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
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
