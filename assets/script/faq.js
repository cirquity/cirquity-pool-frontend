(function ($) {
    $(function () {
        currentPage = {
            destroy: function () {
            },
            update: function (updateKey) {
                $.updateFaq(updateKey);
            }
        };

        let isReadyStart = setInterval(function () {
            if (lastStats) {
                $.loadTranslations();

                clearInterval(isReadyStart);
            }
        }, 10);
    });

    $.updateFaq = function (updateKey) {
        if (!lastStats.config.telegramBotName) {
            $('#telegramBot').hide();
        } else {
            const botName = lastStats.config.telegramBotName;
            const botURL = 'https://t.me/' + botName;
            const botStats = lastStats.config.telegramBotStats;
            const botReport = lastStats.config.telegramBotReport;
            const botNotify = lastStats.config.telegramBotNotify;
            const botBlocks = lastStats.config.telegramBotBlocks;

            $('#telegramBotURL').attr('href', botURL);
            $.updateText('telegramBotName', botName);

            if (botStats) {
                $.updateText('botStats', botStats);
            }

            if (botReport) {
                $.updateText('botReport', botReport);
            }

            if (botNotify) {
                $.updateText('botNotify', botNotify);
            }

            if (botBlocks) {
                $.updateText('botBlocks', botBlocks);
            }
        }
    };
})(jQuery);