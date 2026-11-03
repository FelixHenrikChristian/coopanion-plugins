/** Guidance describes reviewed stages; it does not download or execute a generator. */
export const GUIDE={
  plan:{
    en:'Inventory the target figure API, its motion vocabulary and available local generation tools. Agree the identity, style, proportions, camera, outfit families and each family’s legal options. Map complete legal combinations to existing scheme IDs. Record tool versions, models, disk changes and rollback before installing anything.',
    zh:'先盘点目标形象 API、动作词汇和现有生成工具，确认身份、画风、比例、镜头、服装类别及每套服装的有效选项。将可用搭配映射到实际装扮 ID。安装前记录环境、权重、磁盘变更及回退办法。'
  },
  reference:{
    en:'Approve one complete, fully dressed character reference per legal outfit combination before animation. Keep identity, proportions, camera, outlines and material rendering consistent. Use a plain white background when this gives the cleanest generation. Inspect light fabric boundaries and accessory orientation at actual display size. Keep reference sources and rights in private project records.',
    zh:'先验收每个有效搭配的完整穿衣角色参考图，再制作动画。统一身份、比例、镜头、轮廓和材质画法。若白底生成更稳定，则使用纯白背景；检查浅色衣料边界与配饰朝向。参考来源和使用权记录留在私有工程中。'
  },
  video:{
    en:'Generate one continuous short action from the complete outfit reference and an action-reference video. Use the action reference for action type, direction and rhythm; allow natural differences in trajectory and cloth motion. Pilot one action before expanding. Start with the validated accelerated workflow when available. An established SCAIL-2 recipe is 8 steps, CFG 1, shift 1 and a compatible acceleration LoRA at strength 1. At most three targeted accelerated attempts precede up to two non-accelerated 20-step attempts; consider 40 steps only after diagnosis. Restore the complete CFG, shift and LoRA configuration when changing recipes. Keep already accepted versions.',
    zh:'使用完整穿衣参考图和动作参考视频，直接生成连续短动作。动作参考用于动作类型、方向和节奏，允许轨迹及布料运动自然变化。先验证一个动作，再扩展。已有可用加速流程时优先使用；经过验证的 SCAIL-2 配方为 8 步、CFG 1、shift 1、兼容加速 LoRA 强度 1。最多三次有针对性的加速尝试后，可尝试最多两次原始非加速 20 步；诊断后再考虑 40 步。切换配方时同时恢复 CFG、shift 和 LoRA 配置。保留已验收版本。'
  },
  review:{
    en:'Watch every complete raw clip at normal and half speed before extracting assets. Inspect identity, outfit and proportion consistency, connected limbs, occlusion, intact body and fabric, flicker, background stability and natural start/end states. Watch looping actions for at least three consecutive cycles at both speeds. Record specific observations, pass/fail and the exact source hash. A still image or numerical score cannot certify playback. Diagnose failures and change prompts, seeds or inputs within a bounded retry budget.',
    zh:'提取素材前，逐条完整观看原始视频的正常速度与半速播放。检查身份、服装和比例一致性、肢体连接、遮挡、身体与布料完整性、闪烁、背景稳定及动作首尾。循环动作在两种速度下各连续观看至少三轮。记录具体观察、验收结果及源文件哈希。单帧或指标不能代替播放验收。未通过时先诊断，再在有限重试次数内调整提示词、种子或输入。'
  },
  matte:{
    en:'After raw playback approval, make a reviewed first-frame foreground mask and propagate it with a video matting model. A compact local route uses SAM2 tiny, first-mask positive/negative corrections with GrabCut, and MatAnyone2 propagation. Review enclosed background gaps separately from white garments. Preserve original RGB and propagate alpha continuously. Correct a verified missing cloth region only within its source boundary. Rewatch the complete alpha composite on dark and saturated backgrounds at normal and half speed, plus loop joins. Store lossless RGBA frames and compact review videos.',
    zh:'原始视频通过后，校正首帧前景遮罩，再用视频抠像模型连续传播。本地轻量路线可用 SAM2 tiny 提议遮罩、正负点及 GrabCut 校正首帧、MatAnyone2 传播。区分身体间隙中的背景和白色衣料，保留原始 RGB，连续传播透明度。确认误删布料后，仅在对应原始边界内恢复透明度。在深色和彩色背景上重看完整原速、半速及循环接缝。保存无损 RGBA 帧和紧凑复查视频。'
  },
  runtime:{
    en:'Map each complete clip to figure model coordinates with one fixed uniform transform. Implement directional translation, entry, loops, stopping and neutral recovery. Use a complete action and a source-owned seated hold for sit/rise. Explicitly declare independent expression support per pose: preserve native video faces during moving clips unless a separately verified temporal face workflow exists. Idle/seated expressions may use features extracted from their own pose, with fixed measured anchors. Test every declared expression for every outfit and supported pose; expose incomplete states honestly.',
    zh:'每条动作采用固定的整体等比变换映射到形象坐标。实现左右实际移动、起步、循环、停步和回归静止状态，坐下起身使用完整动作及本姿态坐定帧。按姿态明确独立表情支持范围：尚无通过验收的时间连续面部流程时，运动片段保留原生面部；站立、坐定可使用本姿态提取的五官和固定测量锚点。逐套、逐个支持姿态检查所有声明表情，如实展示未完成状态。'
  },
  release:{
    en:'Keep raw sources, parameters, elapsed time, reference provenance and review conclusions versioned. Hash-check transfers and release assets. Verify the package in the real figure sandbox, including its image/script policy. Preserve the installed figure and settings before an atomic staged replacement. For a wardrobe-only extension, group existing schemes in a separate local profile and keep figure files unchanged. Test disabling, restoration, outside changes and reinstall with isolated data. Publish only an allowlisted source package and fictional examples; review the exact archive and Git history for private content.',
    zh:'按版本记录原始素材、参数、耗时、参考来源和验收结论，校验传输及发布文件哈希。使用真实形象安全沙箱验证图片、脚本加载及播放。替换角色包前保留原版和设置，采用先暂存校验再切换的方式。衣橱扩展把已有装扮分组写入独立本地配置，不修改形象文件；使用隔离数据检查停用、恢复、外部变更和重装。只发布允许清单内的源码与虚构示例，检查确切归档内容及 Git 历史，避免混入私有素材。'
  }
};
export function authoringGuide(stage='all',language='en'){
  if(stage==='all')return Object.entries(GUIDE).map(([id,text])=>({stage:id,text:text[language==='zh'?'zh':'en']}));
  if(!Object.hasOwn(GUIDE,stage))throw Error('Unknown authoring stage');return[{stage,text:GUIDE[stage][language==='zh'?'zh':'en']}];
}
