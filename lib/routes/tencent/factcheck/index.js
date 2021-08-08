const got = require('@/utils/got');
const cheerio = require('cheerio');

module.exports = async (ctx) => {
    const response = await got({
        method: 'get',
        url: 'https://vp.fact.qq.com/home',
        headers: {
            Referer: 'https://vp.fact.qq.com/home',
        },
    });

    const $ = cheerio.load(response.data);

    const items = await Promise.all(
        ($('#home_content_list li').slice(0,20) || []).map( async (_, item) => {
            const link = 'https://vp.fact.qq.com/article?id=' + item.attribs.id;
            const simple = {
                link: link,
                pubDate: $('div.content_time', item).text(),
                guid: item.attribs.id,
            };
            const details = await ctx.cache.tryGet(link, async () => {
                const response = await got.get(link);
                const $ = cheerio.load(response.data);
                const regex = /const originRumor = "(.*?)"/gm;
                const match = regex.exec($.html());
                const rumor = match.length === 2 ? match[1] : '';
                return {
                    title: `【${$('.mark_text').text()}】${$('.maintitle').text()}`,
                    author: $('.check_content_writer').children().remove().end().text().split('：').slice(-1)[0],
                    category: [
                        $('.mark_title').text(),
                        $('.mark_text').text(),
                    ],
                    description: `流传说法：${rumor} \
                        查证要点：${$('.check_content_points>ul>li').html()}<br> \
                        ${$('.check_content_writer').html()}<br> \
                        ${$('.check_content_bottom').html()}<br> \
                        <hr> \
                        ${$('.question.text').html()}<br> \
                        <hr> \
                        ${$('.information').html()}`,
                };
            });
            return Promise.resolve(Object.assign({}, simple, details));
        })
        .get()
    );

    ctx.state.data = {
        title: '较真查证平台-腾讯新闻',
        link: 'https://vp.fact.qq.com/home',
        item: items,
    };
};
