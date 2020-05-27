(function ($) {
    let langCode = null;
    let langData = null;

    $(function () {
        if (typeof languages == null) {
            languages = {
                en: 'English'
            };
        }

        langCode = defaultLang || 'en';

        const $_GET = {};
        const args = location.search.substr(1).split(/&/);
        for (let i = 0; i < args.length; ++i) {
            const tmp = args[i].split(/=/);

            if (tmp[0] !== '') {
                $_GET[decodeURIComponent(tmp[0])] = decodeURIComponent(tmp.slice(1).join('').replace('+', ' '));

                if ($_GET['lang'] !== undefined)
                    langCode = $_GET['lang'];
            }
        }

        if (typeof languages !== undefined && languages) {
            $.renderLangSelector();
        }
    });

    $.loadTranslations = function () {
        if (langData) {
            $.translate(langData);
        } else if (languages && languages[langCode]) {
            $.getJSON('/i18n/' + langCode + '.json', $.translate);
            $.getScript('/vendor/timeago/locales/jquery.timeago.' + langCode + '.js');
        } else {
            $.getJSON('/i18n/' + defaultLang + '.json', $.translate);
            $.getScript('/vendor/timeago/locales/jquery.timeago.' + defaultLang + '.js');
        }
    };


    $.getTranslation = function (key) {
        if (!langData || !langData[key]) return null;
        return langData[key];
    };


    $.translate = function (data) {
        $('html')[0].lang = langCode;
        langData = data;

        $.changeTranslatableLink(langCode);

        $('[data-translate-key]').each(function (index) {
            let strTr = data[$(this).attr('data-translate-key')];
            $(this).html(strTr);
        });

        $('[data-translate-placeholder]').each(function (index) {
            let strTr = data[$(this).attr('data-translate-placeholder')];
            $(this).attr('placeholder', strTr);
        });

        $('[data-translate-value]').each(function (index) {
            let strTr = data[$(this).attr('data-translate-value')];
            $(this).attr('value', strTr)
        });
    };


    $.renderLangSelector = function () {
        let html = '';
        let numLang = 0;

        if (languages) {
            html += '<select id="newLang" class="custom-select" aria-label="Language">';
            for (let lang in languages) {
                if (languages.hasOwnProperty(lang)) {
                    let selected = lang === langCode ? ' selected="selected"' : '';
                    html += '<option value="' + lang + '"' + selected + '>' + languages[lang] + '</option>';
                    numLang++;
                }
            }
            html += '</select>';
        }

        if (html && numLang > 1) {
            $('#langSelector').html(html);
            $('#newLang').each(function () {
                $(this).change(function () {
                    let newLang = $(this).val();
                    let url = '?lang=' + newLang;
                    if (window.location.hash) url += window.location.hash;
                    window.location.href = url;
                });
            });
        }
    };


    $.changeTranslatableLink = function (lang) {
        if (lang !== 'en') {
            let links = $('a.translatable');

            for (let link of links) {
                let item = $(link);
                let href = item.attr('href');

                if (href.indexOf('?lang')) {
                    href = href.replace(/\?lang=\w+/g, '');
                }

                item.attr('href', href + '?lang=' + lang);
            }
        }
    };
})(jQuery);
