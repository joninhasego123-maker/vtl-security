const {
    Client,
    GatewayIntentBits,
    Partials,
    MessageFlags,
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    MediaGalleryBuilder,
    MediaGalleryItemBuilder,
    AttachmentBuilder,
    SlashCommandBuilder,
    REST,
    Routes,
    PermissionFlagsBits,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require('discord.js');

const {
    createCanvas,
    loadImage
} = require('@napi-rs/canvas');

require('./keep_alive');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ],
    partials: [
        Partials.Message,
        Partials.Channel,
        Partials.GuildMember,
        Partials.User
    ]
});

const TOKEN = process.env.TOKEN;

// =========================
// CONFIGURAÇÕES
// =========================

const LOG_CHANNEL_ID = '1556626740569444422';

const WARN_LOG_CHANNEL_ID = '1554500648450392155';

const ALLOWED_INVITE_CATEGORIES = [
    '1554482905147904070',
    '1552649476370604214'
];

// Cargos de warn
const WARN_1_ROLE_ID = '1556667619291955230';
const WARN_2_ROLE_ID = '1556667697616519230';

// Quem pode aplicar warn
const WARN_ALLOWED_ROLES = [
    '1552650098637541448',
    '1554508476510900226'
];

// =========================
// CONTROLE DE MENSAGENS
// =========================

const securityDeletedMessages = new Set();

// =========================
// SLASH COMMANDS
// =========================

const commands = [
    new SlashCommandBuilder()
        .setName('warn')
        .setDescription('Aplica uma advertência a um membro.')
        .addUserOption(option =>
            option
                .setName('membro')
                .setDescription('Membro que receberá a advertência.')
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName('motivo')
                .setDescription('Motivo da advertência.')
                .setRequired(true)
                .setMaxLength(1000)
        )
        .toJSON()
];

// =========================
// REGISTRAR COMANDO
// =========================

async function registerCommands() {
    try {
        const rest = new REST({ version: '10' })
            .setToken(TOKEN);

        console.log('🔄 Registrando comandos...');

        await rest.put(
            Routes.applicationCommands(client.user.id),
            {
                body: commands
            }
        );

        console.log('✅ Comandos registrados com sucesso.');
    } catch (error) {
        console.error(
            '❌ Erro ao registrar comandos:',
            error
        );
    }
}

// =========================
// READY
// =========================

client.once('ready', async () => {
    console.log(
        `✅ VTL Security Bot online como ${client.user.tag}`
    );

    await registerCommands();
});

// =========================
// DETECTAR CONVITE DISCORD
// =========================

function containsDiscordInvite(content) {
    if (!content) return false;

    const inviteRegex =
        /(?:https?:\/\/)?(?:www\.)?(?:discord\.gg|discord\.com\/invite|discordapp\.com\/invite)\/[a-zA-Z0-9-]+/i;

    return inviteRegex.test(content);
}

// =========================
// PREVIEW DA MENSAGEM
// =========================

async function createMessagePreview(message) {
    const width = 1000;
    const height = 190;

    const canvas = createCanvas(
        width,
        height
    );

    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#1e1f22';
    ctx.fillRect(
        0,
        0,
        width,
        height
    );

    const avatarX = 35;
    const avatarY = 35;
    const avatarSize = 100;

    try {
        if (message.author) {
            const avatarURL =
                message.author.displayAvatarURL({
                    extension: 'png',
                    size: 256
                });

            const avatar =
                await loadImage(avatarURL);

            ctx.save();

            ctx.beginPath();

            ctx.arc(
                avatarX + avatarSize / 2,
                avatarY + avatarSize / 2,
                avatarSize / 2,
                0,
                Math.PI * 2
            );

            ctx.clip();

            ctx.drawImage(
                avatar,
                avatarX,
                avatarY,
                avatarSize,
                avatarSize
            );

            ctx.restore();
        }
    } catch (error) {
        ctx.fillStyle = '#5865f2';

        ctx.beginPath();

        ctx.arc(
            avatarX + avatarSize / 2,
            avatarY + avatarSize / 2,
            avatarSize / 2,
            0,
            Math.PI * 2
        );

        ctx.fill();
    }

    const username =
        message.author?.displayName ||
        message.author?.username ||
        'Usuário';

    ctx.font =
        'bold 31px Arial';

    ctx.fillStyle =
        '#f2f3f5';

    ctx.fillText(
        username,
        165,
        70
    );

    ctx.font =
        '20px Arial';

    ctx.fillStyle =
        '#949ba4';

    const dateText =
        message.createdAt
            ? `Hoje às ${message.createdAt.toLocaleTimeString(
                'pt-BR',
                {
                    hour: '2-digit',
                    minute: '2-digit'
                }
            )}`
            : 'Mensagem';

    ctx.fillText(
        dateText,
        165,
        101
    );

    let content =
        message.content || '';

    if (
        !content &&
        message.attachments?.size
    ) {
        content = '📎 Anexo';
    }

    if (!content) {
        content =
            'Mensagem sem conteúdo';
    }

    content =
        content.replace(
            /\n/g,
            ' '
        );

    if (content.length > 85) {
        content =
            content.slice(0, 85) +
            '...';
    }

    ctx.font =
        '32px Arial';

    ctx.fillStyle =
        '#dbdee1';

    ctx.fillText(
        content,
        165,
        145
    );

    return canvas.encode('png');
}

// =========================
// BLOQUEIO DE CONVITES
// =========================

client.on(
    'messageCreate',
    async message => {
        try {
            if (!message.guild) return;

            if (message.author.bot) return;

            if (
                !containsDiscordInvite(
                    message.content
                )
            ) {
                return;
            }

            const categoryId =
                message.channel.parentId;

            if (
                ALLOWED_INVITE_CATEGORIES.includes(
                    categoryId
                )
            ) {
                return;
            }

            securityDeletedMessages.add(
                message.id
            );

            setTimeout(() => {
                securityDeletedMessages.delete(
                    message.id
                );
            }, 10000);

            try {
                await message.delete();
            } catch (error) {
                console.log(
                    '❌ Não foi possível apagar a mensagem:',
                    error.message
                );

                securityDeletedMessages.delete(
                    message.id
                );

                return;
            }

            const container =
                new ContainerBuilder()
                    .addTextDisplayComponents(
                        new TextDisplayBuilder()
                            .setContent(
                                `🔔 | ${message.author} não é possivel mandar links de convites nesse canal!`
                            )
                    )
                    .addSeparatorComponents(
                        new SeparatorBuilder()
                    )
                    .addTextDisplayComponents(
                        new TextDisplayBuilder()
                            .setContent(
                                '-# VTL Security Bot'
                            )
                    );

            try {
                const warning =
                    await message.channel.send({
                        components: [
                            container
                        ],
                        flags:
                            MessageFlags.IsComponentsV2
                    });

                setTimeout(
                    async () => {
                        try {
                            await warning.delete();
                        } catch (error) {}
                    },
                    3000
                );

            } catch (error) {
                console.log(
                    '❌ Erro ao enviar aviso:',
                    error.message
                );
            }

        } catch (error) {
            console.error(
                '❌ Erro no bloqueio de convites:',
                error
            );
        }
    }
);

// =========================
// LOG DE MENSAGEM DELETADA
// =========================

client.on(
    'messageDelete',
    async message => {
        try {
            if (!message.guild) return;

            if (
                securityDeletedMessages.has(
                    message.id
                )
            ) {
                securityDeletedMessages.delete(
                    message.id
                );

                return;
            }

            if (message.author?.bot) return;

            const logChannel =
                message.guild.channels.cache.get(
                    LOG_CHANNEL_ID
                );

            if (!logChannel) {
                console.log(
                    '❌ Canal de logs não encontrado.'
                );

                return;
            }

            const author =
                message.author;

            const authorMention =
                author
                    ? `<@${author.id}>`
                    : 'Usuário desconhecido';

            const authorId =
                author
                    ? author.id
                    : 'desconhecido';

            let content =
                message.content ||
                '*Mensagem sem conteúdo de texto*';

            if (content.length > 3000) {
                content =
                    content.slice(
                        0,
                        3000
                    ) + '...';
            }

            content =
                content.replace(
                    /```/g,
                    '\\`\\`\\`'
                );

            const imageAttachments = [];

            if (
                message.attachments?.size
            ) {
                message.attachments.forEach(
                    attachment => {
                        const isImage =
                            attachment.contentType?.startsWith(
                                'image/'
                            ) ||
                            /\.(png|jpg|jpeg|gif|webp)$/i.test(
                                attachment.name ||
                                ''
                            );

                        if (isImage) {
                            imageAttachments.push(
                                attachment.url
                            );
                        }
                    }
                );
            }

            let previewBuffer = null;

            try {
                previewBuffer =
                    await createMessagePreview(
                        message
                    );
            } catch (error) {
                console.log(
                    '⚠️ Erro ao criar preview:',
                    error.message
                );
            }

            const container =
                new ContainerBuilder();

            if (previewBuffer) {
                const mediaGallery =
                    new MediaGalleryBuilder()
                        .addItems(
                            new MediaGalleryItemBuilder()
                                .setURL(
                                    'attachment://mensagem-deletada.png'
                                )
                        );

                container.addMediaGalleryComponents(
                    mediaGallery
                );
            }

            container.addSeparatorComponents(
                new SeparatorBuilder()
            );

            let logText =
                `## 🗑 Mensagem Deletada\n` +
                `-# Canal\n` +
                `<#${message.channelId}>\n` +
                `-# User\n` +
                `${authorMention} (\`${authorId}\`)\n` +
                `-# Mensagem\n` +
                `\`\`\`\n${content}\n\`\`\``;

            if (
                imageAttachments.length > 0
            ) {
                logText +=
                    `\n-# Imagem`;

                for (
                    const url of imageAttachments
                ) {
                    logText +=
                        `\n${url}`;
                }
            }

            container.addTextDisplayComponents(
                new TextDisplayBuilder()
                    .setContent(logText)
            );

            container.addSeparatorComponents(
                new SeparatorBuilder()
            );

            container.addTextDisplayComponents(
                new TextDisplayBuilder()
                    .setContent(
                        '-# VTL Security Bot'
                    )
            );

            if (previewBuffer) {
                const previewAttachment =
                    new AttachmentBuilder(
                        previewBuffer,
                        {
                            name:
                                'mensagem-deletada.png'
                        }
                    );

                await logChannel.send({
                    files: [
                        previewAttachment
                    ],
                    components: [
                        container
                    ],
                    flags:
                        MessageFlags.IsComponentsV2
                });

            } else {
                await logChannel.send({
                    components: [
                        container
                    ],
                    flags:
                        MessageFlags.IsComponentsV2
                });
            }

        } catch (error) {
            console.error(
                '❌ Erro no messageDelete:',
                error
            );
        }
    }
);

// =========================
// LOG DE MENSAGEM EDITADA
// =========================

client.on(
    'messageUpdate',
    async (
        oldMessage,
        newMessage
    ) => {
        try {
            if (!newMessage.guild)
                return;

            if (
                newMessage.author?.bot
            ) {
                return;
            }

            if (
                oldMessage.content ===
                newMessage.content
            ) {
                return;
            }

            const logChannel =
                newMessage.guild.channels.cache.get(
                    LOG_CHANNEL_ID
                );

            if (!logChannel) {
                console.log(
                    '❌ Canal de logs não encontrado.'
                );

                return;
            }

            const author =
                newMessage.author;

            const authorMention =
                author
                    ? `<@${author.id}>`
                    : 'Usuário desconhecido';

            const authorId =
                author
                    ? author.id
                    : 'desconhecido';

            let oldContent =
                oldMessage.content ||
                '*Sem conteúdo*';

            if (oldContent.length > 1500) {
                oldContent =
                    oldContent.slice(
                        0,
                        1500
                    ) + '...';
            }

            oldContent =
                oldContent.replace(
                    /```/g,
                    '\\`\\`\\`'
                );

            let newContent =
                newMessage.content ||
                '*Sem conteúdo*';

            if (newContent.length > 1500) {
                newContent =
                    newContent.slice(
                        0,
                        1500
                    ) + '...';
            }

            newContent =
                newContent.replace(
                    /```/g,
                    '\\`\\`\\`'
                );

            const container =
                new ContainerBuilder();

            container.addTextDisplayComponents(
                new TextDisplayBuilder()
                    .setContent(
                        `## 📝 Mensagem editada\n` +
                        `-# Canal\n` +
                        `<#${newMessage.channelId}>\n` +
                        `-# User\n` +
                        `${authorMention} (\`${authorId}\`)\n` +
                        `-# Mensagem Antiga\n` +
                        `\`\`\`\n${oldContent}\n\`\`\`\n` +
                        `-# Mensagem nova\n` +
                        `\`\`\`\n${newContent}\n\`\`\``
                    )
            );

            container.addSeparatorComponents(
                new SeparatorBuilder()
            );

            container.addTextDisplayComponents(
                new TextDisplayBuilder()
                    .setContent(
                        '-# VTL Security Bot'
                    )
            );

            await logChannel.send({
                components: [
                    container
                ],
                flags:
                    MessageFlags.IsComponentsV2
            });

        } catch (error) {
            console.error(
                '❌ Erro no messageUpdate:',
                error
            );
        }
    }
);

// =========================
// VERIFICAR PERMISSÃO DO WARN
// =========================

function canUseWarn(member) {
    if (!member) return false;

    // Administrador pode usar
    if (
        member.permissions.has(
            PermissionFlagsBits.Administrator
        )
    ) {
        return true;
    }

    // Cargos autorizados
    return WARN_ALLOWED_ROLES.some(
        roleId =>
            member.roles.cache.has(
                roleId
            )
    );
}

// =========================
// APLICAR WARN
// =========================

client.on(
    'interactionCreate',
    async interaction => {
        try {
            if (
                !interaction.isChatInputCommand()
            ) {
                return;
            }

            if (
                interaction.commandName !==
                'warn'
            ) {
                return;
            }

            // =========================
            // VERIFICAR PERMISSÃO
            // =========================

            if (
                !canUseWarn(
                    interaction.member
                )
            ) {
                await interaction.reply({
                    content:
                        '❌ Você não possui permissão para usar este comando.',
                    flags:
                        MessageFlags.Ephemeral
                });

                return;
            }

            const targetUser =
                interaction.options.getUser(
                    'membro'
                );

            const reason =
                interaction.options.getString(
                    'motivo'
                );

            const member =
                await interaction.guild.members
                    .fetch(
                        targetUser.id
                    )
                    .catch(() => null);

            if (!member) {
                await interaction.reply({
                    content:
                        '❌ Esse membro não está no servidor.',
                    flags:
                        MessageFlags.Ephemeral
                });

                return;
            }

            // Não permitir warn no próprio bot
            if (targetUser.bot) {
                await interaction.reply({
                    content:
                        '❌ Você não pode aplicar warn em um bot.',
                    flags:
                        MessageFlags.Ephemeral
                });

                return;
            }

            // Não permitir warn em si mesmo
            if (
                targetUser.id ===
                interaction.user.id
            ) {
                await interaction.reply({
                    content:
                        '❌ Você não pode aplicar warn em si mesmo.',
                    flags:
                        MessageFlags.Ephemeral
                });

                return;
            }

            // =========================
            // VERIFICAR HIERARQUIA
            // =========================

            if (
                member.id ===
                interaction.guild.ownerId
            ) {
                await interaction.reply({
                    content:
                        '❌ Não é possível aplicar warn no dono do servidor.',
                    flags:
                        MessageFlags.Ephemeral
                });

                return;
            }

            if (
                member.roles.highest.position >=
                interaction.member.roles.highest.position &&
                interaction.guild.ownerId !==
                interaction.user.id
            ) {
                await interaction.reply({
                    content:
                        '❌ Você não pode aplicar warn em um membro com cargo igual ou superior ao seu.',
                    flags:
                        MessageFlags.Ephemeral
                });

                return;
            }

            // =========================
            // IDENTIFICAR WARN ATUAL
            // =========================

            const hasWarn1 =
                member.roles.cache.has(
                    WARN_1_ROLE_ID
                );

            const hasWarn2 =
                member.roles.cache.has(
                    WARN_2_ROLE_ID
                );

            let warnNumber = 0;

            if (hasWarn2) {
                warnNumber = 3;
            } else if (hasWarn1) {
                warnNumber = 2;
            } else {
                warnNumber = 1;
            }

            const staffMention =
                `<@${interaction.user.id}>`;

            const memberMention =
                `<@${member.id}>`;

            // =========================
            // WARN 1
            // =========================

            if (warnNumber === 1) {
                try {
                    await member.roles.add(
                        WARN_1_ROLE_ID
                    );
                } catch (error) {
                    await interaction.reply({
                        content:
                            '❌ Não consegui adicionar o cargo do primeiro warn. Verifique a hierarquia dos cargos do bot.',
                        flags:
                            MessageFlags.Ephemeral
                    });

                    return;
                }

                // Mute de 1 hora
                try {
                    await member.timeout(
                        60 * 60 * 1000,
                        `Warn 1/3: ${reason}`
                    );
                } catch (error) {
                    console.log(
                        '⚠️ Não foi possível aplicar o mute de 1 hora:',
                        error.message
                    );
                }

                const logContainer =
                    new ContainerBuilder();

                logContainer.addTextDisplayComponents(
                    new TextDisplayBuilder()
                        .setContent(
                            `## ⚠️ Advertência Aplicada\n\n` +
                            `-# Staff\n` +
                            `${staffMention} (\`${interaction.user.id}\`)\n` +
                            `-# Membro\n` +
                            `${memberMention} (\`${member.id}\`)\n` +
                            `-# Motivo\n` +
                            `${reason}\n` +
                            `-# Info\n` +
                            `1/3 • Mute de 1 hora`
                        )
                );

                logContainer.addSeparatorComponents(
                    new SeparatorBuilder()
                );

                logContainer.addTextDisplayComponents(
                    new TextDisplayBuilder()
                        .setContent(
                            '-# VTL Security Bot'
                        )
                );

                await sendWarnLog(
                    interaction.guild,
                    logContainer
                );

                // DM
                await sendWarnDM(
                    member,
                    `⚠️ Você recebeu uma Advertência na VTL.\n\n` +
                    `-# Staff\n` +
                    `${staffMention} (\`${interaction.user.id}\`)\n` +
                    `-# Motivo\n` +
                    `${reason}\n` +
                    `-# Info\n` +
                    `1/3 • Mute de 1 hora\n\n` +
                    `> Se você receber 3 advertências será **BANIDO** do servidor.`
                );

                await interaction.reply({
                    content:
                        `✅ Advertência **1/3** aplicada em ${memberMention}.`,
                    flags:
                        MessageFlags.Ephemeral
                });

                return;
            }

            // =========================
            // WARN 2
            // =========================

            if (warnNumber === 2) {
                try {
                    await member.roles.add(
                        WARN_2_ROLE_ID
                    );
                } catch (error) {
                    await interaction.reply({
                        content:
                            '❌ Não consegui adicionar o cargo do segundo warn. Verifique a hierarquia dos cargos do bot.',
                        flags:
                            MessageFlags.Ephemeral
                    });

                    return;
                }

                // Mute de 1 hora
                try {
                    await member.timeout(
                        60 * 60 * 1000,
                        `Warn 2/3: ${reason}`
                    );
                } catch (error) {
                    console.log(
                        '⚠️ Não foi possível aplicar o mute de 1 hora:',
                        error.message
                    );
                }

                const logContainer =
                    new ContainerBuilder();

                logContainer.addTextDisplayComponents(
                    new TextDisplayBuilder()
                        .setContent(
                            `## ⚠️ Advertência Aplicada\n\n` +
                            `-# Staff\n` +
                            `${staffMention} (\`${interaction.user.id}\`)\n` +
                            `-# Membro\n` +
                            `${memberMention} (\`${member.id}\`)\n` +
                            `-# Motivo\n` +
                            `${reason}\n` +
                            `-# Info\n` +
                            `2/3 • Mute de 1 hora`
                        )
                );

                logContainer.addSeparatorComponents(
                    new SeparatorBuilder()
                );

                logContainer.addTextDisplayComponents(
                    new TextDisplayBuilder()
                        .setContent(
                            '-# VTL Security Bot'
                        )
                );

                await sendWarnLog(
                    interaction.guild,
                    logContainer
                );

                // DM
                await sendWarnDM(
                    member,
                    `⚠️ Você recebeu uma Advertência na VTL.\n\n` +
                    `-# Staff\n` +
                    `${staffMention} (\`${interaction.user.id}\`)\n` +
                    `-# Motivo\n` +
                    `${reason}\n` +
                    `-# Info\n` +
                    `2/3 • Mute de 1 hora\n\n` +
                    `> Se você receber 3 advertências será **BANIDO** do servidor.`
                );

                await interaction.reply({
                    content:
                        `✅ Advertência **2/3** aplicada em ${memberMention}.`,
                    flags:
                        MessageFlags.Ephemeral
                });

                return;
            }

            // =========================
            // WARN 3 = BAN
            // =========================

            if (warnNumber === 3) {
                const logContainer =
                    new ContainerBuilder();

                logContainer.addTextDisplayComponents(
                    new TextDisplayBuilder()
                        .setContent(
                            `## 🔨 Banimento aplicado\n\n` +
                            `-# Staff\n` +
                            `${staffMention} (\`${interaction.user.id}\`)\n` +
                            `-# Membro\n` +
                            `${memberMention} (\`${member.id}\`)\n` +
                            `-# Motivo\n` +
                            `${reason}\n` +
                            `-# Info\n` +
                            `3/3 • Banido do servidor.`
                        )
                );

                logContainer.addSeparatorComponents(
                    new SeparatorBuilder()
                );

                logContainer.addTextDisplayComponents(
                    new TextDisplayBuilder()
                        .setContent(
                            '-# VTL Security Bot'
                        )
                );

                // DM ANTES DO BAN
                const banDMContainer =
                    new ContainerBuilder();

                banDMContainer.addTextDisplayComponents(
                    new TextDisplayBuilder()
                        .setContent(
                            `## 🔨 Você foi **BANIDO** da VTL\n\n` +
                            `-# Staff\n` +
                            `${staffMention} (\`${interaction.user.id}\`)\n` +
                            `-# Motivo\n` +
                            `${reason}\n` +
                            `-# Info\n` +
                            `3/3 • Banido do servidor.\n\n` +
                            `> Para ser desbanido entre no STJD da VTL clicando no botão abaixo e abra um ticket.`
                        )
                );

                banDMContainer.addSeparatorComponents(
                    new SeparatorBuilder()
                );

                const stjdButton =
                    new ButtonBuilder()
                        .setLabel('STJD')
                        .setEmoji('🔨')
                        .setStyle(
                            ButtonStyle.Link
                        )
                        .setURL(
                            'https://discord.gg/zXdZ9SwTG'
                        );

                const buttonRow =
                    new ActionRowBuilder()
                        .addComponents(
                            stjdButton
                        );

                // Enviar DM
                try {
                    await member.send({
                        components: [
                            banDMContainer
                        ],
                        flags:
                            MessageFlags.IsComponentsV2,
                        files: []
                    });

                    // Botão de link precisa ser enviado
                    // como componente junto da mensagem.
                    // Discord permite ActionRow com botão
                    // junto do Components V2.
                    await member.send({
                        components: [
                            buttonRow
                        ],
                        flags:
                            MessageFlags.IsComponentsV2
                    });

                } catch (error) {
                    console.log(
                        `⚠️ Não foi possível enviar DM para ${member.user.tag}.`
                    );
                }

                // Registrar log
                await sendWarnLog(
                    interaction.guild,
                    logContainer
                );

                // Banir
                try {
                    await member.ban({
                        deleteMessageSeconds: 0,
                        reason:
                            `3/3 Warns: ${reason}`
                    });
                } catch (error) {
                    console.error(
                        '❌ Erro ao banir membro:',
                        error
                    );

                    await interaction.reply({
                        content:
                            '❌ Não consegui banir o membro. Verifique a hierarquia do bot.',
                        flags:
                            MessageFlags.Ephemeral
                    });

                    return;
                }

                await interaction.reply({
                    content:
                        `🔨 ${memberMention} recebeu o **3º warn** e foi banido da VTL.`,
                    flags:
                        MessageFlags.Ephemeral
                });

                return;
            }

        } catch (error) {
            console.error(
                '❌ Erro no comando /warn:',
                error
            );

            if (
                interaction.isRepliable() &&
                !interaction.replied &&
                !interaction.deferred
            ) {
                await interaction.reply({
                    content:
                        '❌ Ocorreu um erro ao executar o comando.',
                    flags:
                        MessageFlags.Ephemeral
                }).catch(() => {});
            }
        }
    }
);

// =========================
// ENVIAR LOG DO WARN
// =========================

async function sendWarnLog(
    guild,
    container
) {
    try {
        const channel =
            guild.channels.cache.get(
                WARN_LOG_CHANNEL_ID
            );

        if (!channel) {
            console.log(
                '❌ Canal de logs de warn não encontrado.'
            );

            return;
        }

        await channel.send({
            components: [
                container
            ],
            flags:
                MessageFlags.IsComponentsV2
        });

    } catch (error) {
        console.error(
            '❌ Erro ao enviar log do warn:',
            error
        );
    }
}

// =========================
// ENVIAR DM DE WARN
// =========================

async function sendWarnDM(
    member,
    content
) {
    try {
        const container =
            new ContainerBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder()
                        .setContent(content)
                );

        await member.send({
            components: [
                container
            ],
            flags:
                MessageFlags.IsComponentsV2
        });

    } catch (error) {
        console.log(
            `⚠️ Não foi possível enviar DM para ${member.user.tag}.`
        );
    }
}

// =========================
// LOGIN
// =========================

client.login(TOKEN);