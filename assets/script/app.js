let currentPage;
let lastStats;
let mergedStats = {};
let xhrLiveStats = {};
let blockExplorers = {};
let mergedApis = {};
let xhrBlockExplorers;
let xhrMergedApis;
let numberFormatter = new Intl.NumberFormat('en-US');

(function ($) {

    $(function () {
        // ================================================
        //  NAVBAR BEHAVIOR
        // ================================================
        $(window).on('scroll load', function () {
            if ($(window).scrollTop() > 5) {
                $('.navbar').addClass('active');
            } else {
                $('.navbar').removeClass('active');
            }

            if ($(window).scrollTop() > 1000) {
                $('#scrollTop').addClass('active');
            } else {
                $('#scrollTop').removeClass('active');
            }
        });


        // ================================================
        // Move to the top of the page
        // ================================================
        $('#scrollTop').on('click', function (e) {
            e.preventDefault();
            $('html, body').animate({ scrollTop: 0}, 1000);
        });


        if (xhrBlockExplorers) {
            xhrBlockExplorers.abort();
        }


        if (xhrMergedApis) {
            xhrMergedApis.abort();
        }

        if (typeof email !== 'undefined' && email) {
            $('#detailsMenu').append('<a class="dropdown-item translatable" href="mailto:' + email + '" target="_blank" data-translate-key="contactUs">Contact us</a>');
        }
        if (typeof telegram !== 'undefined' && telegram) {
            $('#detailsMenu').append('<a class="dropdown-item translatable" href="' + telegram + '" target="_blank" data-translate-key="telegram">Telegram</a>');
        }
        if (typeof discord !== 'undefined' && discord) {
            $('#detailsMenu').append('<a class="dropdown-item translatable" href="' + discord + '" target="_blank" data-translate-key="discord">Discord</a>');
        }
        if (typeof facebook !== 'undefined' && facebook) {
            $('#detailsMenu').append('<a class="dropdown-item translatable" href="' + facebook + '" target="_blank" data-translate-key="Facebook">Facebook</a>');
        }

        $.loadTranslations();
        $.fetchBlockExplorers();
    });


    $.fetchBlockExplorers = function() {
        let apiURL = api + '/block_explorers';

        xhrBlockExplorers = $.ajax({
            url: apiURL,
            dataType: 'json',
            cache: 'false'
        }).done(function (data) {
            blockExplorers = data;
        });

        apiURL = api + '/get_apis';

        xhrMergedApis = $.ajax({
            url: apiURL,
            dataType: 'json',
            cache: 'false',
        }).done(function (data) {
            mergedApis = data;
            $.loadLiveStats();
        });
    };


    $.loadLiveStats = function(reload) {
        let apiURL = api + '/stats';
        let address = $.getCurrentAddress();
        if (address) {
            apiURL = apiURL + '?address=' + encodeURIComponent(address);
        }

        if (xhrLiveStats[parentCoin]) {
            xhrLiveStats[parentCoin].abort();
        }

        $.get(apiURL, function (data) {
            $.updateLiveStats(data, parentCoin);
            currentPage.update();
            $.fetchLiveStats(api, parentCoin);
            /*
            if (!reload) {
                routePage(fetchLiveStats(api, parentCoin));
            }
            */
        });

        Object.keys(mergedApis).some(key => {
            let apiUrl = `${mergedApis[key].api}/stats`;

            // if (xhrLiveStats[key]){
            //     xhrLiveStats[key].abort();
            // }

            $.get(apiUrl, function (data) {
                $.updateLiveStats(data, key);
                currentPage.update();
                $.fetchLiveStats(mergedApis[key].api, key);
                /*
                if (!reload) {
                    routePage(fetchLiveStats(mergedApis[key].api, key));
                }
                */
            });
        });
    };

    $.fetchLiveStats = function(endPoint, key) {
        let apiURL = endPoint + '/live_stats';
        let address = $.getCurrentAddress(key);
        if (address) {
            apiURL = apiURL + '?address=' + encodeURIComponent(address);
        }

        // if (xhrLiveStats[key] && xhrLiveStats[key].status !== 200){
        //     xhrLiveStats[key].abort();
        // }

        xhrLiveStats[key] = $.ajax({
            url: apiURL,
            dataType: 'json',
            cache: 'false'
        }).done(function (data) {
            $.updateLiveStats(data, key);
        })
        .always(function () {
            $.fetchLiveStats(endPoint, key);
        });
    };

    $.getCurrentAddress = function(coin) {
        let address = '';
        if (coin) {
            let urlWalletAddress = $.getUrlParam(coin, 0);
            address = urlWalletAddress || docCookies.getItem(`mining_address_${coin}`);
        }
        return address;
    };


    $.getUrlParam = function(parameter, defaultValue) {
        let urlParameter = defaultValue;
        if (window.location.href.indexOf(parameter) > -1) {
            urlParameter = $.getUrlLets()[parameter];
        }
        return urlParameter;
    };


    $.getUrlLets = function() {
        let lets = {};
        let location = window.location.href;
        let parts = location.replace(/[?&]+([^=&]+)=([^&]*)/gi, function (m, key, value) {
            lets[key] = value;
        });
        return lets;
    };


    $.updateLiveStats = function(data, key) {
        $.pulseLiveUpdate();
        if (key !== parentCoin) {
            mergedStats[key] = data;
        } else {
            lastStats = data;
            if (lastStats && lastStats.pool && lastStats.pool.totalMinersPaid.toString() === '-1') {
                lastStats.pool.totalMinersPaid = 0;
            }
            $.updateIndex();
        }
        if (currentPage) currentPage.update(key);
    };


    $.updateIndex = function() {
        $.updateText('coinSymbol', lastStats.config.symbol);
        $.updateText('g_networkHashrate', $.getReadableHashRateString(lastStats.network.difficulty / lastStats.config.coinDifficultyTarget) + '/sec');
        $.updateText('g_poolHashrate', $.getReadableHashRateString(lastStats.pool.hashrate) + '/sec');
        $.updateText('g_poolHashrateSolo', $.getReadableHashRateString(lastStats.pool.hashrateSolo) + '/sec');
        if (lastStats.miner && lastStats.miner.hashrate) {
            $.updateText('g_userHashrate', $.getReadableHashRateString(lastStats.miner.hashrate) + '/sec');
        } else {
            $.updateText('g_userHashrate', 'N/A');
        }
        $.updateText('poolVersion', lastStats.config.version);
    };


    $.updateTextClasses = function(className, text) {
        let els = document.getElementsByClassName(className);
        if (els) {
            for (let i = 0; i < els.length; i++) {
                let el = els[i];
                if (el && el.textContent !== text)
                    el.textContent = text;
            }
        }
    };


    $.updateText = function(elementId, text) {
        let el = document.getElementById(elementId);
        if (el && el.textContent !== text) {
            el.textContent = text;
        }
        return el;
    };


    $.pulseLiveUpdate = function() {
        let stats_update = $('#statsUpdated');
        stats_update.css({
            opacity: 1,
            transition: 'opacity 100ms ease-out'
        });

        setTimeout(function () {
            stats_update.css({
                opacity: 0,
                transition: 'opacity 7000ms linear'
            });
        }, 500);
    };
    
    
    $.getReadableHashRateString = function(hashrate) {
        let i = 0;
        let byteUnits = [' H', ' KH', ' MH', ' GH', ' TH', ' PH'];
        while (hashrate > 1000) {
            hashrate = hashrate / 1000;
            i++;
        }
        if (typeof hashrate != 'number') {
            hashrate = 0;
        }
        return hashrate.toFixed(2) + byteUnits[i];
    };


    $.getReadableTime = function(seconds) {
        let units = [[60, 'second'], [60, 'minute'], [24, 'hour'],
            [7, 'day'], [4, 'week'], [12, 'month'], [1, 'year']];

        let amount = seconds;
        for (let i = 0; i < units.length; i++) {
            if (amount < units[i][0]) {
                return $.formatAmounts(amount, units[i][1]);
            }
            amount = amount / units[i][0];
        }
        return $.formatAmounts(amount, units[units.length - 1][1]);
    };


    $.floatToString = function(float) {
        return float.toFixed(6)
            .replace(/[0\.]+$/, '');
    };


    $.formatDate = function(time) {
        if (!time) return '';
        return new Date(parseInt(time) * 1000).toLocaleString();
    };


    $.formatAmounts = function(amount, unit) {
        let rounded = Math.round(amount);
        unit = unit + (rounded > 1 ? 's' : '');
        if ($.getTranslation(unit)) unit = $.getTranslation(unit);
        return '' + rounded + ' ' + unit;
    };
    
    
    $.formatNumber = function(number, delimiter) {
        if (number !== '') {
            number = number.split(delimiter)
                .join('');

            let formatted = '';
            let sign = '';

            if (number < 0) {
                number = -number;
                sign = '-';
            }

            while (number >= 1000) {
                let mod = number % 1000;

                if (formatted !== '') formatted = delimiter + formatted;
                if (mod === 0) formatted = '000' + formatted;
                else if (mod < 10) formatted = '00' + mod + formatted;
                else if (mod < 100) formatted = '0' + mod + formatted;
                else formatted = mod + formatted;

                number = parseInt(number / 1000);
            }

            if (formatted !== '') formatted = sign + number + delimiter + formatted;
            else formatted = sign + number;
            return formatted;
        }
        return '';
    };


    $.formatPaymentLink = function(hash, merged) {
        return '<a target="_blank" href="' + $.getTransactionUrl(hash, merged) + '">' + hash + '</a>';
    };


    $.getReadableCoin = function(stats, coins, digits, withoutSymbol, isNumber = false) {
        /*
        const fullAmount = parseInt(coins || 0) / stats.config.coinUnits;
        console.log(coins);
        console.log(fullAmount);
        const amountDollars = Math.floor(fullAmount);
        console.log(amountDollars);
        const fullAmountStr = "" + fullAmount;
        let amountCents = "";
        if (fullAmountStr.indexOf(".") > -1) {
            amountCents = fullAmountStr.substr(fullAmountStr.indexOf(".") + 1, fullAmountStr.length - fullAmountStr.indexOf(".") + 1);
            console.log(amountCents);
            amountCents = amountCents.substr(0, digits);
            console.log(amountCents);
            if (amountCents.length === 1) {
                amountCents = amountCents + "0";
            }
        } else {
            amountCents = "00";
        }
        */

        let coinDecimalPlaces = $.getCoinDecimalPlace(stats);
        let amount = parseFloat((parseInt(coins || 0) / lastStats.config.coinUnits).toFixed(digits || coinDecimalPlaces));

        if (isNumber) {
            return Number(amount.toString() + (withoutSymbol ? '' : (' ' + stats.config.symbol)));
        }
        else {
            return $.localizeNumber(amount) + (withoutSymbol ? '' : (' ' + stats.config.symbol));
        }
    };


    $.getCoinDecimalPlace = function(stats) {
        if (typeof coinDecimalPlaces != "undefined") return coinDecimalPlaces;
        else if (stats.config.coinDecimalPlaces) return stats.config.coinDecimalPlaces;
        else return stats.config.coinUnits.toString().length - 1;
    };


    $.getBlockchainUrl = function(id, stats) {
        if (stats && blockExplorers) {
            return blockExplorers[stats.config.coin].blockchainExplorer.replace('{symbol}', stats.config.symbol.toLowerCase()).replace('{id}', id);
        }
    };


    $.getTransactionUrl = function(id, stats) {
        if (stats && blockExplorers) {
            return blockExplorers[stats.config.coin].transactionExplorer.replace('{symbol}', stats.config.symbol.toLowerCase()).replace('{id}', id);
        }
    };


    $.formatBlockLink = function(hash, stats) {
        return '<a target="_blank" href="' + $.getBlockchainUrl(hash, stats) + '">' + hash + '</a>';
    };
    
    
    $.formatLuck = function(difficulty, shares, solo = false) {
        // Only an approximation to reverse the calculations done in pool.js, because the shares with their respective times are not recorded in redis
        // Approximation assumes equal pool hashrate for the whole round
        // Could potentially be replaced by storing the sum of all job.difficulty in the redis db.
        let accurateShares = shares;

        if (lastStats.config.slushMiningEnabled) {
            // Uses integral calculus to calculate the average of a dynamic function
            let accurateShares = 1 / lastStats.config.blockTime * ( // 1/blockTime to get the average
                shares * lastStats.config.weight * ( // Basically calculates the 'area below the graph' between 0 and blockTime
                    1 - Math.pow(
                        Math.E,
                        ((-lastStats.config.blockTime) / lastStats.config.weight) // blockTime is equal to the highest possible result of (dateNowSeconds - scoreTime)
                    )
                )
            );
        }

        let percent = Math.round(accurateShares / difficulty * 100);
        if (!percent) {
            return `<span class="luckGood">?</span>` + (solo === true ? `<span class="fa fa-user luckGood" title="Solo Mined"></span>` : ``);
        } else if (percent <= 100) {
            return `<span class="luckGood">${percent}%&nbsp;</span>` + (solo === true ? `<span class="fa fa-user luckGood" title="Solo Mined"></span>` : ``);
        } else if (percent >= 101 && percent <= 150) {
            return `<span class="luckMid">${percent}%&nbsp;</span>` + (solo === true ? `<span class="fa fa-user luckMid" title="Solo Mined"></span>` : ``);
        } else {
            return `<span class="luckBad">${percent}%&nbsp;</span>` + (solo === true ? `<span class="fa fa-user luckBad" title="Solo Mined"></span>` : ``);
        }
    };


    $.sortElementList = function(container, siblings, stats) {
        let sorted = (a, b) => {
            return ((a.id.toLowerCase() < b.id.toLowerCase()) ? -1 : ((a.id.toLowerCase() > b.id.toLowerCase()) ? 1 : 0))
        };

        if (stats && siblings.length - 1 === Object.keys(stats).length) {
            siblings.sort(sorted).appendTo(container);
        }
    };


    $.sortTable = function () {
        let table = $(this).parents('table').eq(0),
            rows = table.find('tr:gt(0)').toArray().sort($.compareTableRows($(this).index()));
        this.asc = !this.asc;
        if(!this.asc) {
            rows = rows.reverse()
        }
        for(let i = 0; i < rows.length; i++) {
            table.append(rows[i])
        }
    };


    $.compareTableRows = function (index) {
        return function(a, b) {
            let valA = $.getCellValue(a, index), valB = $.getCellValue(b, index);
            if (!valA) { valA = 0; }
            if (!valB) { valB = 0; }
            return $.isNumeric(valA) && $.isNumeric(valB) ? valA - valB : valA.toString().localeCompare(valB.toString())
        }
    };


    $.getCellValue = function (row, index) {
        return $(row).children('td').eq(index).data("sort")
    };


    $.localizeNumber = function(number) {
        return numberFormatter.format(number);
    };


    $.getPoolHost = function() {
        if (typeof poolHost != "undefined") return poolHost;
        if (lastStats.config.poolHost) return lastStats.config.poolHost;
        else return window.location.hostname;
    };


    $.isEmail = function(email) {
        let regex = /^([a-zA-Z0-9_.+-])+\@(([a-zA-Z0-9-])+\.)+([a-zA-Z0-9]{2,4})+$/;
        return regex.test(email);
    };


    $.renderAdminTemplate = function (usersData, templateId, view) {
        let source = $(templateId).html(),
            template = Handlebars.compile(source),
            context = usersData,
            html = template(context);

        $(view).html(html);
    };


    $.truncate = function (fullStr, strLen, separator) {
        if (fullStr.length <= strLen) return fullStr;

        separator = separator || '...';

        let sepLen = separator.length,
            charsToShow = strLen - sepLen,
            frontChars = Math.ceil(charsToShow / 2),
            backChars = Math.floor(charsToShow / 2);

        return fullStr.substr(0, frontChars) + separator + fullStr.substr(fullStr.length - backChars);
    };


    $.titleCase = function (str) {
        let splitStr = str.toLowerCase().split(' ');
        for (let i = 0; i < splitStr.length; i++) {
            // You do not need to check if i is larger than splitStr length, as your for does that for you
            // Assign it back to the array
            splitStr[i] = splitStr[i].charAt(0).toUpperCase() + splitStr[i].substring(1);
        }
        // Directly return the joined string
        return splitStr.join(' ');
    };


    $.fn.update = function (txt) {
        let el = this[0];
        if (el && el.textContent !== txt)
            el.textContent = txt;
        return this;
    };
})(jQuery);

let docCookies = {
    getItem: function (sKey) {
        return decodeURIComponent(document.cookie.replace(new RegExp("(?:(?:^|.*;)\\s*" + encodeURIComponent(sKey)
            .replace(/[\-\.\+\*]/g, "\\$&") + "\\s*\\=\\s*([^;]*).*$)|^.*$"), "$1")) || null;
    },
    setItem: function (sKey, sValue, vEnd, sPath, sDomain, bSecure) {
        if (!sKey || /^(?:expires|max\-age|path|domain|secure)$/i.test(sKey)) {
            return false;
        }
        let sExpires = "";
        if (vEnd) {
            switch (vEnd.constructor) {
                case Number:
                    sExpires = vEnd === Infinity ? "; expires=Fri, 31 Dec 9999 23:59:59 GMT" : "; max-age=" + vEnd;
                    break;
                case String:
                    sExpires = "; expires=" + vEnd;
                    break;
                case Date:
                    sExpires = "; expires=" + vEnd.toUTCString();
                    break;
            }
        }
        document.cookie = encodeURIComponent(sKey) + "=" + encodeURIComponent(sValue) + sExpires + (sDomain ? "; domain=" + sDomain : "") + (sPath ? "; path=" + sPath : "") + (bSecure ? "; secure" : "");
        return true;
    },
    removeItem: function (sKey, sPath, sDomain) {
        if (!sKey || !this.hasItem(sKey)) {
            return false;
        }
        document.cookie = encodeURIComponent(sKey) + "=; expires=Thu, 01 Jan 1970 00:00:00 GMT" + (sDomain ? "; domain=" + sDomain : "") + (sPath ? "; path=" + sPath : "");
        return true;
    },
    hasItem: function (sKey) {
        return (new RegExp("(?:^|;\\s*)" + encodeURIComponent(sKey)
            .replace(/[\-\.\+\*]/g, "\\$&") + "\\s*\\="))
            .test(document.cookie);
    }
};