(function ($) {
    let $lastPortsJson = '';
    let $miningPorts = $('#mining-ports-rows');
    let $miningPortTemplate = $miningPorts.html();
    let $miningPortSelect = $('#gMiningPort');

    $(function () {
        currentPage = {
            destroy: function () {
            },
            update: function (updateKey) {
                $.updateStart(updateKey);
            }
        };

        let isReadyStart = setInterval(function () {
            if (lastStats) {
                $.loadTranslations();

                clearInterval(isReadyStart);
            }
        }, 10);

        $miningPorts.empty();
        $miningPortSelect.empty();

        $('#generateConf').on('click', function() {
            $.generateConf();
        });
    });

    $.updateStart = function () {
        let portsJson = JSON.stringify(lastStats.config.ports);
        if ($lastPortsJson !== portsJson) {
            $lastPortsJson = portsJson;
            let $miningPortChildren = [];
            let $miningPortOptions = [];
            for (let i = 0; i < lastStats.config.ports.length; i++) {
                let portData = lastStats.config.ports[i];
                let $portChild = $($miningPortTemplate);
                $portChild.find('.miningPort').text(portData.port);
                $portChild.find('.miningPortDiff').text($.formatNumber(portData.difficulty.toString(), ','));
                $portChild.find('.miningPortDesc').text(portData.desc);
                $miningPortChildren.push($portChild);
                $miningPortOptions.push('<option value="' + portData.port + '">' + portData.port + ' &ndash; ' + portData.desc + '</option>');
            }

            $miningPorts.append($miningPortChildren);
            $miningPortSelect.append($miningPortOptions);
            $.updateTextClasses('examplePort', lastStats.config.ports[0].port.toString());
        }

        let childCoins = Object.keys(mergedStats).join(' or ');

        $.updateText('miningPoolHost', $.getPoolHost());
        $.updateTextClasses('exampleHost', $.getPoolHost());
        $.updateText('paymentIdSeparator', lastStats.config.paymentIdSeparator);
        $.updateText('fixedDiffSeparator', lastStats.config.fixedDiffSeparator);
        $.updateText('paymentChildCoins', `${childCoins} wallet address`);

        if (!lastStats.config.fixedDiffEnabled) {
            $('#fixedDiff').hide();
        }

        let coin = lastStats.config.coin.toLowerCase() || null;
        let cnAlgorithm = lastStats.config.cnAlgorithm || "cryptonight";
        let cnVariant = lastStats.config.cnVariant || 0;

        let algorithm = '';
        let xmrstakAlgo = '';
        let xmrigAlgo = '';

        if (cnAlgorithm === "argon2") {
            if (cnVariant === 1) {
                algorithm = 'Argon2id WRKZ';
            }
            else {
                algorithm = 'Argon2id Chukwa';
                xmrigAlgo = 'argon2/chukwa';
            }
        } else if (cnAlgorithm === "randomx") {
            if (cnVariant === 1)
                algorithm = 'CryptoNight DefyX';
            else if (cnVariant === 2)
                algorithm = 'RandomARQ';
            else if (cnVariant === 17) {
                algorithm = 'RandomWOW';
                xmrstakAlgo = 'randomX_wow';
            } else if (cnVariant === 18) {
                algorithm = 'RandomXL';
                xmrstakAlgo = 'randomX_loki';
            } else {
                algorithm = 'RandomX';
                xmrstakAlgo = 'randomX';
            }
        } else if (cnAlgorithm === "cryptonight_light") {
            if (cnVariant === 1) {
                algorithm = 'CryptoNight Lite v7';
                xmrstakAlgo = 'cryptonight_lite_v7';
            } else {
                algorithm = 'CryptoNight Lite';
                xmrstakAlgo = 'cryptonight_lite';
            }
        } else if (cnAlgorithm === "cryptonight_pico" || cnAlgorithm === "cryptonight-turtle") {
            if (cnAlgorithm === "cryptonight-turtle" && cnVariant === 2) {
                algorithm = 'CryptoNight Ultra v2';
            } else {
                algorithm = 'CryptoNight Turtle';
                xmrstakAlgo = 'cryptonight_turtle';
                xmrigAlgo = 'cn-pico';
            }
        } else if (cnAlgorithm === "cryptonight_heavy") {
            if (cnVariant === 1) {
                algorithm = 'CryptoNight Haven';
                xmrstakAlgo = 'cryptonight_haven';
            } else if (cnVariant === 2) {
                algorithm = 'CryptoNight Saber';
                xmrstakAlgo = 'cryptonight_bittube2';
            } else {
                algorithm = 'CryptoNight Heavy';
                xmrstakAlgo = 'cryptonight_heavy';
            }
        } else {
            if (cnVariant === 1) {
                algorithm = 'CryptoNight v7';
                xmrstakAlgo = 'cryptonight_v7';
            } else if (cnVariant === 4) {
                algorithm = 'CryptoNight Fast';
                xmrstakAlgo = 'cryptonight_masari';
            } else if (cnVariant === 6) {
                algorithm = 'CryptoNight Alloy';
                xmrstakAlgo = 'cryptonight_alloy';
            } else if (cnVariant === 7) {
                algorithm = 'CryptoNight Arto';
                xmrstakAlgo = 'cryptonight_arto';
            } else if (cnVariant === 8) {
                algorithm = 'CryptoNight v8';
                xmrstakAlgo = 'cryptonight_v8';
            } else if (cnVariant === 9) {
                algorithm = 'CryptoNight v8 Half';
                xmrstakAlgo = 'cryptonight_v8_half';
            } else if (cnVariant === 11) {
                algorithm = 'CryptoNight GPU';
                xmrstakAlgo = 'cryptonight_gpu';
            } else if (cnVariant === 13) {
                algorithm = 'CryptoNight R';
                xmrstakAlgo = 'cryptonight_r';
            } else if (cnVariant === 14) {
                algorithm = 'CryptoNight v8 ReverseWaltz';
                xmrstakAlgo = 'cryptonight_v8_reversewaltz';
            } else if (cnVariant === 15) {
                algorithm = 'CryptoNight Zelerius';
                xmrstakAlgo = 'cryptonight_v8_zelerius';
            } else if (cnVariant === 16) {
                algorithm = 'CryptoNight v8 Double';
                xmrstakAlgo = 'cryptonight_v8_double';
            } else {
                algorithm = 'CryptoNight';
                xmrstakAlgo = 'cryptonight';
            }
        }

        $.updateText('cnAlgorithm', algorithm);
        $.updateText('xmrstakAlgo', xmrstakAlgo);
        $.updateTextClasses('xmrigAlgo', xmrigAlgo);
        $.updateTextClasses('cnVariant', cnVariant);
    };

    $.generateConf = function () {
        // Mining Port
        let port = $('#gMiningPort').val();
        $.updateTextClasses('examplePort', port);

        // Username
        let address = $('#gAddress').val().replace(/\s+/g, '').trim();
        let childAddress = ''; //$('#gChildAddress').val().replace(/\s+/g, '').trim();
        let childPaymentID = ''; // $('#gChildPaymentID').val().replace(/\s+/g, '').trim();
        let solo = $('#gSolo').val();
        let paymentID = $('#gPaymentID').val().replace(/\s+/g, '').trim();
        let difficulty = parseInt($('#gDifficulty').val().replace(/\s+/g, '').trim());
        let workerName = $('#gWorkerName').val().replace(/\s+/g, '').trim();
        let login = address ? address : 'YOUR_WALLET_ADDRESS';

        if (paymentID) {
            login = login + lastStats.config.paymentIdSeparator + paymentID;
        }
        if (difficulty) {
            login = login + lastStats.config.fixedDiffSeparator + difficulty;
        }
        if ($('input[name=solo]').is(':checked')) {
            login = `solo:${login}`;
        }

        $.updateTextClasses('exampleLogin', login);

        // Password
        let password = 'YOUR_PASSWORD';
        if (difficulty) {
            password = password + lastStats.config.fixedDiffSeparator + difficulty;
        }
        if (workerName) {
            password = password  + '@' + workerName;
        }

        $.updateTextClasses('examplePassword', password);
    };
})(jQuery);
