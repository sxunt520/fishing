import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class AiService {
  constructor(private configService: ConfigService) {}

  async generateCaption(imageUrl: any) {
    const apiKey = this.configService.get('DASHSCOPE_API_KEY');
    const model = this.configService.get('AI_MODEL', 'qwen-vl-max');
    const normalizedImageUrl = normalizeImageUrl(imageUrl);

    if (!normalizedImageUrl) {
      throw new BadRequestException('imageUrl 是必需的');
    }

    try {
      const payload = {
        model,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: '你是一位资深钓鱼达人。请根据这张钓鱼图片，生成一个吸引人的标题（10-15字）和一段生动的垂钓心得（50-80字）。请直接返回JSON格式：{"title":"...", "content":"..."}',
              },
              { type: 'image_url', image_url: { url: normalizedImageUrl } },
            ],
          },
        ],
        max_tokens: 800,
        response_format: { type: 'json_object' },
      };
      console.log('[AI Caption] image_url keys:', Object.keys(payload.messages[0].content[1].image_url));

      const { data } = await axios.post(
        'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
        payload,
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
        },
      );

      const content = normalizeModelContent(data.choices?.[0]?.message?.content);
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

function normalizeImageUrl(input: any) {
  if (typeof input === 'string') return input.trim();
  if (Array.isArray(input)) return normalizeImageUrl(input[0]);
  if (input?.imageUrl) return normalizeImageUrl(input.imageUrl);
  if (input?.image_url?.url) return String(input.image_url.url).trim();
  if (input?.url) return String(input.url);
  if (input?.urls?.[0]) return String(input.urls[0]);
  if (input?.images?.[0]) return String(input.images[0]);
  return '';
}

function normalizeModelContent(content: any) {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content.map((item) => item?.text || '').join('');
  }
  return '';
}
