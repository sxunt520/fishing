import { Controller, Get } from '@nestjs/common';

@Controller('api/v1/tags')
export class TagController {
  private fish = ['鲫鱼','草鱼','鲤鱼','青鱼','鲢鳙','黑鱼','鲈鱼','鳜鱼','翘嘴','马口','白条','罗非'];
  private evals = ['黑坑','野钓','斤塘','水库','河流','湖泊','溪流','爆护','空军','新手友好','高手进阶'];

  @Get('fish-categories')
  getFish() {
    return this.fish.map((t) => ({ name: t, display: `#${t}` }));
  }

  @Get('spot-evaluations')
  getEvaluations() {
    return this.evals.map((t) => ({ name: t, display: `#${t}` }));
  }
}
