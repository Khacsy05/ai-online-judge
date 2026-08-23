import { Injectable } from '@nestjs/common';
import { GoogleGenAI } from '@google/genai';

@Injectable()
export class AiService {
  private ai: GoogleGenAI;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn('⚠️ GEMINI_API_KEY chưa được khai báo trong biến môi trường (.env).');
    }
    // Khởi tạo Google Gen AI client sử dụng API Key
    this.ai = new GoogleGenAI({ apiKey });
  }

  /**
   * Gửi prompt văn bản thông thường và nhận về câu trả lời dạng string
   * @param prompt Nội dung gửi tới AI
   * @param modelName Tên model sử dụng (mặc định là gemini-2.5-flash)
   */
  async generateText(prompt: string, modelName = 'gemini-2.5-flash'): Promise<string> {
    try {
      const response = await this.ai.models.generateContent({
        model: modelName,
        contents: prompt,
      });
      return response.text ?? '';
    } catch (error) {
      console.error('❌ Lỗi gọi Gemini API (Text):', error);
      throw error;
    }
  }

  /**
   * Gửi prompt và yêu cầu trả về dữ liệu chuẩn cấu trúc JSON xác định trước
   * @param prompt Nội dung gửi tới AI
   * @param schema Cấu trúc JSON mong muốn nhận về
   * @param modelName Tên model sử dụng (mặc định là gemini-2.5-flash)
   */
  async generateJson<T>(prompt: string, schema: any, modelName = 'gemini-2.5-flash'): Promise<T> {
    try {
      const response = await this.ai.models.generateContent({
        model: modelName,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: schema,
        },
      });
      return JSON.parse(response.text ?? '{}') as T;
    } catch (error) {
      console.error('❌ Lỗi gọi Gemini API (JSON):', error);
      throw error;
    }
  }
}
