export interface Quote {
  text: string
  author: string
}

export type HubInspirationSource = 'local' | 'ai'

export interface HubInspirationState {
  source: HubInspirationSource
  local: Quote
  ai: Quote | null
}

const HUB_INSPIRATION_STORAGE_KEY = 'inkforge-hub-inspiration'

export const quotes: Quote[] = [
  // ============================================================
  // 原有名言（保持不变）
  // ============================================================
  { text: '简约是复杂的终极形式。', author: '达·芬奇' },
  { text: '设计不仅仅是外表和感觉。设计是关于它如何工作的。', author: '史蒂夫·乔布斯' },
  { text: '少即是多。', author: '路德维希·密斯·凡德罗' },
  { text: '好的设计是尽可能少的设计。', author: '迪特·拉姆斯' },
  { text: '天才是百分之一的灵感加百分之九十九的汗水。', author: '托马斯·爱迪生' },
  { text: '想象力比知识更重要。', author: '阿尔伯特·爱因斯坦' },
  { text: '创造力就是把看似不相关的事物联系起来。', author: '史蒂夫·乔布斯' },
  { text: '最好的写作是重写。', author: 'E.B.怀特' },
  { text: '写作是一种发现的过程。', author: '弗兰纳里·奥康纳' },
  { text: '没有什么是废话，只要你能从中学到东西。', author: '詹姆斯·乔伊斯' },
  { text: '文字是思想的镜子。', author: '塞涅卡' },
  { text: '一个字要是用得恰到好处，它的力量就是无穷的。', author: '马克·吐温' },
  { text: '好文章不是写出来的，是改出来的。', author: '海明威' },
  { text: '写作的秘诀在于坐在椅子上不动。', author: '玛丽·海明威' },
  { text: '每一个伟大的作品都始于一张空白的纸。', author: '佚名' },
  { text: '读书破万卷，下笔如有神。', author: '杜甫' },
  { text: '文章千古事，得失寸心知。', author: '杜甫' },
  { text: '操千曲而后晓声，观千剑而后识器。', author: '刘勰' },
  { text: '博观而约取，厚积而薄发。', author: '苏轼' },
  { text: '不积跬步，无以至千里。', author: '荀子' },
  { text: '工欲善其事，必先利其器。', author: '孔子' },
  { text: '学而不思则罔，思而不学则殆。', author: '孔子' },
  { text: '纸上得来终觉浅，绝知此事要躬行。', author: '陆游' },
  { text: '吾生也有涯，而知也无涯。', author: '庄子' },
  { text: '路漫漫其修远兮，吾将上下而求索。', author: '屈原' },
  { text: '三人行，必有我师焉。', author: '孔子' },
  { text: '知之为知之，不知为不知，是知也。', author: '孔子' },
  { text: '业精于勤，荒于嬉。', author: '韩愈' },
  { text: '千里之行，始于足下。', author: '老子' },
  { text: '天下大事，必作于细。', author: '老子' },
  { text: 'The scariest moment is always just before you start.', author: 'Stephen King' },
  { text: 'Start writing, no matter what. The water does not flow until the faucet is turned on.', author: 'Louis L\'Amour' },
  { text: 'You can always edit a bad page. You can\'t edit a blank page.', author: 'Jodi Picoult' },
  { text: 'There is nothing to writing. All you do is sit down at a typewriter and bleed.', author: 'Ernest Hemingway' },
  { text: 'If you want to be a writer, you must do two things above all others: read a lot and write a lot.', author: 'Stephen King' },
  { text: 'The first draft is just you telling yourself the story.', author: 'Terry Pratchett' },
  { text: 'Write what should not be forgotten.', author: 'Isabel Allende' },
  { text: 'A writer is someone for whom writing is more difficult than it is for other people.', author: 'Thomas Mann' },
  { text: 'Creativity is intelligence having fun.', author: 'Albert Einstein' },
  { text: 'The secret of getting ahead is getting started.', author: 'Mark Twain' },
  { text: 'Make it simple, but significant.', author: 'Don Draper' },
  { text: 'Quality means doing it right when no one is looking.', author: 'Henry Ford' },
  { text: 'Design is not just what it looks like. Design is how it works.', author: 'Steve Jobs' },
  { text: 'Perfection is achieved not when there is nothing more to add, but when there is nothing left to take away.', author: 'Antoine de Saint-Exupery' },
  { text: 'The details are not the details. They make the design.', author: 'Charles Eames' },
  { text: 'Good design is obvious. Great design is transparent.', author: 'Joe Sparano' },
  { text: 'Content precedes design. Design in the absence of content is not design, it\'s decoration.', author: 'Jeffrey Zeldman' },
  { text: 'Innovation distinguishes between a leader and a follower.', author: 'Steve Jobs' },
  { text: 'The only way to do great work is to love what you do.', author: 'Steve Jobs' },
  { text: 'Simplicity is the ultimate sophistication.', author: 'Leonardo da Vinci' },

  // ============================================================
  // 中国古典文学 — 诗词、散文
  // ============================================================
  { text: '海内存知己，天涯若比邻。', author: '王勃' },
  { text: '会当凌绝顶，一览众山小。', author: '杜甫' },
  { text: '长风破浪会有时，直挂云帆济沧海。', author: '李白' },
  { text: '天生我材必有用，千金散尽还复来。', author: '李白' },
  { text: '人生得意须尽欢，莫使金樽空对月。', author: '李白' },
  { text: '安能摧眉折腰事权贵，使我不得开心颜。', author: '李白' },
  { text: '大鹏一日同风起，扶摇直上九万里。', author: '李白' },
  { text: '抽刀断水水更流，举杯消愁愁更愁。', author: '李白' },
  { text: '落红不是无情物，化作春泥更护花。', author: '龚自珍' },
  { text: '沉舟侧畔千帆过，病树前头万木春。', author: '刘禹锡' },
  { text: '山重水复疑无路，柳暗花明又一村。', author: '陆游' },
  { text: '问渠那得清如许，为有源头活水来。', author: '朱熹' },
  { text: '不畏浮云遮望眼，自缘身在最高层。', author: '王安石' },
  { text: '春蚕到死丝方尽，蜡炬成灰泪始干。', author: '李商隐' },
  { text: '身无彩凤双飞翼，心有灵犀一点通。', author: '李商隐' },
  { text: '欲穷千里目，更上一层楼。', author: '王之涣' },
  { text: '莫愁前路无知己，天下谁人不识君。', author: '高适' },
  { text: '人生自古谁无死，留取丹心照汗青。', author: '文天祥' },
  { text: '先天下之忧而忧，后天下之乐而乐。', author: '范仲淹' },
  { text: '居庙堂之高则忧其民，处江湖之远则忧其君。', author: '范仲淹' },
  { text: '出淤泥而不染，濯清涟而不妖。', author: '周敦颐' },
  { text: '采菊东篱下，悠然见南山。', author: '陶渊明' },
  { text: '刑天舞干戚，猛志固常在。', author: '陶渊明' },
  { text: '盛年不重来，一日难再晨。', author: '陶渊明' },
  { text: '但愿人长久，千里共婵娟。', author: '苏轼' },
  { text: '竹杖芒鞋轻胜马，谁怕？一蓑烟雨任平生。', author: '苏轼' },
  { text: '大江东去，浪淘尽，千古风流人物。', author: '苏轼' },
  { text: '人有悲欢离合，月有阴晴圆缺，此事古难全。', author: '苏轼' },
  { text: '旧书不厌百回读，熟读深思子自知。', author: '苏轼' },
  { text: '横看成岭侧成峰，远近高低各不同。', author: '苏轼' },
  { text: '生当作人杰，死亦为鬼雄。', author: '李清照' },
  { text: '知否知否，应是绿肥红瘦。', author: '李清照' },
  { text: '衣带渐宽终不悔，为伊消得人憔悴。', author: '柳永' },
  { text: '众里寻他千百度，蓦然回首，那人却在灯火阑珊处。', author: '辛弃疾' },
  { text: '醉里挑灯看剑，梦回吹角连营。', author: '辛弃疾' },
  { text: '青山遮不住，毕竟东流去。', author: '辛弃疾' },
  { text: '世事洞明皆学问，人情练达即文章。', author: '曹雪芹' },
  { text: '满纸荒唐言，一把辛酸泪。', author: '曹雪芹' },
  { text: '假作真时真亦假，无为有处有还无。', author: '曹雪芹' },
  { text: '己所不欲，勿施于人。', author: '孔子' },
  { text: '知者乐水，仁者乐山。', author: '孔子' },
  { text: '岁寒，然后知松柏之后凋也。', author: '孔子' },
  { text: '上善若水，水善利万物而不争。', author: '老子' },
  { text: '大音希声，大象无形。', author: '老子' },
  { text: '知人者智，自知者明。', author: '老子' },
  { text: '合抱之木，生于毫末；九层之台，起于累土。', author: '老子' },
  { text: '天地不仁，以万物为刍狗。', author: '老子' },
  { text: '祸兮福之所倚，福兮祸之所伏。', author: '老子' },
  { text: '相濡以沫，不如相忘于江湖。', author: '庄子' },
  { text: '天地有大美而不言。', author: '庄子' },
  { text: '至人无己，神人无功，圣人无名。', author: '庄子' },

  // ============================================================
  // 中国现代文学
  // ============================================================
  { text: '世上本没有路，走的人多了，也便成了路。', author: '鲁迅' },
  { text: '不在沉默中爆发，就在沉默中灭亡。', author: '鲁迅' },
  { text: '其实地上本没有路，走的人多了，也便成了路。', author: '鲁迅' },
  { text: '横眉冷对千夫指，俯首甘为孺子牛。', author: '鲁迅' },
  { text: '时间就像海绵里的水，只要愿挤，总还是有的。', author: '鲁迅' },
  { text: '希望是附丽于存在的，有存在便有希望，有希望便是光明。', author: '鲁迅' },
  { text: '真的猛士，敢于直面惨淡的人生，敢于正视淋漓的鲜血。', author: '鲁迅' },
  { text: '哀其不幸，怒其不争。', author: '鲁迅' },
  { text: '惟沉默是最高的轻蔑。', author: '鲁迅' },
  { text: '人类的悲欢并不相通，我只觉得他们吵闹。', author: '鲁迅' },
  { text: '生活是种律动，须有光有影，有左有右，有晴有雨。', author: '老舍' },
  { text: '雨下给富人，也下给穷人；下给义人，也下给不义的人。', author: '老舍' },
  { text: '才华是刀刃，辛苦是磨刀石，再锋利的刀刃若日久不磨，也会生锈。', author: '老舍' },
  { text: '谦虚使人的心缩小，像一个小石卵，虽然小，而极结实。', author: '老舍' },
  { text: '爱与不爱，穷人得在金钱上决定，情种只生在大富之家。', author: '老舍' },
  { text: '墙角的花！你孤芳自赏时，天地便小了。', author: '冰心' },
  { text: '成功的花，人们只惊慕她现时的明艳，然而当初她的芽儿，浸透了奋斗的泪泉。', author: '冰心' },
  { text: '爱在左，同情在右，走在生命路的两旁，随时撒种，随时开花。', author: '冰心' },
  { text: '读书好，多读书，读好书。', author: '冰心' },
  { text: '活着就是为了活着本身，而不是为了活着之外的任何事物。', author: '余华' },
  { text: '人是为了活着本身而活着，而不是为了活着之外的任何事物而活着。', author: '余华' },
  { text: '最初我们来到这个世界，是因为不得不来；最终我们离开这个世界，是因为不得不走。', author: '余华' },
  { text: '没有什么比时间更具有说服力了，因为时间无需通知我们就可以改变一切。', author: '余华' },
  { text: '你如果认识从前的我，也许你会原谅现在的我。', author: '张爱玲' },
  { text: '因为懂得，所以慈悲。', author: '张爱玲' },
  { text: '生命是一袭华美的袍，爬满了蚤子。', author: '张爱玲' },
  { text: '于千万人之中遇见你所要遇见的人，于千万年之中，没有早一步也没有晚一步。', author: '张爱玲' },
  { text: '我是一个在黑暗中大雪纷飞的人哪。', author: '木心' },
  { text: '岁月不饶人，我亦未曾饶过岁月。', author: '木心' },
  { text: '生活的最好状态是冷冷清清的风风火火。', author: '木心' },
  { text: '从前的日色变得慢，车马邮件都慢，一生只够爱一个人。', author: '木心' },
  { text: '黑夜给了我黑色的眼睛，我却用它寻找光明。', author: '顾城' },
  { text: '我想在大地上画满窗子，让所有习惯黑暗的眼睛都习惯光明。', author: '顾城' },
  { text: '卑鄙是卑鄙者的通行证，高尚是高尚者的墓志铭。', author: '北岛' },
  { text: '面朝大海，春暖花开。', author: '海子' },
  { text: '你来人间一趟，你要看看太阳，和你的心上人，一起走在街上。', author: '海子' },
  { text: '为什么我的眼里常含泪水？因为我对这土地爱得深沉。', author: '艾青' },
  { text: '人的一生应当这样度过：当他回首往事时，不因虚度年华而悔恨。', author: '奥斯特洛夫斯基' },
  { text: '我与我周旋久，宁作我。', author: '殷浩' },

  // ============================================================
  // 外国文学经典
  // ============================================================
  { text: '生存还是毁灭，这是一个问题。', author: '莎士比亚' },
  { text: '一千个人眼中有一千个哈姆雷特。', author: '莎士比亚' },
  { text: '黑夜无论怎样悠长，白昼总会到来。', author: '莎士比亚' },
  { text: '爱所有人，信任少数人，不负任何人。', author: '莎士比亚' },
  { text: '聪明人变成了痴愚，是一条最容易上钩的游鱼。', author: '莎士比亚' },
  { text: '适当的悲哀可以表示感情的深切，过度的伤心却可以证明智慧的欠缺。', author: '莎士比亚' },
  { text: '幸福的家庭都是相似的，不幸的家庭各有各的不幸。', author: '托尔斯泰' },
  { text: '人并不是因为美丽才可爱，而是因为可爱才美丽。', author: '托尔斯泰' },
  { text: '如果你想要幸福，就不要去想别人是否会感恩，付出本身就是快乐。', author: '托尔斯泰' },
  { text: '每个人都想改变世界，却没人想改变自己。', author: '托尔斯泰' },
  { text: '一个人越是有许多事情能够放得下，他越是富有。', author: '梭罗' },
  { text: '一当你开始做一件事，如果不是把它做完，你便绝不会罢休。', author: '卡夫卡' },
  { text: '生命之所以有意义是因为它会停止。', author: '卡夫卡' },
  { text: '书必须是用来凿破我们心中冰封海洋的一把斧子。', author: '卡夫卡' },
  { text: '真正的道路在一根绳索上，它不是绷紧在高处，而是贴近地面的。', author: '卡夫卡' },
  { text: '很多年以后，面对行刑队，奥雷里亚诺上校将会回想起父亲带他去见识冰块的那个遥远的下午。', author: '马尔克斯' },
  { text: '生命中曾经有过的所有灿烂，原来终究都需要用寂寞来偿还。', author: '马尔克斯' },
  { text: '过去都是假的，回忆是一条没有归途的路。', author: '马尔克斯' },
  { text: '即使以为自己的感情已经干涸得无法给予，也总会有一个时刻一样东西能拨动心灵深处的弦。', author: '马尔克斯' },
  { text: '人不是生来就被打败的，一个人可以被消灭，但不能被打败。', author: '海明威' },
  { text: '生活总是让我们遍体鳞伤，但到后来，那些受伤的地方一定会变成我们最强壮的地方。', author: '海明威' },
  { text: '世界是美好的，值得我们为之奋斗。我只同意后半句。', author: '海明威' },
  { text: '每个人都不是一座孤岛，一个人必须是这世界上最坚固的岛屿，然后才能成为大陆的一部分。', author: '海明威' },
  { text: '这是最好的时代，这是最坏的时代。', author: '狄更斯' },
  { text: '没有人是天生就被打败的，只要还有一口气在，就要继续战斗。', author: '杰克·伦敦' },
  { text: '一个人只要知道自己去哪里，全世界都会给他让路。', author: '歌德' },
  { text: '决定我们成为什么样的人，不是我们的能力，而是我们的选择。', author: 'J.K.罗琳' },
  { text: '所有伟大的文学，最后都指向一个方向，那就是人的尊严。', author: '福克纳' },
  { text: '人最宝贵的是生命，生命对于每个人只有一次。', author: '奥斯特洛夫斯基' },
  { text: '重要的不是你遭遇了什么，而是你如何应对它。', author: '爱比克泰德' },
  { text: '战争与和平不是由武器决定的，而是由人心决定的。', author: '雨果' },
  { text: '世界上最宽阔的是海洋，比海洋更宽阔的是天空，比天空更宽阔的是人的胸怀。', author: '雨果' },
  { text: '释放无限光明的是人心，制造无边黑暗的也是人心。', author: '雨果' },
  { text: '真正的勇敢不是不害怕，而是害怕的时候仍然坚持前行。', author: '纳尔逊·曼德拉' },
  { text: '如果有来生，要做一棵树，站成永恒。没有悲欢的姿势，一半在尘土里安详，一半在风里飞扬。', author: '三毛' },
  { text: '每一个不曾起舞的日子，都是对生命的辜负。', author: '尼采' },
  { text: '如果冬天来了，春天还会远吗？', author: '雪莱' },
  { text: '只有用心灵才能看清事物的本质，真正重要的东西是肉眼看不见的。', author: '圣埃克苏佩里' },
  { text: '所有大人都曾经是小孩，虽然只有少数人记得。', author: '圣埃克苏佩里' },
  { text: '人只有在独处时才能成为自己。谁要是不爱独处，谁就不爱自由。', author: '叔本华' },
  { text: '我思故我在。', author: '笛卡尔' },
  { text: '温柔地走入那个良夜，不要对着光的消逝发怒。', author: '狄兰·托马斯' },
  { text: '万物皆有裂痕，那是光照进来的地方。', author: '莱昂纳德·科恩' },
  { text: '在我们的生活中，不是缺少美，而是缺少发现美的眼睛。', author: '罗丹' },
  { text: '你不能等待灵感，你必须拿着棒子去追它。', author: '杰克·伦敦' },

  // ============================================================
  // 哲学思想
  // ============================================================
  { text: '未经审视的人生是不值得过的。', author: '苏格拉底' },
  { text: '我唯一知道的就是我一无所知。', author: '苏格拉底' },
  { text: '认识你自己。', author: '苏格拉底' },
  { text: '教育不是灌满一桶水，而是点燃一把火。', author: '苏格拉底' },
  { text: '逆境是检验强者的试金石。', author: '苏格拉底' },
  { text: '那些不能杀死我们的，终将使我们更强大。', author: '尼采' },
  { text: '当你凝视深渊时，深渊也在凝视着你。', author: '尼采' },
  { text: '人之所以伟大，是因为他是一座桥梁而非一个目的。', author: '尼采' },
  { text: '没有事实，只有解释。', author: '尼采' },
  { text: '谁终将声震人间，必长久深自缄默。', author: '尼采' },
  { text: '一个人成熟的标志就是找回在孩童时期游戏中体验到的那份认真。', author: '尼采' },
  { text: '有两种东西，我对它们的思考越是深沉和持久，它们在我心灵中唤起的赞叹和敬畏就会越来越历久弥新：我们头上浩瀚的星空和心中的道德律。', author: '康德' },
  { text: '自由不是你想做什么就做什么，而是你不想做什么就不做什么。', author: '康德' },
  { text: '规则对天才来说就是用来打破的。', author: '康德' },
  { text: '知行合一。', author: '王阳明' },
  { text: '你未看此花时，此花与汝同归于寂；你来看此花时，则此花颜色一时明白起来。', author: '王阳明' },
  { text: '破山中贼易，破心中贼难。', author: '王阳明' },
  { text: '此心光明，亦复何言。', author: '王阳明' },
  { text: '无善无恶心之体，有善有恶意之动，知善知恶是良知，为善去恶是格物。', author: '王阳明' },
  { text: '半亩方塘一鉴开，天光云影共徘徊。', author: '朱熹' },
  { text: '读书之法，在循序而渐进，熟读而精思。', author: '朱熹' },
  { text: '存天理，灭人欲。', author: '朱熹' },
  { text: '为天地立心，为生民立命，为往圣继绝学，为万世开太平。', author: '张载' },
  { text: '万物皆备于我，反身而诚，乐莫大焉。', author: '孟子' },
  { text: '天将降大任于斯人也，必先苦其心志，劳其筋骨。', author: '孟子' },
  { text: '穷则独善其身，达则兼济天下。', author: '孟子' },
  { text: '生于忧患，死于安乐。', author: '孟子' },
  { text: '富贵不能淫，贫贱不能移，威武不能屈。', author: '孟子' },
  { text: '人无远虑，必有近忧。', author: '孔子' },
  { text: '君子坦荡荡，小人长戚戚。', author: '孔子' },
  { text: '吾日三省吾身。', author: '曾子' },
  { text: '人法地，地法天，天法道，道法自然。', author: '老子' },
  { text: '致虚极，守静笃。', author: '老子' },
  { text: '我们这个时代的根本危机不在于原子弹，而在于人心的麻木。', author: '爱因斯坦' },
  { text: '人是万物的尺度。', author: '普罗泰戈拉' },
  { text: '吃得苦中苦，方为人上人。', author: '明代谚语' },
  { text: '他人即地狱。', author: '萨特' },
  { text: '存在先于本质。', author: '萨特' },
  { text: '人是被判定为自由的。', author: '萨特' },
  { text: '幸福不是目的，而是副产品。', author: '埃莉诺·罗斯福' },
  { text: '能够哲学地思考就是能够从容面对死亡。', author: '柏拉图' },
  { text: '我们不是在过日子，我们是在让日子过我们。', author: '维特根斯坦' },
  { text: '对于不可言说之物，我们必须保持沉默。', author: '维特根斯坦' },

  // ============================================================
  // 科技创新
  // ============================================================
  { text: '求知若饥，虚心若愚。', author: '史蒂夫·乔布斯' },
  { text: '你的时间有限，不要浪费在过别人的生活上。', author: '史蒂夫·乔布斯' },
  { text: '大多数人高估了他们一年能做的事情，低估了他们十年能做的事情。', author: '比尔·盖茨' },
  { text: '科技的进步是全人类的共同财富。', author: '比尔·盖茨' },
  { text: '如果某件事足够重要，即使成功的概率不大，你也应该去做。', author: '埃隆·马斯克' },
  { text: '当某件事足够重要时，你就去做，即使胜算不在你这边。', author: '埃隆·马斯克' },
  { text: '坚持是最关键的，除非你被迫放弃，否则永远不要放弃。', author: '埃隆·马斯克' },
  { text: '失败是一种选择，如果你从未失败，说明你不够创新。', author: '埃隆·马斯克' },
  { text: '我们只能看到前方很短的距离，但已经可以看到那里有许多需要做的事情。', author: '阿兰·图灵' },
  { text: '有时候正是那些意想不到的人，做出了无人能够想象的事。', author: '阿兰·图灵' },
  { text: '如果一台机器被期待是万无一失的，那它就不可能是智能的。', author: '阿兰·图灵' },
  { text: '科学的目的是用简单的模型解释复杂的事实。', author: '冯·诺依曼' },
  { text: '如果人们不相信数学是简单的，那是因为他们没有意识到生活有多复杂。', author: '冯·诺依曼' },
  { text: '真正的问题不在于机器是否能思考，而在于人是否能思考。', author: 'B.F.斯金纳' },
  { text: '预测未来的最好方法就是创造未来。', author: '艾伦·凯' },
  { text: '技术本身不是目的，技术是实现目的的手段。', author: '阿兰·凯' },
  { text: '在信息时代，最大的风险是不冒险。', author: '马克·扎克伯格' },
  { text: '完成好过完美。', author: '马克·扎克伯格' },
  { text: '先解决问题，再编写代码。', author: '约翰·约翰逊' },
  { text: '好的代码就是最好的文档。', author: '史蒂夫·麦康奈尔' },
  { text: '简单是可靠的先决条件。', author: '艾兹赫尔·戴克斯特拉' },
  { text: '计算机科学不是关于计算机的，就像天文学不是关于望远镜一样。', author: '艾兹赫尔·戴克斯特拉' },
  { text: '程序必须是写给人看的，只是偶尔让计算机执行一下。', author: '哈罗德·阿贝尔森' },
  { text: '软件正在吞噬世界。', author: '马克·安德森' },
  { text: '最好的程序员不是善于写代码的人，而是善于思考解决方案的人。', author: '林纳斯·托瓦兹' },
  { text: '口说无凭，放码过来。', author: '林纳斯·托瓦兹' },
  { text: '任何技术在魔法上与足够先进的技术没有区别。', author: '亚瑟·克拉克' },
  { text: '任何足够先进的技术都和魔法没有区别。', author: '亚瑟·克拉克' },
  { text: '互联网不仅仅是一种技术，更是一种哲学理念。', author: '蒂姆·伯纳斯-李' },
  { text: '数据是新的石油。', author: '克莱夫·亨比' },
  { text: '科学是一种思维方式，远不仅仅是一堆知识。', author: '卡尔·萨根' },
  { text: '在浩瀚的宇宙中，只有一个角落是你一定能改善的，那就是你自己。', author: '赫胥黎' },
  { text: '逻辑会带你从A到B，想象力会带你去任何地方。', author: '爱因斯坦' },
  { text: '不要试图成为一个成功的人，而要试图成为一个有价值的人。', author: '爱因斯坦' },
  { text: '提出一个问题往往比解决一个问题更重要。', author: '爱因斯坦' },
  { text: '疯狂就是重复做同样的事情却期待不同的结果。', author: '爱因斯坦' },
  { text: '科学的全部就是把日常思维加以提炼。', author: '爱因斯坦' },

  // ============================================================
  // 写作技巧
  // ============================================================
  { text: '最可怕的时刻总是在你动笔之前。', author: '斯蒂芬·金' },
  { text: '写第二稿的秘诀是：删掉第一稿中所有无聊的部分。', author: '斯蒂芬·金' },
  { text: '通往地狱之路是由副词铺成的。', author: '斯蒂芬·金' },
  { text: '才华比食盐便宜。把有才华的人和成功的人区分开来的是大量的努力。', author: '斯蒂芬·金' },
  { text: '如果你不花时间阅读，你就没有时间也没有工具来写作。', author: '斯蒂芬·金' },
  { text: '写作不是人生，但我认为有时候它可以是一条回归人生的路。', author: '斯蒂芬·金' },
  { text: '冰山运动之所以雄伟壮观，是因为它只有八分之一在水面上。', author: '海明威' },
  { text: '所有初稿都是垃圾。', author: '海明威' },
  { text: '当你写作时最困难的事情就是写出真实的句子。', author: '海明威' },
  { text: '在最好的状态下停笔，你就知道明天从哪里开始。', author: '海明威' },
  { text: '我一直以为人是慢慢变老的，其实不是，人是一瞬间变老的。', author: '村上春树' },
  { text: '不必太纠结于当下，也不必太忧虑未来，当你经历过一些事情的时候，眼前的风景已经和从前不一样了。', author: '村上春树' },
  { text: '当我开始写小说的时候，我才了解到，文字可以把人带到远方。', author: '村上春树' },
  { text: '不管全世界所有人怎么说，我都认为自己的感受才是正确的。', author: '村上春树' },
  { text: '写小说很像爵士乐，需要节奏感。', author: '村上春树' },
  { text: '所谓努力，指的是主动而有目的的活动。', author: '村上春树' },
  { text: '杀死你的宝贝。', author: '威廉·福克纳' },
  { text: '一个作家最好的训练就是不快乐的童年。', author: '海明威' },
  { text: '一切文学，余爱以血书者。', author: '尼采' },
  { text: '词语是人类发明的最强大的药物。', author: '吉卜林' },
  { text: '如果一个故事在你心里待了足够久，它会自己找到出路。', author: '弗兰克·奥康纳' },
  { text: '写作是孤独的职业，拥有一本辞典和一颗心就够了。', author: '卡洛斯·富恩特斯' },
  { text: '不要告诉我月亮在发光，给我看玻璃碎片上的闪光。', author: '契诃夫' },
  { text: '简洁是才华的姐妹。', author: '契诃夫' },
  { text: '如果第一章中墙上挂着一把枪，第二章或第三章就一定要开火。', author: '契诃夫' },
  { text: '把形容词当作小偷一样揪出来消灭掉。', author: '伏尔泰' },
  { text: '我没有时间写一封短信，所以我写了一封长信。', author: '马克·吐温' },
  { text: '正确的词与几乎正确的词之间的区别，是闪电与萤火虫的区别。', author: '马克·吐温' },
  { text: '写作是一门把黑色墨水变成白色光芒的艺术。', author: '桑德拉·希斯内罗丝' },
  { text: '每一位作家都是从读者开始的。', author: '塞缪尔·约翰逊' },
  { text: '文学是一种精神上的庇护所。', author: '纳博科夫' },
  { text: '好故事应该从第二页开始。', author: '威廉·萨罗扬' },
  { text: '写作就像开车走夜路，你只能看到前灯照亮的地方，但你可以这样走完全程。', author: 'E.L.多克托罗' },
  { text: '细节就是生命。', author: '弗拉基米尔·纳博科夫' },

  // ============================================================
  // 人生智慧 — 中外谚语、格言
  // ============================================================
  { text: '一寸光阴一寸金，寸金难买寸光阴。', author: '中国谚语' },
  { text: '宝剑锋从磨砺出，梅花香自苦寒来。', author: '中国谚语' },
  { text: '不经一番寒彻骨，怎得梅花扑鼻香。', author: '黄蘖禅师' },
  { text: '有志者事竟成。', author: '中国谚语' },
  { text: '失败乃成功之母。', author: '中国谚语' },
  { text: '世上无难事，只怕有心人。', author: '中国谚语' },
  { text: '滴水穿石，非一日之功。', author: '中国谚语' },
  { text: '三十年河东，三十年河西。', author: '中国谚语' },
  { text: '塞翁失马，焉知非福。', author: '中国谚语' },
  { text: '书山有路勤为径，学海无涯苦作舟。', author: '韩愈' },
  { text: '活到老，学到老。', author: '中国谚语' },
  { text: '百闻不如一见。', author: '中国谚语' },
  { text: '近朱者赤，近墨者黑。', author: '中国谚语' },
  { text: '实践出真知。', author: '中国谚语' },
  { text: '授人以鱼不如授人以渔。', author: '中国谚语' },
  { text: '己欲立而立人，己欲达而达人。', author: '孔子' },
  { text: '静以修身，俭以养德。', author: '诸葛亮' },
  { text: '非淡泊无以明志，非宁静无以致远。', author: '诸葛亮' },
  { text: '鞠躬尽瘁，死而后已。', author: '诸葛亮' },
  { text: '老骥伏枥，志在千里。', author: '曹操' },
  { text: '对酒当歌，人生几何。', author: '曹操' },
  { text: '勿以恶小而为之，勿以善小而不为。', author: '刘备' },
  { text: '功崇惟志，业广惟勤。', author: '《尚书》' },
  { text: '天行健，君子以自强不息。', author: '《周易》' },
  { text: '地势坤，君子以厚德载物。', author: '《周易》' },
  { text: '学然后知不足，教然后知困。', author: '《礼记》' },
  { text: '玉不琢，不成器；人不学，不知道。', author: '《礼记》' },
  { text: '行百里者半九十。', author: '《战国策》' },
  { text: '知己知彼，百战不殆。', author: '孙武' },
  { text: '兵者，诡道也。', author: '孙武' },
  { text: '道生一，一生二，二生三，三生万物。', author: '老子' },
  { text: '故不积跬步，无以至千里；不积小流，无以成江海。', author: '荀子' },
  { text: '锲而不舍，金石可镂。', author: '荀子' },
  { text: '人非生而知之者，孰能无惑。', author: '韩愈' },
  { text: '师者，所以传道受业解惑也。', author: '韩愈' },
  { text: '星星之火，可以燎原。', author: '《尚书》' },
  { text: '当局者迷，旁观者清。', author: '中国谚语' },
  { text: '临渊羡鱼，不如退而结网。', author: '《汉书》' },
  { text: '种一棵树最好的时间是十年前，其次是现在。', author: '非洲谚语' },
  { text: '不要因为走得太远，而忘记为什么出发。', author: '纪伯伦' },
  { text: '你的心灵就是整个世界的倒影。', author: '纪伯伦' },
  { text: '我们必须接受失望，因为它是有限的；但千万不可失去希望，因为它是无穷的。', author: '马丁·路德·金' },
  { text: '衡量一个人，要看他在拥有权力时如何行事。', author: '亚伯拉罕·林肯' },
  { text: '成功不是终点，失败也不是终结。重要的是继续前行的勇气。', author: '丘吉尔' },
  { text: '你能做的最勇敢的事情之一就是识别谎言，不再欺骗自己。', author: '维拉·纳扎里安' },
  { text: '耐心是所有聪明才智的基础。', author: '柏拉图' },
  { text: '教育的根是苦的，但果实是甜的。', author: '亚里士多德' },
  { text: '我们反复做的事情造就了我们，因此优秀不是一种行为，而是一种习惯。', author: '亚里士多德' },
  { text: '知足不辱，知止不殆，可以长久。', author: '老子' },
  { text: '与其临渊羡鱼，不如退而结网。', author: '中国谚语' },
  { text: '人生如逆旅，我亦是行人。', author: '苏轼' },
  { text: '腹有诗书气自华。', author: '苏轼' },
  { text: '欲把西湖比西子，淡妆浓抹总相宜。', author: '苏轼' },
  { text: '谁道人生无再少？门前流水尚能西。', author: '苏轼' },
  { text: '水至清则无鱼，人至察则无徒。', author: '《汉书》' },
  { text: '士别三日，当刮目相待。', author: '《三国志》' },
  { text: '三军可夺帅也，匹夫不可夺志也。', author: '孔子' },
  { text: '少壮不努力，老大徒伤悲。', author: '《汉乐府》' },
  { text: '莫等闲，白了少年头，空悲切。', author: '岳飞' },
  { text: '有花堪折直须折，莫待无花空折枝。', author: '杜秋娘' },
  { text: '流水不腐，户枢不蠹。', author: '《吕氏春秋》' },
  { text: '满招损，谦受益。', author: '《尚书》' },
  { text: '尽信书则不如无书。', author: '孟子' },
  { text: '他山之石，可以攻玉。', author: '《诗经》' },
  { text: '投我以桃，报之以李。', author: '《诗经》' },
  { text: '过而不改，是谓过矣。', author: '孔子' },
  { text: '往者不可谏，来者犹可追。', author: '孔子' },
  { text: '心之所向，素履以往。', author: '《诗经》' },
]

/**
 * 基于日期确定性地选择每日名言
 * 每天返回同一条，第二天自动更换
 */
export function getDailyQuote(): Quote {
  const today = new Date()
  const startOfYear = new Date(today.getFullYear(), 0, 0)
  const diff = today.getTime() - startOfYear.getTime()
  const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24))
  const index = dayOfYear % quotes.length
  return quotes[index]
}

/**
 * 格式化数字为人类友好格式
 * 例如：12345 → "12.3K"
 */
export function formatNumber(num: number): string {
  if (num >= 10000) {
    return (num / 10000).toFixed(1) + 'W'
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K'
  }
  return num.toString()
}

function normalizeStoredQuote(value: unknown, fallback: Quote | null): Quote | null {
  if (!value || typeof value !== 'object') return fallback

  const candidate = value as Partial<Quote>
  const text = typeof candidate.text === 'string' ? candidate.text.trim().slice(0, 160) : ''
  const author = typeof candidate.author === 'string' ? candidate.author.trim().slice(0, 48) : ''
  return text && author ? { text, author } : fallback
}

export function loadHubInspirationState(): HubInspirationState {
  const fallback = getDailyQuote()
  const defaultState: HubInspirationState = { source: 'local', local: fallback, ai: null }
  if (typeof localStorage === 'undefined') return defaultState

  try {
    const raw = localStorage.getItem(HUB_INSPIRATION_STORAGE_KEY)
    if (!raw) return defaultState

    const stored = JSON.parse(raw) as Partial<HubInspirationState>
    return {
      source: stored.source === 'ai' ? 'ai' : 'local',
      local: normalizeStoredQuote(stored.local, fallback) ?? fallback,
      ai: normalizeStoredQuote(stored.ai, null),
    }
  } catch {
    return defaultState
  }
}

export function saveHubInspirationState(state: HubInspirationState): boolean {
  if (typeof localStorage === 'undefined') return false

  try {
    localStorage.setItem(HUB_INSPIRATION_STORAGE_KEY, JSON.stringify({
      source: state.source,
      local: normalizeStoredQuote(state.local, getDailyQuote()) ?? getDailyQuote(),
      ai: normalizeStoredQuote(state.ai, null),
    } satisfies HubInspirationState))
    return true
  } catch {
    return false
  }
}
