import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

@Controller('api/v1/tags')
@ApiTags('标签')
export class TagController {
  private fish = ['鲫鱼','草鱼','鲤鱼','青鱼','鲢鳙','黑鱼','鲈鱼','鳜鱼','翘嘴','马口','白条','罗非'];
  private evals = ['黑坑','野钓','斤塘','水库','河流','湖泊','溪流','爆护','空军','新手友好','高手进阶'];

  @Get('fish-categories')
  @ApiOperation({ summary: '获取鱼获类别标签', description: '返回发布钓点分享时可选择的鱼种标签。' })
  @ApiOkResponse({
    description: '鱼获类别列表',
    schema: { example: [{ name: '鲫鱼', display: '#鲫鱼' }, { name: '草鱼', display: '#草鱼' }] },
  })
  getFish() {
    return this.fish.map((t) => ({ name: t, display: `#${t}` }));
  }

  @Get('spot-evaluations')
  @ApiOperation({ summary: '获取钓点评价标签', description: '返回发布钓点分享时可选择的钓点环境和体验标签。' })
  @ApiOkResponse({
    description: '钓点评价列表',
    schema: { example: [{ name: '野钓', display: '#野钓' }, { name: '河流', display: '#河流' }] },
  })
  getEvaluations() {
    return this.evals.map((t) => ({ name: t, display: `#${t}` }));
  }
}
