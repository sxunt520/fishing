import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class AiService {
  constructor(private configService: ConfigService) {}

  async generateCaption(imageUrl: string) {
    const apiKey = this.configService.get('DASHSCOPE_API_KEY');
    const model = this.configService.get('AI_MODEL', 'qwen-vl-max');

    try {
      const { data } = await axios.post(
        'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
        {
          model,
          messages: [
            {
              role: 'user',
              content: [
                { type: 'image_url', image_url: { url: imageUrl } },
                {
                  type: 'text',
                  text: '你是一位资深钓鱼达人。请根据这张钓鱼图片，生成一个吸引人的标题（10-15字）和一段生动的垂钓心得（50-80字）。请直接返回JSON格式：{"title":"...", "content":"..."}',
                },
              ],
            },
          ],
          max_tokens: 800,
        },
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
        },
      );

      const content = data.choices?.[0]?.message?.content || '';
      const jsonMatch = content.match(/\{[\s\S]*?\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return { title: parsed.title || '', content: parsed.content || '' };
      }
      return { title: '精彩钓点分享', content: content.slice(0, 100) };
    } catch (error) {
      console.error('AI生成失败:', error.response?.data || error.message);
      return { title: '精彩钓点分享', content: '鱼情正好，快来一起垂钓吧！' };
    }
  }
}
