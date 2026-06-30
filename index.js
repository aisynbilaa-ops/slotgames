const { Client, GatewayIntentBits, EmbedBuilder, PermissionsBitField, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs');

// Inisialisasi Bot dengan Intents yang dibutuhkan
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMessageReactions
    ]
});

client.once('ready', () => {
    console.log(`BOT SUDAH ON SEBAGAI ${client.user.tag}!`);
});

// 1. Definisikan variabel DB_FILE
const DB_FILE = './database.json';

// 2. Definisikan fungsi saveDB TERLEBIH DAHULU agar bisa dikenali
const saveDB = () => fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));

// 3. Baru lakukan inisialisasi database dan panggil saveDB jika diperlukan
let db = { users: {}, channels: [] };

try {
    if (fs.existsSync(DB_FILE)) {
        const fileContent = fs.readFileSync(DB_FILE, 'utf8');
        if (fileContent && fileContent.trim() !== "") {
            db = JSON.parse(fileContent);
        }
    }
} catch (error) {
    console.error("Database rusak, mereset ke default...");
    db = { users: {}, channels: [] };
    saveDB(); // Sekarang saveDB sudah didefinisikan, jadi ini tidak akan error
}

// Emoji Setup
const EMOJI_CASH = '<:cash:1520734986674765974>';
const EMOJI_CARDBACK = '<:cardback:1520298633981988955>';

// Emoji approve & cancel
const EMOJI_APPROVE = '<:approve:1520096857211273417>';
const EMOJI_NOT = '<:not:1520096893357527162>';

// KONFIGURASI EMOJI UTAMA
const EMOJI_COIN_SPIN = '<a:coinflips:1520825409489600715> '; 
const EMOJI_COIN_STOP = '🪙';                               
const EMOJI_SLOTS_SPIN = '<a:spin:1519947196483502142>';     
const EMOJI_MONEY = '<:moneyslot:1519946191880720384>';

// Tambahan Anti-Toxic
let antiToxicEnabled = {}; // Menyimpan channel yang aktif
const TOXIC_WORDS = ['anjir', 'babi', 'lonte', 'kimak', 'asu', 'anjing', 'anjr', 'anjing', 'ngentot', 'memek', 'pepek', 'kontol', 'totong', 'goblok', 'pilat'];

const EMOJI_SLOTS = [
    '<:emoji_3:1519947110206935140>',
    '<:manis:1519947169946406963>',
    '<:pisang:1519947217215946822>'
];

// Deck Kartu (Telah difix dengan menghapus duplicate Ace value 1 agar emoji di Blackjack sesuai)
const deckTemplate = [
    { name: 'A', value: 11, emoji: '<:Adiamond:1520729274393427970>' }, { name: 'A', value: 11, emoji: '<:Alove:1520731728233365636>' }, { name: 'A', value: 11, emoji: '<:As:1520731512859918357>' },
    { name: '2', value: 2, emoji: '<:2diamond:1520727950138413128>' }, { name: '2', value: 2, emoji: '<:2klub:1520725911580839966>' }, { name: '2', value: 2, emoji: '<:2s:1520730598644125816>' }, { name: '2', value: 2, emoji: '<:4love:1520729504895733892>' },
    { name: '3', value: 3, emoji: '<:3diamond:1520727997257224363>' }, { name: '3', value: 3, emoji: '<:3klub:1520726090669101066>' }, 
    { name: '3', value: 3, emoji: '<:3love:1520729558813511861>' }, { name: '3', value: 3, emoji: '<:3s:1520730667313397771>' },
    { name: '4', value: 4, emoji: '<:4diamond:1520728385385402478>' }, { name: '4', value: 4, emoji: '<:4klub:1520726260383350996>' }, { name: '4', value: 4, emoji: '<:4love:1520729598839754762>' },
    { name: '5', value: 5, emoji: '<:5diamond:1520728583746617385>' }, { name: '5', value: 5, emoji: '<:5klub:1520726309574148226>' }, { name: '5', value: 5, emoji: '<:5love:1520729650983338055>' }, { name: '5', value: 5, emoji: '<:5s:1520730718945411082>' },
    { name: '6', value: 6, emoji: '<:6klub:1520726365588946975>' }, { name: '6', value: 6, emoji: '<:6love:1520750688940982352>' },
    { name: '7', value: 7, emoji: '<:7diamond:1520728983036235906>' }, { name: '7', value: 7, emoji: '<:7klub:1520726419548803184>' }, { name: '7', value: 7, emoji: '<:7love:1520730479488274432>' },
    { name: '8', value: 8, emoji: '<:8klub:1520726475706470420>' }, { name: '8', value: 8, emoji: '<:8s:1520730827925884948>' },
    { name: '9', value: 9, emoji: '<:9love:1520729901165187123>' },
    { name: 'J', value: 10, emoji: '<:Jdiamond:1520729154985791529>' }, { name: 'J', value: 10, emoji: '<:Jklub:1520727307541544970>' }, { name: 'J', value: 10, emoji: '<:Js:1520731199230709820>' },
    { name: 'Q', value: 10, emoji: '<:Qklub:1520727374809927710>' }, { name: 'Q', value: 10, emoji: '<:Qs:1520731250573316167>' },
    { name: 'K', value: 10, emoji: '<:Kdiamond:1520729221440339968>' }, { name: 'K', value: 10, emoji: '<:Klub:1520727430690766918>' }, { name: 'K', value: 10, emoji: '<:Ks:1520731296085704835>' }
];

// Utilitas Permainan
const drawCard = () => deckTemplate[Math.floor(Math.random() * deckTemplate.length)];

const calculateScore = (hand) => {
    let score = 0;
    let aces = 0;
    for (const card of hand) {
        score += card.value;
        if (card.name === 'A') aces += 1;
    }
    while (score > 21 && aces > 0) {
        score -= 10;
        aces -= 1;
    }
    return score;
};

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const initUser = (userId) => {
    if (!db.users[userId]) {
        db.users[userId] = 20000;
        saveDB();
    }
};

// ================= FITUR (COOLDOWN) =================
const gameCooldowns = new Map();

const checkCooldown = (userId, commandName, message) => {
    const now = Date.now();
    const cooldownAmount = 10000;

    if (!gameCooldowns.has(userId)) {
        gameCooldowns.set(userId, {});
    }

    const userCooldowns = gameCooldowns.get(userId);

    if (userCooldowns[commandName]) {
        const expirationTime = userCooldowns[commandName] + cooldownAmount;
        if (now < expirationTime) {
            message.reply('Sabar lol! lagi cooldown').catch(() => {});
            return true;
        }
    }

    userCooldowns[commandName] = now;
    return false;
};

// Wrapper getUserData
if (!db.dailies) db.dailies = {};
function getUserData(userId) {
    initUser(userId);
    if (!db.dailies[userId]) db.dailies[userId] = 0;
    return {
        get cash() { return db.users[userId]; },
        set cash(amount) { db.users[userId] = amount; },
        get lastDaily() { return db.dailies[userId]; },
        set lastDaily(time) { db.dailies[userId] = time; }
    };
}
// ===============================================================

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    const args = message.content.split(' ');
    const command = args[0].toLowerCase();

    // 1. Perintah Setup Channel (Admin Only)
    if (command === 'setchannel') {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) return message.reply('Kamu tidak memiliki akses!');
        if (!db.channels.includes(message.channel.id)) {
            db.channels.push(message.channel.id);
            saveDB();
            return message.reply('THE CHANNEL WAS SUCCESFULLY DELETED.');
        } else {
            db.channels = db.channels.filter(id => id !== message.channel.id);
            saveDB();
            return message.reply('CHANNEL SUCCESSFULLY REMOVE FROM THE SLOT CHANNEL LIST.');
        }
    }

    // Cek apakah perintah dijalankan di channel yang diizinkan
    if (db.channels.length > 0 && !db.channels.includes(message.channel.id) && ['sbj', 'shl', 'scash', '/setcash', '!sendcash', 'csend', 'ss', 'slot', 'scf', 'smine', 'sdaily'].includes(command)) {
        return message.reply('Perintah tidak dapat digunakan di channel ini.');
    }

    // Inisialisasi saldo 20k jika pengguna baru
    initUser(message.author.id);

    // 2. Cek Saldo
    if (command === 'scash') {
        return message.reply(`${EMOJI_CASH} | ${message.author} your cash have **__${db.users[message.author.id]}__** cash!`);
    }

    // 3. Admin: Set Cash (/setcash jumlah)
    if (command === '/setcash') {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) return message.reply('Kamu tidak memiliki akses!');
        const amount = parseInt(args[1]);
        if (isNaN(amount)) return message.reply('Enter a valid amount..');
        db.users[message.author.id] = amount;
        saveDB();
        return message.reply(`Yor balance has been success change to ${EMOJI_CASH} **${amount}**.`);
    }

    // 4. Admin: Send Cash All (!sendcash all jumlah)
    if (command === '!sendcash' && args[1] === 'all') {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) return message.reply('Kamu tidak memiliki akses!');
        const amount = parseInt(args[2]);
        if (isNaN(amount) || amount <= 0) return message.reply('Enter valid amount ex: `!sendcash all 1000`');
        for (const userId in db.users) {
            db.users[userId] += amount;
        }
        saveDB();
        return message.reply(`Succes sent ${EMOJI_CASH} **${amount}** to all register players!`);
    }

    // 5. Transfer Cash dengan Konfirmasi
    if (command === 'csend') {
        const target = message.mentions.users.first();
        const amount = parseInt(args[2]);
        
        if (!target) return message.reply('TAG USER.');
        if (isNaN(amount) || amount <= 0) return message.reply('Enter valid amount.');
        if (db.users[message.author.id] < amount) return message.reply('Your cash is enough.');
        if (target.id === message.author.id) return message.reply('You can send cash to yourself.');

        // Membuat Embed Konfirmasi
        const confirmEmbed = new EmbedBuilder()
            .setColor('#00ff00')
            .setAuthor({ name: `${message.author.username}, you are about to give cash to ${target.username}`, iconURL: message.author.displayAvatarURL() })
            .setDescription(`To confirm this transaction, click ${EMOJI_APPROVE} Confirm.\nTo cancel this transaction, click ${EMOJI_NOT} Cancel.\n\n⚠️ *It is against our rules to trade cash for anything of monetary value. You will be banned for doing so.*\n\n**${message.author} will give ${target}:**\n\`${amount.toLocaleString()} cash\``);

        const confirmMsg = await message.reply({ embeds: [confirmEmbed] });
        await confirmMsg.react('1520096857211273417'); // ID emoji approve
        await confirmMsg.react('1520096893357527162'); // ID emoji not

        const filter = (reaction, user) => ['1520096857211273417', '1520096893357527162'].includes(reaction.emoji.id) && user.id === message.author.id;
        const collector = confirmMsg.createReactionCollector({ filter, max: 1, time: 30000 });

        collector.on('collect', async (reaction) => {
            if (reaction.emoji.id === '1520096857211273417') { // Jika klik approve
                initUser(target.id);
                db.users[message.author.id] -= amount;
                db.users[target.id] += amount;
                saveDB();
        
                const successEmbed = new EmbedBuilder()
                    .setColor('#00ff00')
                    .setDescription(` ${EMOJI_CASH} | **${message.author.username}** successfully sent \`${amount.toLocaleString()} cash\` to **${target.username}**!`);
                
                confirmMsg.edit({ embeds: [successEmbed] });
                confirmMsg.reactions.removeAll();
            } else {
                confirmMsg.edit({ content: '❌ Transaction cancelled.', embeds: [] });
                confirmMsg.reactions.removeAll();
            }
        });

        collector.on('end', (collected) => {
            if (collected.size === 0) {
                confirmMsg.edit({ content: '⏳ Confirmation time expired.', embeds: [] });
                confirmMsg.reactions.removeAll();
            }
        });
    }

    // Command: /menolaktoxic (Hanya Admin)
    if (message.content.startsWith('/menolaktoxic')) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) return;
        const channel = message.mentions.channels.first() || message.channel;
        antiToxicEnabled[message.guild.id] = channel.id;
        saveDB(); 
        return message.reply('**FITUR ANTI TOXIC BERHASIL DI NYALAKAN! ⚠️**');
    }

    // Deteksi Anti-Toxic (Tanpa Timeout)
    if (antiToxicEnabled[message.guild.id] === message.channel.id && 
        !message.member.permissions.has(PermissionsBitField.Flags.Administrator) && 
        !message.author.bot) {
        
        const content = message.content.toLowerCase();
        const isToxic = TOXIC_WORDS.some(word => content.includes(word));

        if (isToxic) {
            message.reply('WOI, GABOLE TOKSIK GABOLE TOKSIK <a:cats_nomnom_ramble:1517101274443677717>\n*Tolong jaga ketikanmu ya, ini peringatan! 🚨*');
            return; // Hentikan proses jika pesan toksik
        }
    }
    
    // ================= 6. PERMAINAN BLACKJACK (sbj) =================
    if (command === 'sbj') {
        let bet = args[1];
        if (!bet) bet = 1; // Default 1 cash kalau ga isi argumen
        
        let balance = db.users[message.author.id];
        if (bet.toString().toLowerCase() === 'all') {
            bet = Math.min(balance, 300000);
        } else {
            bet = parseInt(bet);
        }

        if (isNaN(bet) || bet <= 0) return message.reply('Taruhan tidak valid.');
        if (bet > 300000) return message.reply('Maksimal taruhan adalah 300.000 cash!');
        if (balance < bet) return message.reply('Cash kamu tidak cukup.');
        
        db.users[message.author.id] -= bet;
        saveDB();

        let playerHand = [drawCard(), drawCard()];
        let dealerHand = [drawCard(), drawCard()];
        let hitCount = 0;
        
        const getAggressiveCard = () => {
            const highCards = deckTemplate.filter(c => c.value >= 7);
            return highCards[Math.floor(Math.random() * highCards.length)];
        };

        const generateEmbed = (status, color) => {
            const playerScore = calculateScore(playerHand);
            const dealerScore = calculateScore(dealerHand);
            const playerEmojis = playerHand.map(c => c.emoji).join(' ');
            
            let dealerDisplayScore = status === 'playing' ? `[${dealerHand[0].value}+?]`: `[${dealerScore}]`;
            let dealerEmojis = status === 'playing' ? `${dealerHand[0].emoji} ${EMOJI_CARDBACK}` : dealerHand.map(c => c.emoji).join(' ');
            
            let resultText = '';
            if (status === 'win') resultText = `\n\n <:cash:1520734986674765974> ~ You win ${EMOJI_CASH} **${bet * 2}** cash!`;
            else if (status === 'lose') resultText = `\n\n <:24263sadmoos:1521588508756807770> ~ You lose ${EMOJI_CASH} **${bet}** cash!`;
            else if (status === 'tie') resultText = `\n\n <:24263sadmoos:1521588508756807770> ~ You tie bro!`;
            else if (status === 'bust') resultText = `\n\n<:24263sadmoos:1521588508756807770> ~ You bust bro!`;

            let statusText = status === 'playing' || status === 'revealing' ? '\n\n.ᯤ Game in progress' : '';
            
            return new EmbedBuilder()
                .setAuthor({ name: `${message.author.username}, you bet ${bet} to play blackjack`, iconURL: message.author.displayAvatarURL() })
                .setColor(color)
                .setDescription(`**Dealer ${dealerDisplayScore}**\n${dealerEmojis}\n\n**${message.author.username} [${playerScore}]**\n${playerEmojis}${resultText}${statusText}`);
        };

        const msg = await message.reply({ embeds: [generateEmbed('playing', '#0099ff')] });
        msg.react('👊');
        msg.react('🛑');
        
        const filter = (reaction, user) => ['👊', '🛑'].includes(reaction.emoji.name) && user.id === message.author.id;
        const collector = msg.createReactionCollector({ filter, time: 60000 });
        
        collector.on('collect', async (reaction, user) => {
            if (reaction.emoji.name === '👊') {
                if (hitCount < 3) { 
                    hitCount++;
                    playerHand.push(getAggressiveCard());
                    
                    if (calculateScore(playerHand) > 21) {
                        collector.stop('bust');
                    } else {
                        await msg.edit({ embeds: [generateEmbed('playing', '#0099ff')] });
                    }
                }
            } else if (reaction.emoji.name === '🛑') {
                collector.stop('stand');
            }
        });
        
        collector.on('end', async (collected, reason) => {
            if (reason === 'time') {
                db.users[message.author.id] += bet;
                saveDB();
                return message.reply('Waktu habis! Uang dikembalikan.');
            }

            let pScore = calculateScore(playerHand);
            await msg.edit({ embeds: [generateEmbed('revealing', '#0099ff')] });
            await sleep(400);

            let dealerCardsCount = 2;
            while (calculateScore(dealerHand) < 17 && dealerCardsCount < 5) {
                dealerHand.push(drawCard()); 
                dealerCardsCount++;
                await msg.edit({ embeds: [generateEmbed('revealing', '#0099ff')] });
                await sleep(400);
            }

            const dScore = calculateScore(dealerHand);
            let finalStatus, finalColor;

            if (pScore > 21) { 
                finalStatus = 'bust'; finalColor = '#ff0000'; 
            } else if (dScore > 21) { 
                finalStatus = 'win'; finalColor = '#00ff00'; db.users[message.author.id] += (bet * 2); 
            } else if (pScore > dScore) { 
                finalStatus = 'win'; finalColor = '#00ff00'; db.users[message.author.id] += (bet * 2); 
            } else if (dScore > pScore) { 
                finalStatus = 'lose'; finalColor = '#ff0000'; 
            } else { 
                finalStatus = 'tie'; finalColor = '#808080'; db.users[message.author.id] += bet; 
            }

            saveDB();
            await msg.edit({ embeds: [generateEmbed(finalStatus, finalColor)] });
        });
    }

    // ================= 7. Command: Coinflip (scf) =================
    if (command === 'scf') {
        if (checkCooldown(message.author.id, 'scf', message)) return;
        const authorData = getUserData(message.author.id);
        let bet = null;
        let side = 'heads';
        
        args.forEach(arg => {
            const a = arg.toLowerCase();
            if (a === 'all') bet = authorData.cash;
            else if (!isNaN(a)) bet = parseInt(a);
            else if (a === 'h') side = 'heads';
            else if (a === 't') side = 'tails';
        });
        
        if (bet === null) bet = 1;
        if (bet > 300000) bet = 300000;
        
        if (bet <= 0) return message.reply('❌ jumlah taruhan harus di atas 0.');
        if (authorData.cash < bet) return message.reply('❌ cash kamu tidak mencukupi.');

        authorData.cash -= bet;
        saveDB();
        
        const processMsg = await message.reply(`**${message.author.username}** spent **${EMOJI_MONEY} ${bet.toLocaleString()}** and chose **${side}**\nThe coin spins... ${EMOJI_COIN_SPIN}`);
        
        setTimeout(async () => {
            const outcomes = ['heads', 'tails'];
            const result = outcomes[Math.floor(Math.random() * outcomes.length)];
            
            if (result === side) {
                const winnings = bet * 2;
                authorData.cash += winnings;
                saveDB();
                await processMsg.edit(`**${message.author.username}** spent **${EMOJI_MONEY} ${bet.toLocaleString()}** and chose **${side}**\nThe coin spins... ${EMOJI_COIN_STOP} and you won **${EMOJI_MONEY} ${winnings.toLocaleString()}**!!`);
            } else {
                await processMsg.edit(`**${message.author.username}** spent **${EMOJI_MONEY} ${bet.toLocaleString()}** and chose **${side}**\nThe coin spins... ${EMOJI_COIN_STOP} and you lost it all... :c`);
            }
        }, 2500);
    }

    // ================= GAME HIGHLOW (shl) =================
    if (command === 'shl') {
        if (checkCooldown(message.author.id, 'shl', message)) return;
        const authorData = getUserData(message.author.id);
        let bet = null;

        args.forEach(arg => {
            const a = arg.toLowerCase();
            if (a === 'all') bet = authorData.cash;
            else if (!isNaN(a)) bet = parseInt(a);
        });
        
        if (bet === null) bet = 1000; 
        if (bet > 300000) bet = 300000;
        if (bet <= 0) return message.reply('❌ Masukkan jumlah taruhan yang valid!');
        if (authorData.cash < bet) return message.reply(`❌ Saldo cash kamu tidak mencukupi untuk bertaruh **${bet.toLocaleString()}** cash.`);

        authorData.cash -= bet;
        saveDB();
        
        let firstCard = drawCard();
        while (firstCard.value > 12) {
            firstCard = drawCard();
        }

        let cardHistory = [firstCard]; 
        let streak = 0;
        const cardbackEmoji = EMOJI_CARDBACK;
        
        // Konstanta garis pemisah yang rapi
        const hlDivider = '_____________'.repeat(40);

        const getNextProfit = (currentValue, type) => {
            let chance = type === 'higher' ? (13 - currentValue) / 12 : (currentValue - 1) / 12;
            if (chance <= 0) chance = 0.1;
            const multiplier = (1 / chance) * 1.15; 
            return Math.floor(bet * multiplier);
        };
        
        function generateGameMessage(statusType = 'playing', selectedChoice = null, revealedCard = null) {
            const currentCard = cardHistory[cardHistory.length - 1];
            let currentCashOut = streak === 0 ? 0 : Math.floor(bet * Math.pow(1.45, streak));
            let currentMultiplier = streak === 0 ? 0.00 : Math.pow(1.45, streak);

            // Logika display kartu: Menampilkan maksimum 3 kartu layaknya foto [Past] -> [Current] -> [Face Down]
            let displayCards = cardHistory.slice(-2).map(c => c.emoji);
            if (statusType === 'playing') {
                displayCards.push(cardbackEmoji);
            } else if (revealedCard) {
                displayCards.push(revealedCard.emoji);
            } else if (statusType === 'cashed_out') {
                // Generate 1 random card to reveal visually upon cashing out
                let randNext = drawCard();
                while (randNext.value > 12) randNext = drawCard();
                displayCards.push(randNext.emoji);
            }
            
            let cardDisplayPath = displayCards.join(' ‣ ');
            
            // Tampilan info header
            const infoHeader = `**Bet:** \`${bet.toLocaleString()}\`  **Streak:** \`${streak}\`  **Cash Out:** \`${currentCashOut.toLocaleString()}\` \`(${currentMultiplier.toFixed(2)}x)\`\n${hlDivider}`;
            const embed = new EmbedBuilder();
            
            if (statusType === 'playing') {
                embed.setColor('#5865F2')
                     .setDescription(`🃏 <@${message.author.id}> **started a HighLow game.**\n${infoHeader}\n\n# ${cardDisplayPath}\n\nIs the next card higher or lower?\n${hlDivider}\n### Current Card: ${currentCard.value}`);
            } else if (statusType === 'lost') {
                embed.setColor('#ED4245')
                     .setDescription(`👎 <@${message.author.id}> **guessed incorrectly!!**\n${infoHeader}\n\n# ${cardDisplayPath}\n\nYou guessed **${selectedChoice}**. You lost.\n${hlDivider}\n### Current Card: ${revealedCard.value}`);
            } else if (statusType === 'cashed_out') {
                embed.setColor('#57F287')
                     .setDescription(`💰 <@${message.author.id}> **Cashed Out!**\n${infoHeader}\n\n# ${cardDisplayPath}\n\nYou cashed out with **${currentCashOut.toLocaleString()}** cowoncy!\n${hlDivider}\n### Current Card: ${currentCard.value}`);
            }

            const nextHigherProfit = getNextProfit(currentCard.value, 'higher');
            const nextLowerProfit = getNextProfit(currentCard.value, 'lower');

            const isFinished = statusType !== 'playing';
            
            const rowButtons = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('hl_higher')
                    .setLabel(`Higher (+${nextHigherProfit.toLocaleString()})`)
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(isFinished),
                new ButtonBuilder()
                    .setCustomId('hl_lower')
                    .setLabel(`Lower (+${nextLowerProfit.toLocaleString()})`)
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(isFinished)
            );
            
            const rowCashout = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('hl_cashout')
                    .setLabel(streak === 0 ? 'Cash Out' : `Cash Out: ${currentCashOut.toLocaleString()}`)
                    .setStyle(ButtonStyle.Success)
                    .setDisabled(streak === 0 || isFinished)
            );
            
            return { embeds: [embed], components: [rowButtons, rowCashout] };
        }

        const msg = await message.reply(generateGameMessage('playing'));
        
        const collector = msg.createMessageComponentCollector({
            filter: i => i.user.id === message.author.id
        });
        
        collector.on('collect', async i => {
            if (i.customId === 'hl_cashout') {
                collector.stop('cashout');
                let finalWinnings = Math.floor(bet * Math.pow(1.45, streak));
                
                const finalUserData = getUserData(message.author.id);
                finalUserData.cash += finalWinnings;
                saveDB();

                return i.update(generateGameMessage('cashed_out'));
            }

            // Animasi Loading
            let displayCards = cardHistory.slice(-2).map(c => c.emoji);
            displayCards.push('<a:loadings:1520313495537586237>');
 
            let cardDisplayPath = displayCards.join(' ‣ ');
            
            let currentCashOut = streak === 0 ? 0 : Math.floor(bet * Math.pow(1.45, streak));
            let currentMultiplier = streak === 0 ? 0.00 : Math.pow(1.45, streak);
            const infoHeader = `**Bet:** \`${bet.toLocaleString()}\`  **Streak:** \`${streak}\`  **Cash Out:** \`${currentCashOut.toLocaleString()}\` \`(${currentMultiplier.toFixed(2)}x)\`\n${hlDivider}`;
            
            const animEmbed = new EmbedBuilder()
                .setColor('#2F3136')
                .setDescription(`<a:31830redloading:1520420716003196978> <@${message.author.id}> **started a HighLow game.**\n${infoHeader}\n\n# ${cardDisplayPath}`);
            
            await i.update({ embeds: [animEmbed], components: [] });

            setTimeout(async () => {
                let isHigher = i.customId === 'hl_higher';
                const currentCard = cardHistory[cardHistory.length - 1];
                
                // SISTEM PURE RNG / HOKI PEMAIN (Tidak ada lagi sistem judi paksaan 80/20%)
                let possibleCards = deckTemplate.filter(c => c.value <= 12 && c.value !== currentCard.value);
                let nextCard = possibleCards[Math.floor(Math.random() * possibleCards.length)];
                
                let isWon = isHigher ? (nextCard.value > currentCard.value) : (nextCard.value < currentCard.value);
                
                if (isWon) {
                    streak++;
                    cardHistory.push(nextCard);
                    await msg.edit(generateGameMessage('playing'));
                } else {
                    collector.stop('lost');
                    await msg.edit(generateGameMessage('lost', isHigher ? 'Higher' : 'Lower', nextCard));
                }
            }, 1000);
        });
    }

    // ================= PVP INVITE: MINES (smine inv) =================
    if (command === 'smine' && args[0]?.toLowerCase() === 'inv') {
        const targetUser = message.mentions.users.first();
        const betAmt = parseInt(args[2]);

        if (!targetUser || targetUser.bot || targetUser.id === message.author.id) {
            return message.reply('❌ Format salah! Gunakan: `smine inv @user <jumlah_taruhan>`');
        }
        if (isNaN(betAmt) || betAmt <= 0) return message.reply('❌ Masukkan jumlah taruhan yang valid!');
        
        const authorData = getUserData(message.author.id);
        const targetData = getUserData(targetUser.id);

        if (authorData.cash < betAmt) return message.reply('❌ cash kamu tidak cukup!');
        if (targetData.cash < betAmt) return message.reply(`❌ cash **${targetUser.username}** tidak cukup!`);
        
        const inviteEmbed = new EmbedBuilder()
            .setColor('#FFA500')
            .setAuthor({ name: `${message.author.tag} | DUEL MINE`, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
            .setDescription(`💣 <@${message.author.id}> mengajak <@${targetUser.id}> berduel **Mines**!\n**Taruhan:** ${betAmt.toLocaleString()} cash\n\nSiapa yang terkena bom kalah! Klik **Setuju** untuk memulai!`);
        
        const inviteRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('mine_pvp_acc').setLabel('Setuju').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('mine_pvp_dec').setLabel('Tolak').setStyle(ButtonStyle.Danger)
        );
        
        const inviteMsg = await message.reply({ content: `<@${targetUser.id}>`, embeds: [inviteEmbed], components: [inviteRow] });
        
        const filter = i => [message.author.id, targetUser.id].includes(i.user.id);
        const inviteCollector = inviteMsg.createMessageComponentCollector({ filter, time: 30000 });

        inviteCollector.on('collect', async i => {
            if (i.customId === 'mine_pvp_dec') {
                if (i.user.id !== targetUser.id) return i.reply({ content: 'Hanya yang diajak yang bisa menolak!', ephemeral: true });
                inviteCollector.stop();
                return i.update({ content: `❌ <@${targetUser.id}> menolak ajakan duel.`, embeds: [], components: [] });
            }

            if (i.customId === 'mine_pvp_acc') {
                if (i.user.id !== targetUser.id) return i.reply({ content: 'Hanya yang diajak yang bisa menerima!', ephemeral: true });
                inviteCollector.stop();

                authorData.cash -= betAmt;
                targetData.cash -= betAmt;
                saveDB();

                let turnPlayer = Math.random() < 0.5 ? message.author.id : targetUser.id;
                let bombs = [];
                while(bombs.length < 2) {
                     let r = Math.floor(Math.random() * 9);
                    if(!bombs.includes(r)) bombs.push(r);
                }
                
                let boardState = Array(9).fill("hidden");
                let gameOver = false;
                let safeClicks = 0;

                const buildGrid = () => {
                    const rows = [];
                    for (let r = 0; r < 3; r++) {
                        const row = new ActionRowBuilder();
                        for (let c = 0; c < 3; c++) {
                            let idx = r * 3 + c;
                            let btn = new ButtonBuilder().setCustomId(`pvpmine_${idx}`);
                            
                            if (gameOver) {
                                btn.setDisabled(true);
                                if (bombs.includes(idx)) btn.setEmoji('💣').setStyle(ButtonStyle.Danger);
                                else btn.setEmoji('💎').setStyle(ButtonStyle.Secondary);
                            } else {
                                if (boardState[idx] === "hidden") btn.setLabel('?').setStyle(ButtonStyle.Secondary);
                                else btn.setEmoji('💎').setStyle(ButtonStyle.Primary).setDisabled(true);
                            }
                            row.addComponents(btn);
                        }
                        rows.push(row);
                    }
                    return rows;
                };

                const gameEmbed = new EmbedBuilder()
                    .setColor('#5865F2')
                    .setTitle('MINE DUEL')
                    .setDescription(`Pot: **${betAmt * 2} cash**\nGiliran: <@${turnPlayer}> (Pilih kotak!)`);
                    
                await i.update({ content: 'DUEL DIMULAI!', embeds: [], components: [] });
                const gameMsg = await message.channel.send({ embeds: [gameEmbed], components: buildGrid() });
                const gameCollector = gameMsg.createMessageComponentCollector({ time: 60000 });

                gameCollector.on('collect', async action => {
                    if (action.user.id !== turnPlayer) return action.reply({ content: 'bukan giliran you!', ephemeral: true });
                    
                    let idx = parseInt(action.customId.split('_')[1]);
                    if (boardState[idx] !== "hidden") return action.deferUpdate();

                    if (bombs.includes(idx)) {
                        gameOver = true;
                        gameCollector.stop();
                        
                        let winner = turnPlayer === message.author.id ? targetUser.id : message.author.id;
                        getUserData(winner).cash += (betAmt * 2);
                        saveDB();

                        gameEmbed.setColor('#ED4245').setDescription(`💥 **BOM!** <@${turnPlayer}> terkena ledakan!\n <@${winner}> menang sebesar **${betAmt * 2}** cash!`);
                        return action.update({ embeds: [gameEmbed], components: buildGrid() });
                    } else {
                        boardState[idx] = "safe";
                        safeClicks++;
                        
                        if (safeClicks === 7) {
                            gameOver = true;
                            gameCollector.stop();
                            getUserData(message.author.id).cash += betAmt;
                            getUserData(targetUser.id).cash += betAmt;
                            saveDB();
                            gameEmbed.setColor('#57F287').setDescription(` <:12870loading:1520411622156406785>Semua berlian ditemukan! Permainan Seri, taruhan dikembalikan.`);
                            return action.update({ embeds: [gameEmbed], components: buildGrid() });
                        }

                        turnPlayer = turnPlayer === message.author.id ? targetUser.id : message.author.id;
                        gameEmbed.setDescription(`Pot: **${betAmt * 2} cash**\nGiliran: <@${turnPlayer}> (Pilih kotak!)`);
                        return action.update({ embeds: [gameEmbed], components: buildGrid() });
                    }
                });
            }
        });
        return;
    }

    // 8. GAME SLOTS: Slots (ss atau slot) - Maksimal 300.000
    if (command === 'ss' || command === 'slot') {
        const authorData = getUserData(message.author.id);
        let bet = null;
        
        args.forEach(arg => {
            const a = arg.toLowerCase();
            if (a === 'all') bet = authorData.cash;
            else if (!isNaN(a)) bet = parseInt(a);
        });
        
        if (bet === null) bet = 1;  
        if (bet > 300000) bet = 300000;
        if (bet <= 0) return message.reply('❌ Jumlah taruhan harus di atas 0.');
        if (authorData.cash < bet) return message.reply('❌ cash kamu tidak mencukupi.');

        authorData.cash -= bet;
        saveDB();
        
        const processMsg = await message.reply(`** \`___SLOTS___\`**\n\` \` ${EMOJI_SLOTS_SPIN} ${EMOJI_SLOTS_SPIN} ${EMOJI_SLOTS_SPIN} **${message.author.username}** bet ${EMOJI_MONEY} ${bet.toLocaleString()}\n  \`|         |\`    spinning...\n  \`|         |\``);
        
        setTimeout(async () => {
            let slot1, slot2, slot3;
            let winRatio = 0;
            let statusText = '';

            const RNG = Math.random(); 

            if (RNG < 0.10) { 
                winRatio = 3;
                const randEmoji = EMOJI_SLOTS[Math.floor(Math.random() * EMOJI_SLOTS.length)];
                slot1 = randEmoji; slot2 = randEmoji; slot3 = randEmoji;
                const winnings = Math.floor(bet * winRatio);
                statusText = `and won ${EMOJI_MONEY} ${winnings.toLocaleString()}!!`;
            } else if (RNG < 0.45) { 
                winRatio = 1.5;
                const pairEmoji = EMOJI_SLOTS[Math.floor(Math.random() * EMOJI_SLOTS.length)];
                const remaining = EMOJI_SLOTS.filter(e => e !== pairEmoji);
                const diffEmoji = remaining[Math.floor(Math.random() * remaining.length)];
                const positions = [pairEmoji, pairEmoji, diffEmoji].sort(() => Math.random() - 0.5);
                slot1 = positions[0]; slot2 = positions[1]; slot3 = positions[2];
                const winnings = Math.floor(bet * winRatio);
                statusText = `and won ${EMOJI_MONEY} ${winnings.toLocaleString()}!!`;
            } else { 
                winRatio = 0;
                const shuffled = [...EMOJI_SLOTS].sort(() => Math.random() - 0.5);
                slot1 = shuffled[0]; slot2 = shuffled[1]; slot3 = shuffled[2];
                statusText = `and won nothing... :c`;
            }

            if (winRatio > 0) {
                authorData.cash += Math.floor(bet * winRatio);
                saveDB();
            }

            await processMsg.edit(`** \`___SLOTS___\`**\n\` \` ${slot1} ${slot2} ${slot3} **${message.author.username}** bet ${EMOJI_MONEY} ${bet.toLocaleString()}\n  \`|         |\`    ${statusText}\n  \`|         |\``);
        }, 3000);
    }

    // 9. GAME MINE: Mines Game Interaktif (smine) - Maksimal 300.000
    if (command === 'smine') {
        if (checkCooldown(message.author.id, 'smine', message)) return;
        const authorData = getUserData(message.author.id);
        let bet = null;
        
        args.forEach(arg => {
            const a = arg.toLowerCase();
            if (a === 'all') bet = authorData.cash;
            else if (!isNaN(a)) bet = parseInt(a);
        });
        
        if (bet === null) bet = 100;  
        if (bet > 300000) bet = 300000;
        if (bet <= 0) return message.reply('❌ jumlah taruhan harus di atas 0.');
        if (authorData.cash < bet) return message.reply(`❌ cash kamu tidak mencukupi untuk bertaruh **${bet.toLocaleString()}** cash.`);

        authorData.cash -= bet;
        saveDB();
        
        const bombPositions = [];
        while (bombPositions.length < 3) {
            const randPos = Math.floor(Math.random() * 9);
            if (!bombPositions.includes(randPos)) bombPositions.push(randPos);
        }

        const HIGHER_MULTIPLIERS = [1.00, 1.50, 2.15, 3.20, 5.50, 9.80, 25.00];
        let gemCount = 0;
        let currentMultiplier = 0; 
        let nextMultiplier = HIGHER_MULTIPLIERS[1];
        let currentWinnings = 0;
        let nextWinnings = Math.floor(bet * nextMultiplier);
        
        const gridState = Array(9).fill("hidden");
        
        function generateComponents(isGameOver = false) {
            const rows = [];
            for (let r = 0; r < 3; r++) {
                const actionRow = new ActionRowBuilder();
                for (let c = 0; c < 3; c++) {
                    const index = r * 3 + c;
                    const btn = new ButtonBuilder().setCustomId(`mine_tile_${index}`);
                    
                    if (isGameOver) {
                        btn.setDisabled(true);
                        if (bombPositions.includes(index)) {
                            if (gridState[index] === "exploded") {
                                btn.setEmoji('💥').setStyle(ButtonStyle.Danger);
                            } else {
                                btn.setEmoji('💣').setStyle(ButtonStyle.Secondary);
                            }
                        } else {
                            btn.setEmoji('💎').setStyle(ButtonStyle.Primary);
                        }
                    } else {
                        if (gridState[index] === "hidden") {
                            btn.setLabel('?').setStyle(ButtonStyle.Secondary);
                        } else if (gridState[index] === "gem") {
                            btn.setEmoji('💎').setStyle(ButtonStyle.Primary).setDisabled(true);
                        }
                    }
                    actionRow.addComponents(btn);
                }
                rows.push(actionRow);
            }

            const actionRowControl = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('mine_action_cashout')
                    .setLabel(`Cash Out (${currentWinnings.toLocaleString()})`)
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('1519946191880720384')
                    .setDisabled(isGameOver || gemCount === 0)
            );
            rows.push(actionRowControl);
            return rows;
        }

        const embed = new EmbedBuilder()
            .setColor('#ffc0cb')
            .setDescription(`### <a:berlianslot:1520006116891951104> ${message.author.username} started a mines game.\n-# **Bet**: \`${bet.toLocaleString()}\`    **Mines**: \`3\`\n-# **Cash Out**: \`0\` \`(0.00x)\`\n-# **Next**: \`${nextWinnings.toLocaleString()}\` \`(${nextMultiplier.toFixed(2)}x)\``);
            
        const gameMessage = await message.reply({
            embeds: [embed],
            components: generateComponents(false)
        });
        
        const collector = gameMessage.createMessageComponentCollector({
            filter: i => i.user.id === message.author.id,
            time: 60000
        });
        
        collector.on('collect', async interaction => {
            const customId = interaction.customId;

            if (customId === 'mine_action_cashout') {
                collector.stop('cashout');
                
                const finalUserData = getUserData(message.author.id);
                finalUserData.cash += currentWinnings;
                saveDB();

                embed.setDescription(`### <a:berlianslot:1520006116891951104> ${message.author.username} cashed out!\n-# **Bet**: \`${bet.toLocaleString()}\`    **Mines**: \`3\`\n-# **Winnings**: \`${currentWinnings.toLocaleString()}\` \`(${currentMultiplier.toFixed(2)}x)\`\n-# ~~**Next**: \`${nextWinnings.toLocaleString()}\` \`(${nextMultiplier.toFixed(2)}x)\`~~`);
                
                return interaction.update({
                    embeds: [embed],
                    components: generateComponents(true)
                });
            }

            if (customId.startsWith('mine_tile_')) {
                const clickedIndex = parseInt(customId.split('_')[2]);
                if (gridState[clickedIndex] !== "hidden") {
                    return interaction.deferUpdate();
                }

                if (bombPositions.includes(clickedIndex)) {
                    gridState[clickedIndex] = "exploded";
                    collector.stop('exploded');

                    embed.setDescription(`### 💥 ${message.author.username} touched a mine!\n-# **Bet**: \`${bet.toLocaleString()}\`    **Mines**: \`3\`\n-# **Winnings**: \`0\` \`(0.00x)\`\n-# ~~**Next**: \`${nextWinnings.toLocaleString()}\` \`(${nextMultiplier.toFixed(2)}x)\`~~`);
                    return interaction.update({
                        embeds: [embed],
                        components: generateComponents(true)
                    });
                } 
                else {
                    gridState[clickedIndex] = "gem";
                    gemCount++;

                    currentMultiplier = HIGHER_MULTIPLIERS[gemCount];
                    nextMultiplier = HIGHER_MULTIPLIERS[gemCount + 1] || currentMultiplier;

                    currentWinnings = Math.floor(bet * currentMultiplier);
                    nextWinnings = Math.floor(bet * nextMultiplier);

                    if (gemCount === 6) {
                        collector.stop('cashout');
                        const finalUserData = getUserData(message.author.id);
                        finalUserData.cash += currentWinnings;
                        saveDB();

                        embed.setDescription(`### <a:berlianslot:1520006116891951104> ${message.author.username} cleared the board!\n-# **Bet**: \`${bet.toLocaleString()}\`    **Mines**: \`3\`\n-# **Winnings**: \`${currentWinnings.toLocaleString()}\` \`(${currentMultiplier.toFixed(2)}x)\`\n-# ~~**Next**: \`Maxed Out!\`~~`);
                        return interaction.update({
                            embeds: [embed],
                            components: generateComponents(true)
                        });
                    }

                    embed.setDescription(`### <a:berlianslot:1520006116891951104> ${message.author.username} is playing...\n-# **Bet**: \`${bet.toLocaleString()}\`    **Mines**: \`3\`\n-# **Cash Out**: \`${currentWinnings.toLocaleString()}\` \`(${currentMultiplier.toFixed(2)}x)\`\n-# **Next**: \`${nextWinnings.toLocaleString()}\` \`(${nextMultiplier.toFixed(2)}x)\``);
                    return interaction.update({
                        embeds: [embed],
                        components: generateComponents(false)
                    });
                }
            }
        });
        
        collector.on('end', (collected, reason) => {
            if (reason === 'time') {
                gameMessage.edit({
                    components: generateComponents(true)
                }).catch(() => {});
            }
        });
    }

    // === UPDATE COMMAND SDAILY ===
    if (command === 'sdaily') {
        const userData = getUserData(message.author.id);
        const cooldown = 24 * 60 * 60 * 1000;
        const now = Date.now();
        
        if (now - userData.lastDaily < cooldown) {
            const timeLeft = cooldown - (now - userData.lastDaily);
            const hours = Math.floor(timeLeft / (1000 * 60 * 60));
            const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
            return message.reply(`**⏱️ |** Your next daily is in: **${hours}h ${minutes}m**`);
        }

        const cashReward = Math.floor(Math.random() * (2500 - 1000 + 1)) + 1000;
        userData.cash += cashReward;
        userData.lastDaily = now;
        saveDB();

        return message.reply(`<:moneyslot:1519946191880720384> **| ${message.author.username}**, here is ur daily <:moneyslot:1519946191880720384> **${cashReward.toLocaleString()}**!\n**⏱️ |** Your next daily is in: **24h**`);
    }

});

// Ganti "TOKEN_BOT_ANDA_DI_SINI" dengan token bot Anda dari Developer Portal
client.login(process.env.DISCORD_TOKEN);
