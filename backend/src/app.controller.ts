import { Controller, Get, Query } from '@nestjs/common';
import { AppService } from './app.service';
import { AiService } from './modules/ai/ai.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly aiService: AiService,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('test-ai')
  async testAi(@Query('prompt') prompt?: string) {
    const testPrompt = prompt || 'Say hello in 5 words!';
    const response = await this.aiService.generateText(testPrompt);
    return {
      prompt: testPrompt,
      response,
    };
  }
}
